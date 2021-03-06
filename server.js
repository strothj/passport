const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./user-model');
const bcrypt = require('bcryptjs');

const app = express();

mongoose.Promise = global.Promise;
const jsonParser = bodyParser.json();

const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;

const strategy = new BasicStrategy((username, password, callback) => {
  User.findOne({ username }, (err, user) => {
    if (err) {
      callback(err);
      return;
    }

    if (!user) {
      callback(null, false, {
        message: 'Incorrect username.',
      });
      return;
    }

    user.validatePassword(password, (passErr, isValid) => {
      if (passErr) {
        callback(passErr);
        return;
      }

      if (!isValid) {
        callback(null, false, {
          message: 'Incorrect password.',
        });
        return;
      }
      callback(null, user);
      return;
    });
  });
});

passport.use(strategy);

app.use(passport.initialize());

app.get('/hidden', passport.authenticate('basic', { session: false }), (req, res) => {
  res.json({
    message: 'Luke... I am your father',
  });
});

app.post('/users', jsonParser, (req, res) => {
  if (!req.body) {
    res.status(400).json({
      message: 'No request body',
    });
    return;
  }

  if (!('username' in req.body)) {
    res.status(422).json({
      message: 'Missing field: username',
    });
    return;
  }

  let username = req.body.username;

  if (typeof username !== 'string') {
    res.status(422).json({
      message: 'Incorrect field type: username',
    });
    return;
  }

  username = username.trim();

  if (username === '') {
    res.status(422).json({
      message: 'Incorrect field length: username',
    });
    return;
  }

  if (!('password' in req.body)) {
    res.status(422).json({
      message: 'Missing field: password',
    });
    return;
  }

  let password = req.body.password;

  if (typeof password !== 'string') {
    res.status(422).json({
      message: 'Incorrect field type: password',
    });
    return;
  }

  password = password.trim();

  if (password === '') {
    res.status(422).json({
      message: 'Incorrect field length: password',
    });
    return;
  }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      res.status(500).json({
        message: 'Internal server error',
      });
      return;
    }

    bcrypt.hash(password, salt, (herr, hash) => {
      if (herr) {
        res.status(500).json({
          message: 'Internal server error',
        });
        return;
      }

      const user = new User({ username, password: hash });
      user.save()
        .then(() => {
          res.status(201).json({});
        })
        .catch(() => {
          res.status(500).json({
            message: 'Internal server error',
          });
        });
    });
  });
});

mongoose.connect('mongodb://localhost/auth')
  .then(() => {
    app.listen(process.env.PORT || 8080);
  });
