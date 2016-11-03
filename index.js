const express = require('express');
const app = express();
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const portHandler = require('./port_handler');
const errorHandler = require('./error_handler');
const redis = require('redis');
const moment = require('moment');
const mongoose = require('mongoose');
const db = require('./model/db');

const client = redis.createClient();

/* Setting views */

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const debug = require('debug')('redis-chat:server');
const http = require('http');

/* Get port from environment and store in Express */

let port = portHandler.normalizePort(process.env.PORT || '3000');
app.set('port', port);

/* Create HTTP server */

let server = http.createServer(app);

/* Listen on provided port, on all network interfaces */

server.listen(port);
server.on('error', portHandler.onError);
server.on('listening', (server, debug) => portHandler.onListening);

let sockets = require('./sockets');
let io = sockets.socketServer(app, server);

const routes = require('./routes/index');
const chat_routes = require('./routes/chat')(io);
const api_routes = require('./routes/api')(client, mongoose);

app.use('/', routes);
app.use('/chat', chat_routes);
app.use('/api', api_routes);

errorHandler(app);

setInterval(() => {
  const unixNow = moment().unix();
  client.zrange(['chats_ttl', 0, unixNow], (err, response) => {
    console.log(response);
  });
  client.zremrangebyscore(['chats_ttl', 0, unixNow], (err, response) => {
    if (err) throw err;
  });
}, 10000);
