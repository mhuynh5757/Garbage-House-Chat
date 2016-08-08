module.exports = function(db) {
  var express = require('express');
  var router = express.Router();

  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;

  var bcrypt = require('bcrypt');

  passport.use('login', new LocalStrategy(function(username, password, done) {
    if(username.length <= 20 && password.length <= 20)
    {
      db.collection('users').findOne({'username': username}, function(err, user) {
        if(!user)
        {
          return done(null, false);
        }
        bcrypt.compare(password, user.password, function(err, res) {
          if(err)
          {
            throw new Error(err);
          }
          if(!res)
          {
            return done(null, false);
          }
          return done(null, user);
        });
      });
    }
    else
    {
      return done(null, false);
    }
  }));
  
  passport.use('signup', new LocalStrategy({
    passReqToCallback: true
  }, function(req, username, password, done) {
    if(req.body.email.length <= 20 && username.length <= 20 && password.length <= 20)
    {
      db.collections('users').findOne({'username': username}, function(err, user) {
        if(user)
        {
          return done(null, false);
        }
        bcrypt;
      });
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
      return res.status(300).send('chat');
    }
    else
    {
      return res.status(200).send('login');
    }
  });

  router.get('/login', function(req, res, next) {
    if (!req.isAuthenticated())
    {
      return res.render('login');
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
        return res.status(401).send('fail');
      }
      req.logIn(user, function(err) {
        if (err)
        {
          return next(err);
        }
        return res.status(200).send('chat');
      });
    })(req, res, next);
  });
  
  router.get('/signup', function(req, res, next) {
    return res.render('signup');
  })
  
  router.get('/chat', function(req, res, next) {
    if (req.isAuthenticated())
    {
      return res.render('chat', {username: req.user});
    }
    else
    {
      return res.redirect('/unauthorized');
    }
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
