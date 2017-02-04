const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

router.get('/', passport.authenticate('jwt', { session: false }), function(req, res, next) {
  res.json(req.user);
});

router.get('/me', passport.authenticate('jwt', { session: false }), function(req, res, next) {
  res.json(req.user);
});

router.get('/signup', function(req, res, next) {
  const email = req.query.email;
  const password = req.query.password;
  // Check if email and password are well formed
  // Check if email not exist already
  const hash = bcrypt.hashSync(password, 10);
  const query = 'INSERT INTO users(email, password) values(${email}, ${hash})';
  req.db.none(query, { email, hash })
    .then(() => {
      const token = jwt.sign({ email }, process.env.JWT_SECRET);
      res.json({ token });
    })
    .catch(err => next(err));
});

router.get('/login', function(req, res, next) {
  const email = req.query.email;
  const password = req.query.password;
  const query = 'SELECT * FROM users WHERE "email" = ${email} LIMIT 1';
  req.db.query(query, { email })
    .then(users => {
      if (users[0] && bcrypt.compareSync(password, users[0].password)) {
        const token = jwt.sign({ email }, process.env.JWT_SECRET);
        res.json({ token });
      } else {
        res.json({ error: 'User not found.' });
      }
    })
    .catch(err => next(err));
});

module.exports = router;
