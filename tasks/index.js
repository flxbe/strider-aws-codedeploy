'use strict';
const async = require('async');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');


/**
 * Configure the plugin-tasks.
 *
 * @param {Object} config
 * @returns {Object} {{prepare: {Function} prepare, deploy: {Function} deploy}}
 */
exports.configure = function(config) {
  return {


    prepare: function(context, done) {
      async.waterfall([

        async.apply(validateConfig, config, context),
        async.apply(initializeAWS, config, context),
        async.apply(deleteArtifact, config, context)

      ], done);
    },


    deploy: function(context, done) {
      context.comment('Start deployment ...');

      async.waterfall([

        async.apply(createArtifact, config, context),
        async.apply(deployToAWS, config, context)

      ], function(err) {
        if(!err) context.comment('Deployment successful');
        done(err);
      });
    }

  };

};


/**
 * Evaluate the config object and fill in additional config data
 *
 * @param {Object} config
 * @param {Object} context
 * @param {Function} callback
 */
function validateConfig(config, context, callback) {
  if(!config) return callback('config undefined');

  if(!config.applicationName) return callback('application-name is undefined');
  if(!config.deploymentGroup) return callback('deployment-group is undefined');
  if(!config.s3Bucket) return callback('s3-bucket is undefined');
  if(!config.region) return callback('region is undefined');
  if(!config.sourcePath) return callback('the source-path is undefined');

  // fill config with computed properties
  config.buildDirectory = 'aws_build';
  config.artifactName = `${config.applicationName}_${config.deploymentGroup}_strider_artifact.zip`;
  config.artifactPath = path.join(config.buildDirectory, config.artifactName);
  config.absArtifactPath = path.join(context.dataDir, config.artifactPath);

  callback();
}


/**
 * Initialize the AWS-SDK
 *
 * @param {Object} config
 * @param {Object} context
 * @param {Function} callback
 */
function initializeAWS(config, context, callback) {
  AWS.config.region = config.region;

  // configure the credential provider chain
  const awsCredentials = config.awsCredentials;
  const providers = [];

  if(awsCredentials) {
    const mode = awsCredentials.mode;

    // set explicit credentials, if there are any
    if(( mode === 'explicit' || mode === 'standard' ) && awsCredentials.explicit) {
      providers.push(function () {
        return new AWS.Credentials(config.awsCredentials.explicit);
      });
    }

    // set shared credentials profile or zero
    if(mode === 'shared' || mode === 'standard') {
      providers.push(function () {
        return new AWS.SharedIniFileCredentials(config.awsCredentials.shared);
      });
    }

    // set environment credentials profile or zero
    if(mode === 'environment' || mode === 'standard') {
      providers.push(function () {
        return new AWS.EnvironmentCredentials(config.awsCredentials.environment);
      });
    }

    AWS.CredentialProviderChain.defaultProviders = providers;
  }

  // search for credentials
  const providerChain = new AWS.CredentialProviderChain();
  providerChain.resolve(function(err, credentials) {
    if(err) return callback(err);

    AWS.config.credentials = credentials;
    callback();
  });
}


/**
 * Deploy the revision to AWS
 *
 * @param config
 * @param context
 * @param callback
 */
function deployToAWS(config, context, callback) {
  context.comment('Deploy to AWS ...');

  // aws service interfaces
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const codedeploy = new AWS.CodeDeploy({apiVersion: '2014-10-06'});

  async.waterfall([

    // load artifact to s3
    function(callback) {

      const stream = fs.createReadStream(config.absArtifactPath);

      if(!stream) return callback('artifact not found');

      var params = {Bucket: config.s3Bucket, Key: config.artifactName, Body: stream};
      s3.upload(params, callback);

    },

    // create new deployment from revision
    function(s3Object, callback) {
      const deployParams = {
        applicationName: config.applicationName,
        deploymentGroupName: config.deploymentGroup,
        revision: {
          revisionType: 'S3',
          s3Location: {
            bucket: config.s3Bucket,
            bundleType: 'zip',
            eTag: s3Object.ETag,
            key: config.artifactName
            //version: 'STRING_VALUE'
          }
        },
        description: 'Deployment via strider'
      };

      // deploy revision
      codedeploy.createDeployment(deployParams, callback);
    },

    // monitor deployment
    function(deployment, callback) {
      context.log(deployment);
      monitorDeployment(context, codedeploy, deployment, callback);
    },

    // evaluate deployment result
    function(deployment, callback) {
      context.log(deployment);
      if(deployment.status === 'Succeeded') callback();
      else callback(deployment.errorInformation);
    }

  ], callback);
}


/**
 * Periodically request the deployment status and print it to the strider console.
 * Return as soon as the jon is finished.
 *
 * @param {Object} context
 * @param {Object} codedeploy
 * @param {Object} params
 * @param {Function} callback
 */
function monitorDeployment(context, codedeploy, params, callback) {
  const refresh = function() {
    codedeploy.getDeployment(params, function(err, result) {
      if(err) return callback(err);

      const deploymentInfo = result.deploymentInfo || {};

      printDeploymentUpdate(context, deploymentInfo);

      switch(deploymentInfo.status) {
        // restart timeout
      case 'Created':
      case 'Queued':
      case 'InProgress':
        setTimeout(refresh, 2000);
        break;

      default:
        return callback(null, deploymentInfo);
      }
    });
  };

  refresh();
}


/**
 * Print the deployment-status
 *
 * @param {Object} context
 * @param {Object} deployment
 */
function printDeploymentUpdate(context, deployment) {
  context.comment(`Status: ${deployment.status}`);
  if(deployment.errorInformation) {
    context.comment(`Error: ${deployment.errorInformation.message}`);
  }
}


/**
 * Bundle the build artifact.
 *
 * @param {Object} config
 * @param {Object} context
 * @param {Function} callback
 */
function createArtifact(config, context, callback) {
  context.comment('Bundle aws artifact ...');

  async.waterfall([

    // create build directory
    function (callback) {
      context.cmd(`mkdir ${config.buildDirectory}`, () => callback());
    },

    // create the aws artifact
    function (callback) {
      var command = `zip ${config.artifactPath} ${config.sourcePath}` +
        ' --recurse-paths' +
        ` --exclude ${config.buildDirectory}/*`;

      if(config.excludeString) command = command + ` ${config.excludeString}`;
      if(config.quietBuild) command = command + ' --quiet';

      context.cmd(command, () => callback());
    }

  ], callback);
}


/**
 * Delete an old build-directory.
 *
 * @param {Object} config
 * @param {Object} context
 * @param {Function} callback
 */
function deleteArtifact(config, context, callback) {
  context.comment('Delete old artifact ...');
  context.cmd(`rm -r ${config.buildDirectory}`, function() {callback();});
}
