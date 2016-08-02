var chatApp = angular.module('chatApp', ['ngRoute']);

chatApp.config(function($routeProvider, $locationProvider) {
  $routeProvider
  .when('/', {
    templateUrl: 'home'
  })
  .when('/login', {
    templateUrl: 'login'
  })
  .when('/chat', {
    templateUrl: 'chat'
  })
  .when('/fail', {
    templateUrl: 'fail'
  });
  
  $locationProvider.html5Mode(true);
});

// chatApp.controller('loginController', ['$scope', '$http', '$location',
// function($scope, $http, $location) {
//   $scope.submit = function() {
//     $http.post('/login', $scope.formData)
//     .success(function(data) {
//       if (data === 'success')
//       {
//         $location.path('chat');
//       }
//       else
//       {
//         $location.path('fail');
//       }
//     })
//     .error(function(data) {
//       console.log(data);
//     });
//   }
// }]);
