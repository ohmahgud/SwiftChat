const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const rooms = new Map();

app.use(express.static('public'));

app.get('/new', (req, res) => {
  const roomId = uuidv4().slice(0, 6);
  rooms.set(roomId, []);
  res.redirect(`/register.html?roomId=${roomId}`);
});

io.on('connection', (socket) => {
  socket.on('join', ({ roomId, username }) => {
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room does not exist.' });
      return;
    }

    socket.join(roomId);
    socket.to(roomId).emit('message', { username: 'System', text: `${username} has joined the chat.` });

    // Send stored messages to the user
    const roomMessages = rooms.get(roomId);
    roomMessages.forEach((message) => {
      socket.emit('message', message);
    });

    socket.on('sendMessage', (message) => {
      const newMessage = { username, text: message };
      io.to(roomId).emit('message', newMessage);

      // Save the message
      roomMessages.push(newMessage);
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('message', { username: 'System', text: `${username} has left the chat.` });
    });
  });

  socket.on('checkRoom', ({ roomId }) => {
    const exists = rooms.has(roomId);
    socket.emit('roomChecked', { exists, roomId });
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
