var chatApp = angular.module('chatApp', ['ui.router', 'ngAnimate'])
.run(function($rootScope, $window, $state, $animate) {
  function resizeContent() {
    angular.element('.ui-view-wrapper .content').outerHeight(angular.element(window).innerHeight() - angular.element('.header').outerHeight());
    angular.element('.content').perfectScrollbar();
  }
  angular.element($window).on('resize', resizeContent);
  $rootScope.$on('$viewContentLoaded', resizeContent);
});

chatApp.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise('/login');
  $stateProvider
  .state('signup', {
    url: '/signup',
    templateUrl: '/views/signup',
    controller: 'signupController'
  })
  .state('verify', {
    url: '/verify?username=&key=',
    controller: 'verifyController'
  })
  .state('login', {
    url: '/login',
    params: {forwardedAlerts: []},
    templateUrl: '/views/login',
    controller: 'loginController'
  })
  .state('chat', {
    url: '/chat',
    templateUrl: '/views/chat',
    controller: 'chatController'
  });
});

chatApp.controller('headerController', ['$window', '$scope', '$rootScope',
  function($window, $scope, $rootScope) {
    $scope.loggedIn = false;

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
  }
]);

chatApp.controller('verifyController', ['$state', '$stateParams', '$http',
  function($state, $stateParams, $http) {
    $http.post('/verify', $stateParams).then(function(response) {
      $state.go('login', response.data);
    });
  }
]);

chatApp.controller('loginController', ['$scope', '$http', '$state', '$stateParams',
  function($scope, $http, $state, $stateParams) {
    var allowLogin = false;
    $http.post('/isAuthenticated').then(function(response) {
      if(response.data) {
        $state.go('chat');
      }
      else {
        allowLogin = true;
      }
    });

    $scope.alerts = [];
    if($stateParams.forwardedAlerts != undefined) {
      if($stateParams.forwardedAlerts.length > 0)
      {
        $scope.alerts = $stateParams.forwardedAlerts;
      }
    }

    $scope.login = function() {
      if (allowLogin) {
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
    }

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
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

        angular.element('.content').perfectScrollbar('destroy');
      }
      resizeChatlog();
      angular.element($window).on('resize', resizeChatlog);
      angular.element('.chatlog-content').perfectScrollbar({'wheelSpeed':2});
      angular.element('.userlist-content').perfectScrollbar();
    });

    var socket = io();

    angular.element('#text_to_send').focus();

    $rootScope.$broadcast('logged in');
    $http.post('/getNickname').then(function(response) {
      $rootScope.$broadcast('set nickname', response.data);
    });

    $scope.messages = [];
    function addMessage(arr, msg) {
      if (arr.length > 0) {
        if (msg.nickname === arr[arr.length - 1].nickname && (msg.timestamp - arr[arr.length - 1]._time)/60000 < 30) {
          return arr[arr.length - 1].message.push(msg.message);
        }
      }
      var message = {
        'nickname': msg.nickname,
        'message': [msg.message],
        '_time': msg.timestamp
      }
      var today = new Date();
      today.setHours(0);
      today.setMinutes(0);
      today.setSeconds(0);
      if ((today - msg.timestamp)/(1000 * 60 * 60 * 24) > 0) {
        message.timestamp = $filter('date')(msg.timestamp, 'MM/dd/yyyy hh:mm:ss a');
      }
      else {
        message.timestamp = $filter('date')(msg.timestamp, 'hh:mm:ss a');
      }
      return arr.push(message);
    }

    socket.emit('initialize');
    socket.on('chatlog', function(chatlog) {
      var parsedChatlog = [];
      $scope.$apply(function() {
        chatlog.forEach(function(msg) {
          addMessage(parsedChatlog, msg);
        });
        Array.prototype.unshift.apply($scope.messages, parsedChatlog);
      });
      angular.element('.chatlog-content').perfectScrollbar('update');
      angular.element('.userlist-content').perfectScrollbar('update');
      scrollToBottom();
    });

    socket.on('message', function(msg) {
      $scope.$apply(function() {
        addMessage($scope.messages, msg);
      });
      angular.element('.chatlog-content').perfectScrollbar('update');
      angular.element('.userlist-content').perfectScrollbar('update');
      scrollToBottom();
    });

    function updateTimestamps() {
      $scope.$apply(function() {
        var today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        $scope.messages.forEach(function(message) {
          if ((today - message._time)/(1000 * 60 * 60 * 24) > 0) {
            message.timestamp = $filter('date')(message._time, 'MM/dd/yyyy hh:mm:ss a');
          }
          else {
            message.timestamp = $filter('date')(message._time, 'hh:mm:ss a');
          }
        });
      });
      setInterval(updateTimestamps, 1000 * 60 * 60);
    }

    var future = new Date();
    future.setHours(future.getHours() + 1);
    future.setMinutes(0);
    future.setSeconds(0);
    future.setMilliseconds(0);
    setInterval(updateTimestamps, future - Date.now());

    $scope.online_users = [];
    $scope.offline_users = [];
    socket.on('connected users', function(users) {
      $scope.$apply(function() {
        $scope.online_users = [];
        $scope.offline_users = [];
        users.forEach(function(user) {
          if (user.online) {
            $scope.online_users.push(user.nickname);
          }
          else {
            $scope.offline_users.push(user.nickname);
          }
        });
        $scope.online_users.sort();
        $scope.offline_users.sort();
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
        clearInterval()
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
