var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('redis');

var pub = redis.createClient();
var sub = redis.createClient();
var clients = [];

sub.subscribe('global');
sub.on('message', function(channel, msg) {
  // Broadcast the message to all connected clients on this server.
  for (var i=0; i<clients.length; i++) {
    clients[i].emit('chat',msg);
  }
});

app.get('/', function(req, res){
    res.sendFile('index.html', { root: __dirname })

});

io.on('connection', function(socket){
    clients.push(socket);
    socket.on('chat', function(msg){
      console.log("msg: " + msg);
      pub.publish('global',msg);
    });

    console.log("Se ha conectado un nuevo usuario")
});


io.on('disconnect', function() {
    clients.splice(clients.indexOf(conn), 1);
  });

http.listen(3000, function(){
    console.log('listening on *:3000');
});
