const express = require('express');
const request = require('request');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const masterServer = process.env.MASTER_SERVER;

module.exports = ( io, mongoose, client ) => {
  const router = express.Router();
  function findRooms() {
    let availableRooms = [];
    let rooms = io.sockets.adapter.rooms;
    if (rooms) {
      for (let room in rooms) {
        if (!rooms[room]['sockets'].hasOwnProperty(room)) {
          availableRooms.push(room);
        }
      }
    }
    return availableRooms;
  };

  router.get('/', (req, res, next) => {
    res.render('chats', { title: 'Chat rooms', rooms: findRooms() });
  });

  router.get('/chat_room/:id', (req, res, next) => {
    jwt.verify(req.cookies['access-token'], process.env.JWT_SECRET, (err, decoded) => {
      if(decoded)
      {
        req.user = decoded._doc;
        const user_id = req.user._id;
        const id = req.params.id;
        if(req.get("TARGET-SERVER") !== process.env.CURRENT_SERVER){
          mongoose.model('Backup').findOne({ id: id }, (err, chat) => {
            if (err) throw err;
            if (!chat) {
              let error_ = new Error('Chat not found.');
              error_.status = 404;
              res.render('error', { message: error_.message, error: error_ });
            } else {
              console.log(chat.users);
              console.log(user_id);
              if (chat.users.find( (c) =>  c.user_id === user_id  )) {
                res.render('chat_room', {title: 'Chat Room', chat_id: id, username: req.user.username, chatname: chat.name , master_server: process.env.MASTER_SERVER});
              } else {
                let error_ = new Error('No permission to join chat.');
                error_.status = 403;
                res.render('error', { message: error_.message, error: error_ });
              };
            }
          });
        } else {
          mongoose.model('Chat').findOne({ id: id }, (err, chat) => {
            if (err) throw err;
            if (!chat) {
              let error_ = new Error('Chat not found.');
              error_.status = 404;
              res.render('error', { message: error_.message, error: error_ });
            } else {
              console.log(chat.users);
              console.log(user_id);
              if (chat.users.find( (c) =>  c.user_id === user_id  )) {
                res.render('chat_room', {title: 'Chat Room', chat_id: id, username: req.user.username, chatname: chat.name , master_server: process.env.MASTER_SERVER});
              } else {
                let error_ = new Error('No permission to join chat.');
                error_.status = 403;
                res.render('error', { message: error_.message, error: error_ });
              };
            }
          });
        }
      }
      else
      {
        res.redirect(302, masterServer + "/users/login");
      }
    });
  });
  /*       mongoose.model('Chat').findOne({ "users.user_id": user_id }, (err, chat) => {
   if (err) {
   console.log(err);
   throw err;
   };
   if (!chat) {
   let error_ = new Error('No permission to join chat.');
   error_.status = 403;
   res.render('error', { message: error_.message, error: error_ });
   return next();
   } else {
   res.render('chat_room', {title: 'Chat Room', chat_id: id });
   return next();
   };
   });
   }

   }); */

  /*  router.get('/chat_room/:id/:token', (req, res, next) => {
   const token = req.params.token;
   let user_id, username;
   client.sismember(['tokens', `${token}`], (err, response) => {
   if (err) throw err;
   if (response === 0){
   request( { url: masterServer, headers: { 'token': `${token}` } }, (err, response, body) => {
   if (err) throw err;
   if (response){
   let { user_id, username } = JSON.parse(body);
   const ttlDate = _flooredDate(Date.now()).add(2, 'hours').unix();
   client.zadd(["tokens_ttl", ttlDate, `${user_id},${username},${token}`], (err, response) => {
   if (err) throw err;
   client.sadd(['tokens', `${user_id}`], (err, response) => {
   if (err) throw err;
   console.log(`Added token for ${user_id}`);
   });
   });
   }
   });
   } else {
   client.zscan(['tokens_ttl', 0, 'MATCH', `*${token}`], (err, response) => {
   if (err) throw err;
   [user_id, username, _] = response[1][0].split(',');
   const ttlDate = _flooredDate(Date.now()).add(2, 'hours').unix();
   client.zadd(["tokens_ttl", ttlDate, `${user_id},${username},${token}`], (err, response) => {
   if (err) throw err;
   console.log(`Extended token time for ${user_id}`);
   });
   });
   }
   });
   mongoose.model('Chat').findOne({ id: req.params.id }, (err, chat) => {
   if (err) throw err;
   if (!chat) {
   let error_ = new Error('Chat not found.');
   error_.status = 404;
   res.render('error', { message: error_.message, error: error_ });
   } else {
   console.log("_________________________________________________________");
   console.log(chat.users);
   console.log("_________________________________________________________");
   console.log(chat.users.find((c) =>  c.id === user_id));
   console.log(user_id);
   console.log("_________________________________________________________");
   if (chat.users.find( (c) =>  c.id === user_id  )) {
   console.log("found_user");
   //TODO: Pass username to user
   res.render('chat_room', {title: 'Chat Room', chat_id: req.params.id });
   } else {
   let error_ = new Error('No permission to join chat.');
   error_.status = 403;
   res.render('error', { message: error_.message, error: error_ });
   };
   }
   });
   });*/

  return router;
};

const _flooredDate = (timestamp) => {
  return moment(timestamp).utc();
};
