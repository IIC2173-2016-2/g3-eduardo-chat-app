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
const request = require('request');
const mongoose = require('mongoose');
const db = require('./model/db');
const chat = require('./model/chats');

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
const chat_routes = require('./routes/chat')(io, mongoose, client);
const api_routes = require('./routes/api')(client, mongoose);

app.use('/', routes);
app.use('/chat', chat_routes);
app.use('/api', api_routes);

errorHandler(app);

setInterval(() => {
  const unixNow = moment().unix();

  /* Chat management */

  client.zrangebyscore(['users_ttl', 0, unixNow], (err, response) => {
    response.map((x) => {
      const [ chat_id, user_id ] = x.split(',');
      mongoose.model('Chat').findOneAndUpdate( { id: chat_id}, { $pull: { "users": { id: user_id } } }, (err, model) => {
        if (err) throw err;
        console.log(`Removed ${user_id} from ${chat_id}.`);
        const options = {
          url: `${process.env.MASTER_SERVER}/api/v1/backup/remove_from_chat`,
          headers: {
            'CHAT-API-SECRET-KEY': process.env.CHAT_API_SECRET_KEY,
            'CHAT-ID': chat_id,
            'USER-ID': user_id
          }
        };
        request(options, (err, response, body) => {
          if (!err && response.statusCode == 200){
            console.log(`Removed ${user_id} from ${chat_id}.`);
          }
        });
      });
    });
  });
  client.zremrangebyscore(['users_ttl', 0, unixNow], (err, response) => {
    if (err) throw err;
  });
  client.zrangebyscore(['chats_ttl', 0, unixNow], (err, response) => {
    response.map((x) => mongoose.model('Chat').remove({id: x}, (err, response) => {
      if (err) throw err;
      console.log(`Deleted chat ${x}.`);
      const options = {
        url: `${process.env.MASTER_SERVER}/api/v1/backup/delete_chat`,
        headers: {
          'CHAT-API-SECRET-KEY': process.env.CHAT_API_SECRET_KEY,
          'CHAT-ID': x
        }
      };
      request(options, (err, response, body) => {
        if (!err && response.statusCode == 200){
          console.log("Deleted chat in sibling server");
        }
      });
    }));
  });
  client.zremrangebyscore(['chats_ttl', 0, unixNow], (err, response) => {
    if (err) throw err;
  });

  /* Token management */

/*  client.zrangebyscore(['tokens_ttl', 0, unixNow], (err, response) => {
    if (err) throw err;
    if (response){
      console.log(response);
      response.map((x) => {
        const [user_id, _, ] = x.split(',');
        client.srem(['tokens', `${user_id}`], (err, response) => {
          if (err) throw err;
        });
      });
    }
  });
  client.zremrangebyscore(['tokens_ttl', 0, unixNow], (err, response) => {
    if (err) throw err;
  });*/
}, 1800000);
