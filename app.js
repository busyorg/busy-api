const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const cors = require('cors');
const { createClient } = require('lightrpc');
const bluebird = require('bluebird');
const redis = require('./helpers/redis');
const rpc = require('./routes/rpc');

const client = createClient('https://api.steemit.com');
bluebird.promisifyAll(client);

http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());
app.use((req,res,next) => {
  req.redis = redis;
  req.client = client;
  next();
});

app.use('/', rpc);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.error(err);

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

module.exports = app;
