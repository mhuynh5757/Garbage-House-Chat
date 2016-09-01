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

  router.get('/', function(req, res, next) {
    return res.render('layout');
  });

  router.get('/home', function(req, res, next) {
    return res.render('home');
  });

  router.post('/home', function(req, res, next) {
    if (req.isAuthenticated())
    {
      return res.status(200).send('chat');
    }
    else
    {
      return res.status(200).send('login');
    }
  });

  router.get('/login', function(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!req.isAuthenticated())
    {
      return res.render('login');
    }
    else
    {
      return res.render('alreadyLoggedIn', {username: req.session.passport.user.nickname});
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
  
  router.get('/signup', function(req, res, next) {
    return res.render('signup');
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
            console.log('generated new user with key: ' + randomKey);
            db.collection('users').insert(newUser, function(err, result) {
              var mailOptions = {
                from: '"Garbage House Swagministrator" <swagmin@garbage.house>',
                to: req.body.email,
                subject: 'Garbage House Chat Account Created',
                text: 'Thanks for signing up!\nPlease verify your account using this link:\nhttp://chat.garbage.house/verify?username=' + req.body.username + '&key=' + randomKey
              };
              transporter.sendMail(mailOptions, function(err, info) {
                return res.status(200).send({success: true, redirect: 'login', message: 'Successfully signed up.'});
              });
            });
          });
        });
      });
    }
    else
    {
      return res.status(200).send({success: false, message: 'All fields must be between 1 and 50 (inclusive) characters long.'});
    }
  });
  
  router.get('/verify', function(req, res, next) {
    if(req.query.username.length <= 50 && req.query.key.length == 20)
    {
      db.collection('users').findOne({'username':req.query.username}, function(err, user) {
        if(err)
        {
          throw new Error(err);
        }
        if(!user)
        {
          return res.redirect('/unauthorized');
        }
        if(user.key != req.query.key)
        {
          return res.redirect('/unauthorized');
        }
        db.collection('users').updateOne({
          'username': user.username
        }, {
          $set: {
            'verified': true
          }
        },
        function(err, result) {
          return res.redirect('/verified');
        });
      });
    }
    else
    {
      return res.redirect('/unauthorized');
    }
  });
  
  router.get('/verified', function(req, res, next) {
    return res.render('verified');
  });
  
  router.get('/chat', function(req, res, next) {
    if (req.isAuthenticated())
    {
      return res.render('chat');
    }
    else
    {
      return res.redirect('/unauthorized');
    }
  });
  
  router.post('/getNickname', function(req, res, next) {
    if (req.isAuthenticated())
    {
      return res.status(200).send(req.session.passport.user.nickname);
    }
    else
    {
      return res.redirect('/unauthorized');
    }
  });
  
  router.post('/setNickname', function(req, res, next) {
    if (req.isAuthenticated())
    {
      return res.status(200).send(req.session.passport.user);
    }
    else
    {
      return res.redirect('/unauthorized');
    }
  });
  
  router.get('/keepAlive', function(req, res, next) {
    return res.status(200).send('kept alive');
  });

  router.get('/unauthorized', function(req, res, next) {
    return res.render('unauthorized');
  });

  router.get('/fail', function(req, res, next) {
    return res.render('fail');
  });

  router.get('/logout', function(req, res, next) {
    req.logout();
    return res.redirect('/');
  });

  return router;
}
