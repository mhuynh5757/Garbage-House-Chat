var mongodb = require('mongodb');
var url = require('./dbURL.js');

mongodb.MongoClient.connect(url, function(err, db) {
  if(err)
  {
    throw new Error(err);
  }
  else
  {
    var _server = require('./server.js')(db);
    var io = require('socket.io')(_server.server);
    
    var connected_users = [];
    function update_users() {
      connected_users = [];
      Object.keys(io.sockets.sockets).forEach(function (key) {
        if (connected_users.indexOf(io.sockets.sockets[key].request.session.passport.user) < 0)
        {
          connected_users.push(io.sockets.sockets[key].request.session.passport.user);
        }
      });
      io.emit('connected users', connected_users);
    }
    
    io.use(function(socket, next) {
      _server.sessionMiddleware(socket.request, {}, next);
    });

    io.on('connection', function(socket) {
      if(socket.request.session.passport != undefined)
      {
        update_users();
        
        socket.on('disconnect', function() {
          update_users();
        });
        
        socket.on('message', function(msg) {
          if (!(msg === null || msg === '')) {
            io.emit('message', socket.request.session.passport.user + ': ' + msg);
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
