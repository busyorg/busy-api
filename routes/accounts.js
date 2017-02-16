const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/', passport.authenticate('jwt', { session: false }), function(req, res, next) {
  const username = req.query.username;
  const query = 'INSERT INTO accounts(user, username) values(${id}, ${username})';
  req.db.none(query, { id: req.user.id, username })
    .then(() => {
      res.json({ username });
    })
    .catch(err => next(err));
});

module.exports = router;
