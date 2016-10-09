const express = require('express');
const app = express();
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const redis = require('redis');

/* Adding routes */

const routes = require('./routes/index');

/* Setting views */

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

/* Catch 404 and forward to error handler */

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/* Error handlers */

/* Development error handler
 (will print stacktrace) */

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

/* Production error handler
no stacktraces leaked to user */

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

var debug = require('debug')('redis-chat:server');
var http = require('http');

/* Get port from environment and store in Express */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/* Create HTTP server */

var server = http.createServer(app);
var io = require('socket.io')(server);

/* Listen on provided port, on all network interfaces */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/* Normalize a port into a number, string, or false */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

/* Event listener for HTTP server "error" event */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  /* handle specific listen errors with friendly messages */
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/* Event listener for HTTP server "listening" event */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

var pub = redis.createClient();
var sub = redis.createClient();
var clients = [];

sub.subscribe('global');
sub.on('message', function(channel, msg) {
  // Broadcast the message to all connected clients on this server.
  for (var i=0; i < clients.length; i++) {
    clients[i].emit('chat', msg);
  }
});

io.on('connection', function(socket){
    clients.push(socket);
    socket.on('chat', function(msg){
      console.log("msg: " + msg);
      pub.publish('global', msg);
    });

    console.log("Se ha conectado un nuevo usuario")
});


io.on('disconnect', function() {
    clients.splice(clients.indexOf(conn), 1);
  });
