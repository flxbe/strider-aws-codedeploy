const tasks = require('./tasks');
'use strict';




/**
 * strider plugin
 *
 * @type module
 */
module.exports = {
  init: function (config, job, context, callback) {
    callback(null, tasks.configure(config || {}));
	}
};
