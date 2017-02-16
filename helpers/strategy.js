const passport = require('passport');
const Strategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const db = require('./db');
const params = {
  secretOrKey: process.env.JWT_SECRET,
  jwtFromRequest: ExtractJwt.fromUrlQueryParameter('token'),
};

const strategy = new Strategy(params, (payload, done) => {
  const query = 'SELECT * FROM users WHERE "email" = ${email} LIMIT 1';
  db.query(query, { email: payload.email })
    .then(users => {
      if (users[0]) {
        const user = {
          id: users[0].id,
          email: users[0].email,
        };
        return done(null, user);
      }
    })
    .catch(err => done(err, null));
});

passport.use(strategy);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = strategy;
