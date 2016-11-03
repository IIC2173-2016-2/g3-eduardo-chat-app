const express = require('express');
module.exports = ( io ) => {
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

  router.get('/', function(req, res, next) {
    res.render('chats', { title: 'Chat rooms', rooms: findRooms() });
  });

  router.get('/chat_room/:id', function(req, res, next) {
    res.render('chat_room', {title: 'Chat Room', chat_id: req.params.id });
  });
  return router;
};
