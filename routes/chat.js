const express = require('express');
const request = require('request');
const moment = require ('moment');
const masterServer = process.env.MASTER_SERVER + '/auth';

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

  router.get('/chat_room/:id/:token', (req, res, next) => {
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
    console.log(user_id, username);
    mongoose.model('Chat').findOne({ id: req.params.id }, (err, chat) => {
      if (err) throw err;
      if (!chat) {
        let error_ = new Error('Chat not found.');
        error_.status = 400;
        res.render('error', { message: error_.message, error: error_ });
      } else {
        console.log(user_id);
        if (chat.users.find( (x) => x.id === user_id )) {
          //TODO: Pass username to user
          res.render('chat_room', {title: 'Chat Room', chat_id: req.params.id });
        } else {
          let error_ = new Error('No permission to join chat.');
          error_.status = 403;
          res.render('error', { message: error_.message, error: error_ });
        }
      }
    });
  });

  return router;
};

const _flooredDate = (timestamp) => {
  return moment(timestamp).utc();
};
