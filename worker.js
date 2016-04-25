'use strict';
const tasks = require('./tasks');


module.exports = {
  init: function (config, job, context, callback) {
    callback(null, tasks.configure(config || {}));
  }
};
