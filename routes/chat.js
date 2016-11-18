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
        if(process.env.LOAD === "heavy"){
          mongoose.model('Backup').findOne({ id: id }, (err, chat) => {
            if (err) throw err;
            if (chat) {
              if (chat.users.find( (c) =>  c.user_id === user_id  )) {
                res.render('chat_room', {title: 'Chat Room', chat_id: id, username: req.user.username, chatname: chat.name , master_server: process.env.MASTER_SERVER});
              } else {
                let error_ = new Error('No permission to join chat.');
                error_.status = 403;
                res.render('error', { message: error_.message, error: error_ });
              };
            }
          });
        };
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
      else
      {
        res.redirect(302, masterServer + "/users/login");
      }
    });
  });

  return router;
};

const _flooredDate = (timestamp) => {
  return moment(timestamp).utc();
};
