module.exports = function(db) {
  var express = require('express');
  var router = express.Router();

  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;

  var bcrypt = require('bcrypt');

  var nodemailer = require('nodemailer');
  var transporter = nodemailer.createTransport(process.env.EMAIL_URI)
  var validKeyCharacters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  passport.use('login', new LocalStrategy(function(username, password, done) {
    if(username.length <= 50 && password.length <= 50)
    {
      db.collection('users').findOne({'username': username}, function(err, user) {
        if(!user)
        {
          return done(null, false, {message: 'Username or password invalid.'});
        }
        if(!user.verified)
        {
          return done(null, false, {message: 'Account unverified, please check your e-mail.'});
        }
        bcrypt.compare(password, user.password, function(err, res) {
          if(err)
          {
            throw new Error(err);
          }
          if(!res)
          {
            return done(null, false, {message: 'Username or password invalid.'});
          }
          return done(null, user, {authenticated: true, redirect: 'chat', message: 'Successfully logged in.'});
        });
      });
    }
    else
    {
      return done(null, false);
    }
  }));

  router.get('/views/:filename', function(req, res, next) {
    var filename = req.params.filename;
    if (!filename)
    {
      return res.status(404).send(filename + 'not found.');
    }
    return res.render(filename);
  });

  router.post('/signup', function(req, res, next) {
    if((req.body.email.length <= 50 && req.body.username.length <= 50 && req.body.password.length <= 50) && (req.body.email.length > 0 && req.body.username.length > 0 && req.body.password.length > 0))
    {
      db.collection('users').findOne({'email': req.body.email}, function(err, email) {
        if(email)
        {
          return res.status(200).send({success: false, message: 'E-mail invalid.'})
        }
        db.collection('users').findOne({'username': req.body.username}, function(err, user) {
          if(user)
          {
            return res.status(200).send({success: false, message: 'This username has already been taken.'});
          }
          bcrypt.hash(req.body.password, 12, function(err, hash) {
            if(err)
            {
              throw new Error(err);
            }
            var randomKey = '';
            for (var i=0; i<20; i++)
            {
              randomKey += validKeyCharacters.charAt(Math.floor(Math.random()*validKeyCharacters.length));
            }
            var newUser = {
              'username': req.body.username,
              'password': hash,
              'nickname': req.body.username,
              'key': randomKey,
              'email': req.body.email,
              'verified': false
            };
            db.collection('users').insert(newUser, function(err, result) {
              var mailOptions = {
                from: '"Garbage House Swagministrator" <swagmin@garbage.house>',
                to: req.body.email,
                subject: 'Garbage House Chat Account Created',
                text: 'Thanks for signing up!\nPlease verify your account using this link:\nhttp://chat.garbage.house/verify?username=' + req.body.username + '&key=' + randomKey
              };
              transporter.sendMail(mailOptions);
            });
          });
          return res.status(200).send({success: true, redirect: 'login', message: 'Successfully signed up.'});
        });
      });
    }
    else
    {
      return res.status(200).send({success: false, message: 'All fields must be between 1 and 50 (inclusive) characters long.'});
    }
  });

  router.post('/verify', function(req, res, next) {
    if(req.body.username.length <= 50 && req.body.key.length == 20)
    {
      db.collection('users').findOne({'username':req.body.username}, function(err, user) {
        if(err)
        {
          throw new Error(err);
        }
        if(!user)
        {
          return res.status(200).send({forwardedAlerts: [{message: 'Wrong key or username.', class: 'fail'}]});
        }
        if(user.key != req.body.key)
        {
          return res.status(200).send({forwardedAlerts: [{message: 'Wrong key or username.', class: 'fail'}]});
        }
        db.collection('users').updateOne({
          'username': user.username
        }, {
          $set: {
            'verified': true
          }
        },
        function(err, result) {
          return res.status(200).send({forwardedAlerts: [{message: 'Successfully verified. You may log in now.', class: 'success'}]});
        });
      });
    }
    else
    {
      return res.status(200).send({forwardedAlerts: [{message: 'Verification URL was malformed.', class: 'fail'}]});
    }
  });

  router.post('/login', function(req, res, next) {
    passport.authenticate('login', function(err, user, info) {
      if (err)
      {
        return next(err);
      }
      if (!user)
      {
        return res.status(200).send(info);
      }
      req.logIn(user, function(err) {
        if (err)
        {
          return next(err);
        }
        return res.status(200).send(info);
      });
    })(req, res, next);
  });

  router.post('/isAuthenticated', function(req, res, next) {
    return res.status(200).send(req.isAuthenticated());
  });

  router.post('/getNickname', function(req, res, next) {
    if (req.isAuthenticated())
    {
      db.collection('users').findOne({'username': req.session.passport.user.username}, function(err, result) {
        return res.status(200).send(result.nickname);
      });
    }
    else {
      return res.status(401).send('');
    }
  });

  router.get('/keepAlive', function(req, res, next) {
    return res.status(200).send('kept alive');
  });

  router.get('/logout', function(req, res, next) {
    req.logout();
    return res.redirect('/');
  });

  router.all('*', function(req, res, next) {
    return res.render('layout');
  });

  return router;
}
