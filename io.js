var mongodb = require('mongodb');
var url = process.env.MONGODB_URI;

mongodb.MongoClient.connect(url, function(err, db) {
  if(err)
  {
    throw new Error(err);
  }
  else
  {
    var _server = require('./server.js')(db);
    
    var io = require('socket.io')(_server.server);
    
    var connected_nicknames = [];
    function update_users() {
      var connected_users = [];
      Object.keys(io.sockets.sockets).forEach(function (key) {
        var _user = io.sockets.sockets[key].request.session.passport;
        if (_user != undefined)
        {
          connected_users.push(_user.user.username);
        }
      });
      db.collection('users').find({'username': {$in: connected_users}}, function(err, result) {
        if(result)
        {
          connected_nicknames = [];
          result.toArray().then(function(docs) {
            docs.forEach(function(doc) {
              if(connected_nicknames.indexOf(doc.nickname) < 0)
              {
                connected_nicknames.push(doc.nickname);
              }
            });
            io.emit('connected users', connected_nicknames);
          });
        }
      });
    }
    
    io.use(function(socket, next) {
      _server.sessionMiddleware(socket.request, {}, next);
    });

    io.on('connection', function(socket) {
      if(socket.request.session.passport != undefined)
      {
        db.collection('chatlog').find({}, function(err, result) {
          result.toArray().then(function(docs) {
            socket.emit('chatlog', docs);
          });
        });
        update_users();
        
        socket.on('disconnect', function() {
          update_users();
        });
        
        socket.on('set nickname', function(nickname) {
          socket.request.session.reload(function(err) {
            db.collection('users').updateOne(
            {
              'username':socket.request.session.passport.user.username
            }, {
              $set: {
                'nickname': nickname
              }
            }, function(err, result) {
              update_users();
              Object.keys(io.sockets.sockets).forEach(function (key) {
                var _user = io.sockets.sockets[key].request.session.passport;
                if (_user != undefined)
                {
                  if(_user.user.username === socket.request.session.passport.user.username)
                  {
                    io.sockets.sockets[key].emit('get nickname', nickname);
                  }
                }
              });
            });
          });
        });
        
        socket.on('message', function(msg) {
          if (!(msg === null || msg === '')) {
            db.collection('users').findOne({'username': socket.request.session.passport.user.username}, function(err, result) {
              io.emit('message', {nickname: result.nickname, message: msg});
              db.collection('chatlog').insert({'timestamp': Date.now(), 'nickname': result.nickname, 'message': msg}, function(err, result) {
                db.collection('chatlog').count().then(function(res) {
                  if (res > 500) {
                    db.collection('chatlog').deleteOne({});
                  }
                });
              });
            });
          }
        });
      }
      else
      {
        socket.disconnect();
      }
    });
  }
});
