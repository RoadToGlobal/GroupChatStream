import Express    from 'express';
import http       from 'http';
import socketIo   from 'socket.io';

const app    = new Express();
const server = http.Server(app);
const io     = socketIo(server);

const socketInRoom = new Map();

io.on('connection', (socket) => {
  socket.on('action', (action) => {
    switch (action.type) {
      case 'server/join':
        socketInRoom.set(socket.id, action.data);
        socket.join(action.data);
        break;
      case 'server/leave':
        socketInRoom.delete(socket.id);
        socket.leave(action.data);
        break;
      case 'server/message':
        if (socketInRoom.has(socket.id)) {

          // TODO: sanitize data for gods sake!
          io.to(socketInRoom.get(socket.id)).emit('action', {type: 'message', data: action.data});
        } else {
          socket.to(socket.id).emit('message', {message: 'need to join a room first'});
        }
        break;
      default:
    }
  });
});

server.listen(8000, () => {
  console.log('listening on port 8000');
});
