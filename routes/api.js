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

  const create_chat = (chat_id, chat_name, backup = false, local = true) => {
    const redis_db = backup ? "backup_chats_ttl" : "chats_ttl";
    const chat_model = backup ? "Backup" : "Chat";
    if(local){
      const ttlDate = _flooredDate(Date.now()).add(24, 'hours').unix();
      client.zadd([redis_db, ttlDate, chat_id], (err, response) => {
        if (err) throw err;
        mongoose.model(chat_model).count({id: chat_id}, (err, count) => {
          if (err) throw err;
          if (count === 0){
            mongoose.model(chat_model).create({ id: chat_id, name: chat_name, users: [] }, (err, response) => {
              if (err) {
                console.log(err);
                throw err;
              };
              console.log(`Added ${chat_id}`);
              if (!backup){
                const options = {
                  url: `${process.env.SIBLING_CHAT}/api/v1/backup/create_chat`,
                  headers: {
                    'CHAT-API-SECRET-KEY': process.env.CHAT_API_SECRET_KEY,
                    'CHAT-ID': chat_id,
                    'CHAT-NAME': chat_name
                  }
                };
                request(options, (err, response, body) => {
                  if (!err && response.statusCode == 200){
                    console.log("Created chat in sibling server");
                  }
                });
              }
            });
          };
        });
      });
    } else {
      mongoose.model(chat_model).count({id: chat_id}, (err, count) => {
        if (err) throw err;
        if (count === 0){
          mongoose.model(chat_model).create({ id: chat_id, name: chat_name, users: [] }, (err, response) => {
            if (err) {
              console.log(err);
              throw err;
            };
            console.log(`Added ${chat_id}`);
          });
        };
      });
    }

    return true;
  };

  const join_chat = (chat_id, user_id, username, res, backup = false, local = true) => {
    const chat_model = backup ? "Backup" : "Chat";
    const redis_chat_db = backup ? "backup_chats_ttl" : "chats_ttl";
    const redis_user_db = backup ? "backup_users_ttl" : "users_ttl";
    mongoose.model(chat_model).findOne({ id: chat_id }, (err, chat) => {
      if (err) throw err;
      if (!chat) {
        res.status(404).send({ message: 'Chat not found' });
      } else {
        if (chat.users.find( (x) => x.user_id === user_id )) {
          res.status(403).send({ message: 'User already in chat' });
        } else {
          if (local) {
            const ttlDate = _flooredDate(Date.now()).add(24, 'hours').unix();
            client.zadd([redis_chat_db, ttlDate, chat_id], (err, response) => {
              if (err) throw err;
              client.zadd([redis_user_db, ttlDate, `${chat_id},${user_id}`], (err, response) => {
                if (err) throw err;
                mongoose.model(chat_model).findByIdAndUpdate(chat._id, { $push: { "users": { "user_id": user_id, "username": username } } }, { safe: true, upsert: true}, (err, model) => {
                  if (err) throw err;
                  console.log(`${user_id} joined ${chat_id}`);
                  res.send(`${user_id} joined ${chat_id}`);
                  if (!backup){
                    const options = {
                      url: `${process.env.SIBLING_CHAT}/api/v1/backup/join_chat`,
                      headers: {
                        'CHAT-API-SECRET-KEY': process.env.CHAT_API_SECRET_KEY,
                        'CHAT-ID': chat_id,
                        'USER-ID': user_id,
                        'USERNAME': username
                      }
                    };
                    request(options, (err, response, body) => {
                      if (!err && response.statusCode == 200){
                        console.log(`User ${user_id} joined ${chat_id} in sibling server.`);
                      }
                    });
                  }
                });
              });
            });
          } else {
            mongoose.model(chat_model).findByIdAndUpdate(chat._id, { $push: { "users": { "user_id": user_id, "username": username } } }, { safe: true, upsert: true}, (err, model) => {
              if (err) throw err;
              console.log(`${user_id} joined ${chat_id}`);
              res.send(`${user_id} joined ${chat_id}`);
            });
          }
        }
      }
    });
  };

  const delete_chat = (chat_id, res, backup = false, local = true) => {
    const chat_model = backup ? "Backup" : "Chat";
    mongoose.model('Chat').remove({id: chat_id}, (err, response) => {
      if (err) throw err;
      console.log(`Deleted chat ${chat_id}.`);
      res.send(`Deleted chat ${chat_id}.`);
      if(local){
        const options = {
          url: `${process.env.SIBLING_CHAT}/api/v1/backup/delete_chat`,
          headers: {
            'CHAT-API-SECRET-KEY': process.env.CHAT_API_SECRET_KEY,
            'CHAT-ID': chat_id
          }
        };
        request(options, (err, response, body) => {
          if (!err && response.statusCode == 200){
            console.log("Deleted chat in sibling server");
          }
        });
      }
    });
  };

  const remove_from_chat = (chat_id, user_id, res, backup = false, local = true) => {
    const chat_model = backup ? "Backup" : "Chat";
    mongoose.model(chat_model).findOneAndUpdate( { id: chat_id}, { $pull: { "users": { id: user_id } } }, (err, model) => {
      if (err) throw err;
      console.log(`Removed ${user_id} from ${chat_id}.`);
      res.status(200).send({ message: `Removed ${user_id} from ${chat_id}.` });
      if (local){
        const options = {
          url: `${process.env.SIBLING_CHAT}/api/v1/backup/remove_from_chat`,
          headers: {
            'CHAT-API-SECRET-KEY': process.env.CHAT_API_SECRET_KEY,
            'CHAT-ID': chat_id,
            'USER-ID': user_id
          }
        };
        request(options, (err, response, body) => {
          if (!err && response.statusCode == 200){
            console.log(`User ${user_id} removed from ${chat_id} in sibling server.`);
          }
        });
      };
    });
  };

  const ask_sibling = () => {
    const askSibling = setInterval(() => {
      const options = {
        url: `${process.env.SIBLING_CHAT}/api/v1/alive`,
        headers: {
          'CHAT-API-SECRET-KEY': process.env.CHAT_API_SECRET_KEY
        }
      };
      request(options, (err, response, body) => {
        if (response.statusCode == 200){
          client.zrangebyscore(['backup_users_ttl', 0, unixNow], (err, response) => {
            console.log(response);
            response.map((x) => {
              const [ chat_id, user_id ] = x.split(',');
            });
          });
          clearInterval(askSibling);
        }
      });
    }, 120000);
  };

  router.route('/v1/*').get(
    (req, res, next) => {
      console.log("Decorator");
      if (req.get('CHAT-API-SECRET-KEY') === process.env.CHAT_API_SECRET_KEY){
        next();
      } else {
        res.status(401);
        const err = new Error('No Permission');
        err.status = 401;
        next(err);
      }
    });

  router.route('/v1/alive').get(
    (req, res, next) => {
      res.status(200).send({ message: "I'm Fine" });
    });

  router.route('/v1/is_chat_created').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      if (chat_id === undefined){
        res.status(400).send({ message: "Bad request." });
      }
      else {
        if(req.get("TARGET-SERVER") !== process.env.CURRENT_SERVER){
          mongoose.model('Backup').findOne({ id: chat_id }, (err, chat) => {
            if (err) throw err;
            if (chat) {
              res.status(200).send({ message: `Found chat ${chat_id}.`, users: chat.users.length });
            }
          });
        } else {
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
      }
    });

  router.route('/v1/create_chat').get(
    (req, res, next) => {
      const chat_id = req.get("CHAT-ID");
      const chat_name = req.get("CHAT-NAME");
      if ((chat_id === undefined) || (chat_name === undefined)){
        res.status(400).send({ message: "Bad request."});
      } else {
        if(req.get("TARGET-SERVER") !== process.env.CURRENT_SERVER){
          if (create_chat(chat_id, chat_name, true)){
            res.send(`Created ${chat_id}.`);
          };
        } else {
          if (create_chat(chat_id, chat_name)){
            res.send(`Created ${chat_id}.`);
          };
        }
      }
    });

  router.route('/v1/delete_chat').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      if ((chat_id === undefined)){
        res.status(400).send({ message: "Bad request."});
      } else {
        if(req.get("TARGET-SERVER") !== process.env.CURRENT_SERVER){
          delete_chat(chat_id, res, true);
        } else {
          delete_chat(chat_id, res);
        }
      }
    });

  router.route('/v1/join_chat').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      const user_id = req.get('USER-ID');
      const username = req.get('USERNAME');
      if ((chat_id === undefined) || (user_id === undefined) || (username === undefined)){
        res.status(400).send({ message: "Bad request."});
      } else {
        if(req.get("TARGET-SERVER") !== process.env.CURRENT_SERVER){
          join_chat(chat_id, user_id, username, res, true);
        } else {
          join_chat(chat_id, user_id, username, res);
        };
      }
    });

  router.route('/v1/remove_from_chat').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      const user_id = req.get('USER-ID');
      if ((chat_id === undefined) || (user_id === undefined)){
        res.status(400).send({ message: "Bad request."});
      } else {
        if(req.get("TARGET-SERVER") !== process.env.CURRENT_SERVER){
          remove_from_chat(chat_id, user_id, true);
        } else {
          remove_from_chat(chat_id, user_id);
        }
      }
    });


  router.route('/v1/backup/create_chat').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      const chat_name = req.get('CHAT-NAME');
      if ((chat_id === undefined) || (chat_name === undefined)){
        res.status(400).send({ message: "Bad request."});
      } else {
        if (create_chat(chat_id, chat_name, true, false)){
          console.log(`Created chat ${chat_id}`);
          res.status(200).send({ message: `Created chat ${chat_id} successfully.` });
        };
      }
    });

  router.route('/v1/backup/delete_chat').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      if ((chat_id === undefined)){
        res.status(400).send({ message: "Bad request."});
        console.log('Bad Request');
      } else {
        delete_chat(chat_id, res, true, false);
        mongoose.model('Backup').remove({id: chat_id}, (err, response) => {
          if (err) throw err;
          console.log(`Deleted chat ${chat_id}.`);
        });
      }
    });

  router.route('/v1/backup/join_chat').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      const user_id = req.get('USER-ID');
      const username = req.get('USERNAME');
      if ((chat_id === undefined) || (user_id === undefined) || (username === undefined)){
        res.status(400).send({ message: "Bad request."});
      } else {
        join_chat(chat_id, user_id, username, res, true, false);
      };
    });

  router.route('/v1/backup/remove_from_chat').get(
    (req, res, next) => {
      const chat_id = req.get('CHAT-ID');
      const user_id = req.get('USER-ID');
      if ((chat_id === undefined) || (user_id === undefined)){
        res.status(400).send({ message: "Bad request."});
      } else {
        remove_from_chat(chat_id, user_id, res, true, false);
      }
    });

  return router;
};

const _flooredDate = (timestamp) => {
  return moment(timestamp).utc();
};
