var express = require('express');
var router = express.Router();

var passport = require('passport');

router.get('/', function(req, res, next) {
  res.render('layout');
});

router.get('/home', function(req, res, next) {
  res.render('home');
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.post('/login', passport.authenticate('login', {
  successRedirect: '/chat',
  failureRedirect: '/fail'
}));

router.get('/chat', function(req, res, next) {
  if (req.isAuthenticated())
  {
    res.render('chat', {username: req.user});
  }
  else
  {
    res.redirect('/fail');
  }
});

router.get('/fail', function(req, res, next) {
  res.render('fail');
});

router.get('/logout', function(req, res, next) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
