const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
    const secret = crypto.randomBytes(32).toString('hex');

    const query = 'INSERT INTO users(email, password, secret) values(${email}, ${hash}, ${secret})';
    req.db.none(query, { email, hash, secret });
    const token = jwt.sign({ email }, process.env.JWT_SECRET);
    res.json({ token });

    req.mail.send('confirm_email', {
      url: `https://busy.org/confirm?email=${email}&code=${secret}`
    }, (err, result) => {
      console.log(err, result);
    });
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

router.get('/confirm', async function(req, res, next) {
  const email = req.query.email;
  const code = req.query.code;

  const query = 'SELECT * FROM users WHERE "email" = ${email} AND "secret" = ${code} LIMIT 1';
  const users = await req.db.query(query, { email, code });

  if (!users[0]) {
    res.status(400).json({ code: ['Code is not valid.'] });
  } else {
    const update = 'UPDATE users SET "email_verified" = 1 WHERE "email" = ${email} AND "secret" = ${code}';
    req.db.none(update, { email, code });
    res.json({ success: true });
  }
});

module.exports = router;
