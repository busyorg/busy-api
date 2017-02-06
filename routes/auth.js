const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const schema = require('../helpers/schema');
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
  // TODO check if email exist already on the database
  req.validator.validate({ email, password }, schema.signup, (err, valid) => {
    if (valid) {
      const hash = bcrypt.hashSync(password, 10);
      const query = 'INSERT INTO users(email, password) values(${email}, ${hash})';
      req.db.none(query, { email, hash })
        .then(() => {
          const token = jwt.sign({ email }, process.env.JWT_SECRET);
          res.json({ token });
        })
        .catch(err => next(err));
    } else {
      res.status(400).json(req.validator.errorObject(err));
    }
  });
});

router.get('/login', function(req, res, next) {
  const email = req.query.email;
  const password = req.query.password;
  // TODO check if email and password are not empty
  const query = 'SELECT * FROM users WHERE "email" = ${email} LIMIT 1';
  req.db.query(query, { email })
    .then(users => {
      if (!users[0]) {
        res.status(400).json({ email: ['Email does not exist.'] });
      } else if (!bcrypt.compareSync(password, users[0].password)) {
        res.status(400).json({ password: ['Password does not match.'] });
      } else {
        const token = jwt.sign({ email }, process.env.JWT_SECRET);
        res.json({ token });
      }
    })
    .catch(err => next(err));
});

module.exports = router;
