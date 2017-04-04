const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const validator = require('validator');
const router = express.Router();

router.get('/', passport.authenticate('jwt', { session: false }), function(req, res, next) {
  res.json(req.user);
});

router.get('/me', passport.authenticate('jwt', { session: false }), function(req, res, next) {
  res.json(req.user);
});

router.get('/signup', async function(req, res, next) {
  const email = req.query.email;
  const password = req.query.password;
  const query = 'SELECT * FROM users WHERE "email" = ${email} LIMIT 1';
  const users = await req.db.query(query, { email });
  if (users[0]) {
    res.status(400).json({ email: ['Email already exists.'] });
  } else if (!validator.isEmail(email)) {
    res.status(400).json({ email: ['Email is not valid.'] });
  } else if (!validator.isLength(password, {min: 6, max: 128})) {
    res.status(400).json({ password: ['Passwords must be between 6 and 128 characters.'] });
  } else {
    const hash = bcrypt.hashSync(password, 10);
    const query = 'INSERT INTO users(email, password) values(${email}, ${hash})';
    req.db.none(query, { email, hash });
    const token = jwt.sign({ email }, process.env.JWT_SECRET);
    res.json({ token });
  }
});

router.get('/login', async function(req, res, next) {
  const email = req.query.email;
  const password = req.query.password;
  // TODO check if email and password are not empty
  const query = 'SELECT * FROM users WHERE "email" = ${email} LIMIT 1';
  const users = await req.db.query(query, { email });
  if (!users[0]) {
    res.status(400).json({ email: ['Email does not exist.'] });
  } else if (!bcrypt.compareSync(password, users[0].password)) {
    res.status(400).json({ password: ['Password does not match.'] });
  } else {
    const token = jwt.sign({ email }, process.env.JWT_SECRET);
    res.json({ token });
  }
});

module.exports = router;
