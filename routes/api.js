const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const moment = require('moment');
const request = require('request');
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

  const create_chat = (chat_id, chat_name, backup = false) => {
    const ttlDate = _flooredDate(Date.now()).add(24, 'hours').unix();
    const redis_db = backup ? "backup_chats_ttl" : "chats_ttl";
    const chat_model = backup ? "Backup" : "Chat";
    client.zadd([redis_db, ttlDate, chat_id], (err, response) => {
      if (err) throw err;
      mongoose.model(chat_model).count({id: chat_id}, (err, count) => {
        if (err) throw err;
        if (count === 0){
          console.log(chat_id);
          mongoose.model(chat_model).create({ id: chat_id, name: chat_name, users: [] }, (err, response) => {
            if (err) {
              console.log(err);
              throw err;
            };
            console.log(`Added ${chat_id}`);
          });
        };
      });
    });
    return true;
  };

  const ask_sibling = () => {
    const askSibling = setInterval(() => {
      const status = 0;
      if (status === 200){
        clearInterval(askSibling);
      }
    }, 120000);
  };

  router.route('/v1/is_chat_created').get(
    (req, res, next) => {
      const load = req.get('SLAVE-TARGET');
      if (load === "sibling"){

      };
      const chat_id = req.get('CHAT-ID');
      if (chat_id === undefined){
        res.status(400).send({ message: "Bad request." });
      }
      else {
        if (process.env.LOAD === "heavy"){
          mongoose.model('Backup').findOne({ id: chat_id }, (err, chat) => {
            if (err) throw err;
            if (chat) {
              res.status(200).send({ message: `Found chat ${chat_id}.` });
            }
          });
        };
        mongoose.model('Chat').findOne({ id: chat_id }, (err, chat) => {
          if (err) throw err;
          if (!chat) {
            res.status(404).send({ message: `Chat not found.` });
          }
          if (chat) {
            res.status(200).send({ message: `Found chat ${chat_id}.`, users: chat.users.length });
          }
        });
      }
    });

  router.route('/v1/create_chat').get(
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.get("CHAT-ID");
        const chat_name = req.get("CHAT-NAME");
        if ((chat_id === undefined) || (chat_name === undefined)){
          res.status(400).send({ message: "Bad request."});
        } else {
          if (create_chat(chat_id, chat_name)){
            res.send(`Created ${chat_id}.`);
          };
        }
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/delete_chat').get(
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.get('CHAT-ID');
        if ((chat_id === undefined)){
          res.status(400).send({ message: "Bad request."});
        } else {
          mongoose.model('Chat').remove({id: chat_id}, (err, response) => {
            if (err) throw err;
            console.log(`Deleted chat ${chat_id}.`);
          });
        }
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/join_chat').get(
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.get('CHAT-ID');
        const user_id = req.get('USER-ID');
        const username = req.get('USERNAME');
        if ((chat_id === undefined) || (user_id === undefined) || (username === undefined)){
          res.status(400).send({ message: "Bad request."});
        } else {
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
        };
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/start_heavy_mode'){
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        process.env.LOAD = "heavy";

      }
    };
  };

  router.route('/v1/backup/create_chat').get(
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.get('CHAT-ID');
        const chat_name = req.get('CHAT-NAME');
        if ((chat_id === undefined) || (chat_name === undefined)){
          res.status(400).send({ message: "Bad request."});
        } else {
          if (create_chat(chat_id, chat_name, true)){
            console.log(`Created chat ${chat_id}`);
            res.status(200).send({ message: `Created chat ${chat_id} successfully.` });
          };
        }
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      };
    });

  router.route('/v1/backup/delete_chat').get(
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.get('CHAT-ID');
        if ((chat_id === undefined)){
          res.status(400).send({ message: "Bad request."});
        } else {
          mongoose.model('Chat').remove({id: chat_id}, (err, response) => {
            if (err) throw err;
            console.log(`Deleted chat ${chat_id}.`);
          });
        }
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/backup/join_chat').get(
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.get('CHAT-ID');
        const user_id = req.get('USER-ID');
        const username = req.get('USERNAME');
        if ((chat_id === undefined) || (user_id === undefined) || (username === undefined)){
          res.status(400).send({ message: "Bad request."});
        } else {
          mongoose.model('Chat').findOne({ id: chat_id }, (err, chat) => {
            if (err) throw err;
            if (!chat) {
              res.status(404).send({ message: 'Chat not found' });
            } else {
              if (chat.users.find( (x) => x.user_id === user_id )) {
                res.status(403).send({ message: 'User already in chat' });
              } else {
                mongoose.model('Chat').findByIdAndUpdate(chat._id, { $push: { "users": { "user_id": user_id, "username": username } } }, { safe: true, upsert: true}, (err, model) => {
                  if (err) throw err;
                  console.log(`${user_id} joined ${chat_id}`);
                  res.send(`${user_id} joined ${chat_id}`);
                });
              }
            }
          });
        };
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/backup/remove_from_chat').get(
    (req, res, next) => {
      if (req.get('CHAT-API-SECRET-KEY') == process.env.CHAT_API_SECRET_KEY){
        const chat_id = req.get('CHAT-ID');
        const user_id = req.get('USER-ID');
        if ((chat_id === undefined) || (user_id === undefined) || (username === undefined)){
          res.status(400).send({ message: "Bad request."});
        } else {
          mongoose.model('Chat').findOneAndUpdate( { id: chat_id}, { $pull: { "users": { id: user_id } } }, (err, model) => {
            if (err) throw err;
            console.log(`Removed ${user_id} from ${chat_id}.`);
          });
        }
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  /*    router.route('/v1/save_token').post(
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
   }); */

  return router;
};

const _flooredDate = (timestamp) => {
  return moment(timestamp).utc();
};
