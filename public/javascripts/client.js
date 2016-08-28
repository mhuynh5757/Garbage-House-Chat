var chatApp = angular.module('chatApp', ['ui.router']);

chatApp.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $stateProvider
  .state('home', {
    url: '/',
    controller: 'homeController'
  })
  .state('signup', {
    url: '/',
    templateUrl: 'signup',
    controller: 'signupController'
  })
  .state('login', {
    url: '/',
    templateUrl: 'login',
    controller: 'loginController'
  })
  .state('chat', {
    url: '/',
    templateUrl: 'chat',
    controller: 'chatController'
  });
  $locationProvider.html5Mode(true);
});

chatApp.controller('homeController', ['$scope', '$http', '$state',
  function($scope, $http, $state) {
      $http.post('/home').then(
      function(data) {
        $state.go(data['data'], {}, {location: false});
      });
  }
]);

chatApp.controller('signupController', ['$scope', '$http', '$state',
  function($scope, $http, $state) {
    $scope.alerts = [];
    $scope.showPasswordMismatch = false;
    $scope.formData = {};
    $scope.signup = function() {
      if ($scope.formData.password === $scope.formData.repeatPassword)
      {
        $http.post('/signup', $scope.formData).then(
        function(response) {
          if (response.data.authenticated == undefined)
          {
            if (response.data.message === 'Missing credentials')
            {
              $scope.alerts.push(response.data.message + '.');
            }
            else
            {
              $scope.alerts.push(response.data.message);
            }
          }
          else
          {
            $state.go(response.data.redirect, {}, {location: false});
          }
        });
      }
      else
      {
        $scope.showPasswordMismatch = true;
      }
    }
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    }
    
    $scope.comparePasswords = function() {
      if ($scope.formData.password === $scope.formData.repeatPassword)
      {
        $scope.showPasswordMismatch = false;
      }
      else
      {
        $scope.showPasswordMismatch = true;
      }
    }
    
    $scope.getLogin = function() {
      $state.go('login', {}, {location: false});
    }
  }
]);

chatApp.controller('loginController', ['$scope', '$http', '$state',
  function($scope, $http, $state) {
    $scope.alerts = [];
    $scope.login = function() {
      $http.post('/login', $scope.formData).then(
      function(response) {
        if (response.data.authenticated == undefined)
        {
          if (response.data.message === 'Missing credentials')
          {
            $scope.alerts.push(response.data.message + '.');
          }
          else
          {
            $scope.alerts.push(response.data.message);
          }
        }
        else
        {
          $state.go(response.data.redirect, {}, {location: false});
        }
      });
    }
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    }
    
    $scope.getSignup = function() {
      $state.go('signup', {}, {location: false});
    }
  }
]);

chatApp.controller('chatController', ['$scope', '$http', '$state', '$filter',
  function($scope, $http, $state, $filter) {
    var socket = io();
    
    $scope.messages = [];
    socket.on('message', function(msg) {
      $scope.$apply(function() {
        $scope.messages.push({
          'message': msg,
          'timestamp': $filter('date')(new Date(), 'hh:mm:ss a')
        });
      });
      scrollToBottom();
    });
    
    $scope.users = [];
    socket.on('connected users', function(users) {
      $scope.$apply(function() {
        $scope.users = users;
      });
    });
    
    $scope.message_to_send = null; 
    $scope.message = function() {
      socket.emit('message', $scope.message_to_send);
      $scope.message_to_send = null;  
    }
    
    var keepAliveTimer = setInterval(function() {
      $http.get('/keepAlive');
    }, 300000);
    
    $scope.logout = function() {
      $http.get('/logout').then(function() {
        clearInterval(keepAliveTimer);
        socket.disconnect();
        $state.go('home', {}, {location: false});
      });
    }
    
    $scope.toAutoscroll = true;
    var chatLog = document.getElementById('chatlog');
    var scrollToBottom = function() {
      if($scope.toAutoscroll)
      {
        chatLog.scrollTop = chatLog.scrollHeight;
      }
    }
  }
]);

chatApp.directive('autoscroll', function($window) {
  return function($scope, $element, $attrs) {
    var raw = $element[0];
    $element.bind('scroll', function() {
      if (raw.scrollTop + raw.offsetHeight + 1 >= raw.scrollHeight)
      {
        $scope.toAutoscroll = true;
      }
      else
      {
        $scope.toAutoscroll = false;
      }
      $scope.$digest();
    });
  }
});
