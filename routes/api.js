const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const moment = require('moment');
const router = express.Router();
const urlencodedParser = bodyParser.urlencoded({ extended: true });
router.use(bodyParser.urlencoded({ extended: true }));
router.use(methodOverride((req, res) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method;
    delete req.body._method;
    return method;
  };
}));

module.exports = (client, mongoose) => {
  router.route('/v1/create_chat').post(
    (req, res, next) => {
      if (req.body.CHAT_API_SECRET_KEY == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.body.chat_id;
        const chat_name = req.body.chat_name;
        const ttlDate = _flooredDate(Date.now()).add(10, 'seconds').unix();
        client.zadd(["chats_ttl", ttlDate, chat_id], (err, response) => {
          if (err) throw err;
          //TODO: Add chat to mongo.
        });
        res.send(`Created {chat_id}.`);
      }
      else {
        res.status(403);
        const err = new Error('No Permission');
        err.status = 403;
        next(err);
      }
    });
  return router;
};

const _flooredDate = (timestamp) => {
  return moment(timestamp).utc();
};
