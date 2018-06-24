const _ = require('lodash');
const Expo = require('expo-server-sdk');

function validTokenMiddleware(req, res, next) {
  const expoToken = _.get(req, 'body.token');

  if (!Expo.isExpoPushToken(expoToken)) {
    return res.status(400).send({
      error: 'valid token is required',
    });
  }

  req.expoToken = expoToken;
  next();
}

module.exports = validTokenMiddleware;
