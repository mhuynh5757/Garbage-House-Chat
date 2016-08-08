var chatApp = angular.module('chatApp', ['ui.router']);

chatApp.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $stateProvider
  .state('home', {
    url: '/',
    controller: 'homeController'
  })
  .state('login', {
    url: '/',
    templateUrl: 'login',
    controller: 'loginController'
  })
  .state('fail', {
    url: '/',
    templateUrl: 'fail'
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
    $http.post('/home')
    .then(function(data) {
      $state.go(data['data'], {}, {location: false});
    },
    function(data) {
      $state.go(data['data'], {}, {location: false});
    });
}]);

chatApp.controller('loginController', ['$scope', '$http', '$state',
function($scope, $http, $state) {
  $scope.submit = function() {
    $http.post('/login', $scope.formData)
    .then(function(data) {
      $state.go(data['data'], {}, {location: false});
    },
    function(data) {
      $state.go(data['data'], {}, {location: false});
    });
  }
}]);

chatApp.controller('chatController', ['$scope', '$http', '$state',
function($scope, $http, $state) {
  var socket = io();
  
  $scope.messages = [];
  socket.on('message', function(msg) {
    $scope.$apply(function() {
      $scope.messages.push(msg);
    });
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
  
  // $scope.logout = function() {
  //   socket.emit('logout');
  // }
  // 
  // socket.on('logged out', function() {
  //   $http.get('/logout').then(function(data) {
  //     $state.go('home', {}, {location: false});
  //   });
  // });
}]);
