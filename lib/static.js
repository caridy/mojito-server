/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true*/

var mojito = require('./index.js');

function staticHandler(config) {
    var locals = this.app && this.app.locals;

    config = config || {};

    if (!locals) {
        console.warn('mojito.static() should happens after mojito() statement.');
    } else if (locals.staticHandler) {
        console.warn('multiple attemps to set the ' +
                'configuration for `mojito.static(config)` ' +
                'middleware. Only the first attemp will ' +
                'be honored.');
    } else {
        // explosing config thru app.locals.data.
        locals({
            staticHandler: config
        });
        // TODO: initialize any special config here.
        // this config could be used by any middleware
        // during the runtime.
    }
    return staticHandler;
}

/**
 * var mojito = require('mojito-server'),
 *     app = mojito();
 * app.use(mojito.static({...configs...}).local);
 **/

module.exports = data;