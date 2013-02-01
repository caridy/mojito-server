/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint anon:true, nomen:true, node:true*/

'use strict';

function yui(config) {
    if (!yui.config) {
        yui.config = config || {};
        // initialize any special config here.
        // this config could be used by any middleware
        // during the runtime.
    } else {
        console.warn('multiple attemps to set the ' +
                'configuration for `yui(config)` ' +
                'middleware. Only the first attemp will ' +
                'be honored.');
    }
    return yui;
}

yui.cdn = function (req, res, next) {
    // set yui to run from cdn in the client side
    next();
};

yui.local = function (req, res, next) {
    // todo: set YUI to from local server in the client side
    req.yui = req.yui || {};
    req.yui.config = req.yui.config || {};

    // TODO: this seems to be a one time operation, why
    // are we doing it on every request?
    req.yui.config.base = "/static/yui/";
    req.yui.config.root = "/static/yui/";
    req.yui.config.comboBase = "/combo~";
    req.yui.config.comboSep = "~";
    next();
};

/**
 * var mojito = require('mojito-server');
 * app.use(mojito.yui({...configs...}).cdn);
 **/

module.exports = yui;