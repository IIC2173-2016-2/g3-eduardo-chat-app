const socketio = require('socket.io');
exports.socketServer = (app, server) => {
  const io = socketio(server);
  io.on('connection', function(socket){

    socket.on('join', function(channel, ack) {
      oldChannel = socket.channel;
      if (oldChannel) {
        socket.leave(oldChannel);
      }
      socket.channel = channel;
      socket.join(channel);
      ack();
    });

    socket.on('chat', function(msg, username) {
      let channel = socket.channel;
      io.to(channel).emit('chat', msg, username);
    });

    console.log("Se ha conectado un nuevo usuario")
  });

  io.on('disconnect', function() {
      clients.splice(clients.indexOf(conn), 1);
  });

  return io;
};
