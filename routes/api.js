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
        const ttlDate = _flooredDate(Date.now()).add(24, 'hours').unix();
        client.zadd(["chats_ttl", ttlDate, chat_id], (err, response) => {
          if (err) throw err;
          mongoose.model('Chat').count({id: chat_id}, (err, count) => {
            if (err) throw err;
            if (count === 0){
              mongoose.model('Chat').create({ id: chat_id, name: chat_name, users: [] }, (err, response) => {
                if (err) {
                  console.log(err);
                  throw err;
                };
                console.log(`Added ${chat_id}`);
              });
            };
          });
        });
        res.send(`Created ${chat_id}.`);
      }
      else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/join_chat').post(
    (req, res, next) => {
      if (req.body.CHAT_API_SECRET_KEY == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.body.chat_id;
        const user_id = req.body.user_id;
        const username = req.body.username;
        mongoose.model('Chat').findOne({ id: chat_id }, (err, chat) => {
          if (err) throw err;
          if (!chat) {
            res.status(404).send({ message: 'Chat not found' });
          } else {
            if (chat.users.find( (x) => x.user_id === user_id )) {
              res.status(403).send({ message: 'User already in chat' });
            } else {
              const ttlDate = _flooredDate(Date.now()).add(24, 'hours').unix();
              client.zadd(["chats_ttl", ttlDate, chat_id], (err, response) => {
                if (err) throw err;
                client.zadd(["users_ttl", ttlDate, `${chat_id},${user_id}`], (err, response) => {
                  if (err) throw err;
                  mongoose.model('Chat').findByIdAndUpdate(chat._id, { $push: { "users": { "user_id": user_id, "username": username } } }, { safe: true, upsert: true}, (err, model) => {
                    if (err) throw err;
                    console.log(`${user_id} joined ${chat_id}`);
                    res.send(`${user_id} joined ${chat_id}`);
                  });
                });
              });
            }
          }
        });
      }
      else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/save_token').post(
    (req, res, next) => {
      if (req.body.CHAT_API_SECRET_KEY == process.env.CHAT_API_SECRET_KEY){
        const token = req.body.token;
        const user_id = req.body.user_id;
        client.sismember(['tokens', user_id], (err, response) => {
          if (err) throw err;
          if (response === 0){
            const ttlDate = _flooredDate(Date.now()).add(2, 'hours').unix();
            client.zadd(["tokens_ttl", ttlDate, `${user_id},${username},${token}`], (err, response) => {
              if (err) throw err;
              client.sadd(['tokens', `${user_id}`], (err, response) => {
                if (err) throw err;
                console.log(`Added token for ${user_id}`);
              });
            });
            res.send(`Added token for ${user_id}.`);
          } else {
            res.status(403).send(`${user_id} already has a token.`);
          }
        });
      }
      else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  return router;
};

const _flooredDate = (timestamp) => {
  return moment(timestamp).utc();
};
