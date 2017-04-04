const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;
const cors = require('cors');
const passport = require('passport');
const strategy = require('./helpers/strategy');
const db = require('./helpers/db');
const mail = require('./helpers/mail');

const auth = require('./routes/auth');
const accounts = require('./routes/accounts');
const translate = require('./routes/translate');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use((req,res,next) => {
  req.db = db;
  req.mail = mail;
  next();
});

app.use('/v1/auth', auth);
app.use('/v1/accounts', accounts);
app.use('/v1/translate', translate);

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

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

module.exports = app;
