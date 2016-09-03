var chatApp = angular.module('chatApp', ['ui.router', 'ngAnimate'])
.run(function($rootScope, $window, $state, $animate) {
  function resizeContent() {
    angular.element('.ui-view-wrapper .content').outerHeight(angular.element(window).innerHeight() - angular.element('.header').outerHeight());
  }
  angular.element($window).on('resize', resizeContent);
  $rootScope.$on('$viewContentLoaded', resizeContent);
});

chatApp.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $urlRouterProvider.otherwise('/home');
  $stateProvider
  .state('home', {
    url: '/home',
    controller: 'homeController'
  })
  .state('signup', {
    url: '/signup',
    templateUrl: 'signup',
    controller: 'signupController'
  })
  .state('verified', {
    url: '/verified',
    templateUrl: 'verified',
    controller: 'verifiedController'
  })
  .state('login', {
    url: '/login',
    params: {forwardedAlerts: []},
    templateUrl: 'login',
    controller: 'loginController'
  })
  .state('chat', {
    url: '/chat',
    templateUrl: 'chat',
    controller: 'chatController'
  });
});

chatApp.controller('homeController', ['$scope', '$http', '$state', '$stateParams',
  function($scope, $http, $state, $stateParams) {
    $http.post('/home').then(
    function(response) {
      $state.go(response.data);
    });
  }
]);

chatApp.controller('headerController', ['$window', '$scope', '$rootScope',
  function($window, $scope, $rootScope) {    
    $scope.logout = function() {
      $scope.loggedIn = false;
      $rootScope.$broadcast('logout');
    }
    
    $scope.$on('logged in', function() {
      $scope.loggedIn = true;
    });
    
    $scope.$on('set nickname', function(event, nickname) {
      $scope.current_nickname = nickname;
    });
    
    $scope.showSettings = false;
    $scope.$on('set settings checkbox', function(event, showSettings) {
      $scope.showSettings = showSettings;
    });
    
    $scope.toggleSettings = function() {
      $rootScope.$broadcast('toggle settings');
    }
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
          if (response.data.success == false)
          {
            $scope.alerts.push(response.data.message);
          }
          else
          {
            $state.go(response.data.redirect, {forwardedAlerts: [{message: 'Successfully signed up. Please check your e-mail to verify your account.', class: 'success'}]});
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
      $state.go('login');
    }
  }
]);

chatApp.controller('verifiedController', ['$state',
  function($state) {
    $state.go('login', {forwardedAlerts: [{message: 'Successfully verified. You may log in now.', class: 'success'}]});
  }
]);

chatApp.controller('loginController', ['$scope', '$http', '$state', '$stateParams',
  function($scope, $http, $state, $stateParams) {
    $scope.alerts = [];
    if($stateParams.forwardedAlerts != undefined) {
      if($stateParams.forwardedAlerts.length > 0)
      {
        $scope.alerts = $stateParams.forwardedAlerts;
      }
    }
    
    $scope.login = function() {
      $http.post('/login', $scope.formData).then(
      function(response) {
        if (response.data.authenticated == undefined)
        {
          if (response.data.message === 'Missing credentials')
          {
            $scope.alerts.push({message: response.data.message + '.', class: 'fail'});
          }
          else
          {
            $scope.alerts.push({message: response.data.message, class: 'fail'});
          }
        }
        else
        {
          $state.go(response.data.redirect);
        }
      });
    }
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    }
  }
]);

chatApp.controller('alreadyLoggedInController', ['$templateCache', '$state', '$scope', '$http',
  function($templateCache, $state, $scope, $http) {
    $scope.logout = function() {
      $templateCache.remove('login');
      $http.get('/logout').then(function() {
        $state.go('home');
      });
    }
  }
]);

chatApp.controller('chatController', ['$window', '$timeout', '$rootScope', '$scope', '$http', '$state', '$filter',
  function($window, $timeout, $rootScope, $scope, $http, $state, $filter) {
    $timeout(function() {
      function resizeChatlog() {
        var settingsOverlay = angular.element('#settings-overlay');
        settingsOverlay.outerHeight(angular.element('.chatlog').outerHeight());
        scrollToBottom();
        angular.element('.chatlog-content').perfectScrollbar('update');
        angular.element('.userlist-content').perfectScrollbar('update');
      }
      resizeChatlog();
      angular.element($window).on('resize', resizeChatlog);
      angular.element('.chatlog-content').perfectScrollbar();
      angular.element('.userlist-content').perfectScrollbar();
    });
    
    var socket = io();
    
    angular.element('#text_to_send').focus();
    
    $rootScope.$broadcast('logged in');
    $http.post('/getNickname').then(function(response) {
      $rootScope.$broadcast('set nickname', response.data);
    });
    
    $scope.messages = [];
    socket.emit('initialize');
    socket.on('chatlog', function(chatlog) {
      $scope.$apply(function() {
        var parsedChatlog = [];
        chatlog.forEach(function(msg) {
          parsedChatlog.push({
            'nickname': msg.nickname,
            'message': msg.message,
            'timestamp': $filter('date')(msg.timestamp, 'MM/dd/yyyy hh:mm:ss a'),
            '_time': msg.timestamp
          });
        });
        Array.prototype.unshift.apply($scope.messages, parsedChatlog);
      });
      angular.element('.chatlog-content').perfectScrollbar('update');
      angular.element('.userlist-content').perfectScrollbar('update');
      scrollToBottom();
    });
    
    socket.on('message', function(msg) {
      $scope.$apply(function() {
        var time = Date.now();
        $scope.messages.push({
          'nickname': msg.nickname,
          'message': msg.message,
          'timestamp': $filter('date')(time, 'MM/dd/yyyy hh:mm:ss a'),
          '_time': time
        });
      });
      angular.element('.chatlog-content').perfectScrollbar('update');
      angular.element('.userlist-content').perfectScrollbar('update');
      scrollToBottom();
    });
    
    $scope.users = [];
    socket.on('connected users', function(users) {
      $scope.$apply(function() {
        $scope.users = users;
      });
    });
    
    $scope.nickname_to_send = '';
    $scope.setNickname = function() {
      socket.emit('set nickname', $scope.nickname_to_send);
    }
    
    socket.on('get nickname', function(nickname) {
      $rootScope.$broadcast('set nickname', nickname);
    });
    
    $scope.message_to_send = null; 
    $scope.message = function() {
      socket.emit('message', $scope.message_to_send);
      $scope.message_to_send = null;  
    }
    
    var keepAliveTimer = setInterval(function() {
      $http.get('/keepAlive');
    }, 300000);
    
    $scope.$on('logout', function() {
      $http.get('/logout').then(function() {
        clearInterval(keepAliveTimer);
        socket.disconnect();
        $state.go('login');
      });
    });
    
    $scope.toAutoscroll = true;
    var chatLog = document.getElementById('chatlog');
    var scrollToBottom = function() {
      if($scope.toAutoscroll)
      {
        chatLog.scrollTop = chatLog.scrollHeight;
      }
    }
    
    $scope.showSettings = false;
    $scope.toggleSettings = function() {
      $scope.showSettings = false;
      angular.element('#text_to_send').focus();
      $rootScope.$broadcast('set settings checkbox', false);
    }
    $scope.$on('toggle settings', function() {
      $scope.showSettings = !$scope.showSettings;
      if(!$scope.showSettings)
      {
        angular.element('#text_to_send').focus();
      }
    });
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
