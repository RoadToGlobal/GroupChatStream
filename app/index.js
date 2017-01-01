import Express      from 'express';
import http         from 'http';
import socketIo     from 'socket.io';
import sanitizeHtml from 'sanitize-html';

const app    = new Express();
const server = http.Server(app);
const io     = socketIo(server);

const socketMetadata = new Map();

io.on('connection', (socket) => {
  socket.on('action', (action) => {
    switch (action.type) {
      case 'server/join':
        if (
          typeof(action.username) === 'string' &&
          typeof(action.room) === 'string'
        ) {
          const username = sanitizeHtml(action.username);
          const room = sanitizeHtml(action.room);

          socketMetadata.set(socket.id, { username, room });
          socket.join(room);

          const otherUsers = [];
          socketMetadata.forEach((metadata) => {
            if (metadata.room === sanitizeHtml(action.room)) {
              otherUsers.push(metadata.username);
            }
          });

          socket.to(socket.id).emit('action', {
            type: 'joinSuccess',
            message: `joined ${room}`,
            otherUsers
          });

          io.to(socketMetadata.get(socket.id).room).emit('action', {
            type: 'userStatus',
            otherUsers,
          });
        } else {
          socket.to(socket.id).emit('action', {
            type: 'error',
            message: 'metadata error',
          });
        }
        break;
      case 'server/leave':
        socket.leave(action.room);
        if ( socketMetadata.has(socket.id) && socketMetadata.get(socket.id).room === action.room ) {
          socketMetadata.delete(socket.id);
        }

        const otherUsers = [];
        socketMetadata.forEach((metadata) => {
          if (metadata.room === action.room) {
            otherUsers.push(metadata.username);
          }
        });

        io.to(action.room).emit('action', {
          type: 'userStatus',
          otherUsers,
        });

        break;
      case 'server/message':
        if (socketMetadata.has(socket.id) && typeof(action.message) === 'string') {
          io.to(socketMetadata.get(socket.id).room).emit('action', {
            type: 'message',
            message: sanitizeHtml(action.message),
            username: socketMetadata.get(socket.id).username,
          });
        } else if (!socketMetadata.has(socket.id)) {
          socket.to(socket.id).emit('action', {
            type: 'error',
            message: 'need to join a room first',
          });
        } else if (!action.message || !action.username) {
          socket.to(socket.id).emit('action', {
            type: 'error',
            message: 'supply username, and a message',
          });
        }
        break;
      default:
    }
  });

  socket.on('disconnect', () => {
    if (socketMetadata.has(socket.id)) {
      const room = socketMetadata.get(socket.id).room;
      socketMetadata.delete(socket.id);

      const otherUsers = [];
      socketMetadata.forEach((metadata) => {
        if (metadata.room === room) {
          otherUsers.push(metadata.username);
        }
      });

      io.to(room).emit('action', {
        type: 'userStatus',
        otherUsers,
      });
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});
