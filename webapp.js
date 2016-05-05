module.exports = {
  config: {

    // possible aws credentials
    awsCredentials: {
      mode: { type: String, default: 'Standard' },

      shared: String,

      explicit: {
        accessKeyId: String,
        secretAccessKey: String
      },

      environment: String

    },

    // artifact creation
    sourcePath: String,
    excludeString: String,
    quietBuild: { type: Boolean, default: true },

    // deployment variables
    applicationName: String,
    deploymentGroup: String,
    s3Bucket: String,
    region: String
  }
};
