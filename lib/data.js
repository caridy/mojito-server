/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true*/

var mojito = require('./index.js');

function data(config) {
    var locals = this.app && this.app.locals;

    config = config || {};

    if (!locals) {
        console.warn('mojito.data() should happens after mojito() statement.');
    } else if (locals.yui) {
        console.warn('multiple attemps to set the ' +
                'configuration for `mojito.data(config)` ' +
                'middleware. Only the first attemp will ' +
                'be honored.');
    } else {
        // explosing config thru app.locals.data.
        locals({
            data: config
        });
        // TODO: initialize any special config here.
        // this config could be used by any middleware
        // during the runtime.
    }
    return data;
}

/**
 * var mojito = require('mojito-server'),
 *     app = mojito();
 * app.use(mojito.data({...configs...}).rest);
 **/

module.exports = data;