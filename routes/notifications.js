const express = require('express');
const _ = require('lodash');

const redis = require('../helpers/redis');
const validTokenMiddleware = require('../middlewares/expoToken');

const router = express.Router();

router.get('/', async (req, res) => {
  redis.lrangeAsync(`notifications:${req.user.name}`, 0, -1)
    .then((results) => {
      const notifications = results.map(notification => JSON.parse(notification));
      res.send(notifications);
    })
    .catch(() => res.sendStatus(500));
});

router.post('/register', validTokenMiddleware, async (req, res) => {
  redis.lrangeAsync(`tokens:${req.user.name}`, 0, -1)
    .then((tokens) => {
      const tokenAlreadyExists = _.some(tokens, token => req.expoToken === token);
      if (tokenAlreadyExists) {
        res.status(400).send({ error: 'already registered with this token' });
      } else {
        redis.rpush([`tokens:${req.user.name}`, req.expoToken], (err) => {
          if (err) {
            return Promise.reject(err);
          } else {
            res.send({ message: 'registered' });
          }
        });
      }
    });
});

router.post('/unregister', validTokenMiddleware, async (req, res) => {
  redis.lrem(`tokens:${req.user.name}`, 1, req.expoToken, err => {
    if (err) {
      return Promise.reject(err);
    } else {
      res.send({ message: 'unregistered' });
    }
  });
});

module.exports = router;
