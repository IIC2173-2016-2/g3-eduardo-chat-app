var express = require('express');
module.exports = function( io ) {
  var router = express.Router();
  function findRooms() {
      var availableRooms = [];
      var rooms = io.sockets.adapter.rooms;
      if (rooms) {
          for (var room in rooms) {
              if (!rooms[room]['sockets'].hasOwnProperty(room)) {
                  availableRooms.push(room);
              }
          }
      }
      return availableRooms;
  };
  /* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('chats', { title: 'Chat rooms', rooms: findRooms() });
  });

  router.get('/chat_room/:id', function(req, res, next) {
    res.render('chat_room', {title: 'Chat Room', chat_id: req.params.id })
    console.log(req.params.id);
  })
  return router;
};
