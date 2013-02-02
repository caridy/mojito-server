/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true*/

var mojito = require('./index.js');

function yui(config) {
    var locals = this.app && this.app.locals;

    config = config || {};

    if (!locals) {
        console.warn('mojito.yui() should happens after mojito() statement.');
    } else if (locals.yui) {
        console.warn('multiple attemps to set the ' +
                'configuration for `mojito.yui(config)` ' +
                'middleware. Only the first attemp will ' +
                'be honored.');
    } else {
        // explosing config thru app.locals.
        locals({
            yui: config
        });
        // TODO: initialize any special config here.
        // this config could be used by any middleware
        // during the runtime.
    }
    return yui;
}

yui.cdn = function (req, res, next) {
    // set yui to run from cdn in the client side
    next();
};

yui.local = function (req, res, next) {
    // TODO: this seems to be a one time operation, why
    // are we doing it on every request?
    res.locals({
        yui: {
            base: "/static/yui/",
            root: "/static/yui/",
            comboBase: "/combo~",
            comboSep: "~"
        }
    });
    next();
};

/**
 * var mojito = require('mojito-server'),
 *     app = mojito();
 * app.use(mojito.yui({...configs...}).cdn);
 **/

module.exports = yui;