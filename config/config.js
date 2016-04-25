'use strict';


/**
 * Standard plugin controller
 */
app.controller('AWSCodeDeployController', ['$scope', function ($scope) {
  $scope.saving = false;

  $scope.$watch('configs[branch.name].aws_codedeploy.config', function (value) {
    $scope.config = value;
  });

  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('aws_codedeploy', $scope.config, function () {
      $scope.config.exclude = $scope.config.excludeString
        ? $scope.config.excludeString.split(' ')
        : null;
      $scope.saving = false;
    });
  };
}]);
