const express = require('express');
const _ = require('lodash');

const redis = require('../helpers/redis');
const validTokenMiddleware = require('../middlewares/expoToken');

const router = express.Router();

router.get('/', async (req, res) => {
  redis
    .lrangeAsync(`notifications:${req.user.name}`, 0, -1)
    .then(results => {
      const notifications = results.map(notification => JSON.parse(notification));
      res.send(notifications);
    })
    .catch(() => res.sendStatus(500));
});

router.post('/register', validTokenMiddleware, async (req, res) => {
  redis
    .saddAsync(`tokens:${req.user.name}`, req.expoToken)
    .then(result => {
      if (result === 1) {
        // 1 token was added
        res.send({ message: 'registered' });
      } else {
        res.status(400).send({ error: 'already registered with this token' });
      }
    })
    .catch(() => res.sendStatus(500));
});

router.post('/unregister', validTokenMiddleware, async (req, res) => {
  redis
    .sremAsync(`tokens:${req.user.name}`, req.expoToken)
    .then(result => {
      if (result === 1) {
        // 1 token removed from set
        res.send({ message: 'unregistered' });
      } else {
        res.status(404).send({ error: 'token not already registered' });
      }
    })
    .catch(() => res.sendStatus(500));
});

module.exports = router;
