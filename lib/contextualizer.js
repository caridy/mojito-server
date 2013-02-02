/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true*/

var mojito = require('./index.js'),

    OPERA_MINI = 'opera-mini',
    IPHONE = 'iphone',
    IPAD = 'ipad',
    ANDROID = 'android',
    IE_MOBILE = 'iemobile',
    PALM = 'palm',
    KINDLE = 'kindle',
    BLACKBERRY = 'blackberry',

    // _device
    REGEX_OPERA_MINI = /opera mini/i,
    REGEX_IPHONE = /ipod|iphone/i,
    REGEX_IPAD = /ipad/i,
    REGEX_ANDROID = /android/i,
    REGEX_IE_MOBILE = /iris|3g_t|windows ce|opera mobi|windows ce; smartphone;|windows ce; iemobile/i,
    REGEX_PALM = /pre\/|palm os|palm|hiptop|avantgo|fennec|plucker|xiino|blazer|elaine/i,
    REGEX_KINDLE = /kindle/i,
    REGEX_BLACKBERRY = /blackberry/i,

    // _language
    REGEX_ACCEPT_LANGUAGE = / *, */,
    REGEX_LANGUAGE_MATCH = /^([a-z]+)-([a-z]+)$/,

    DEFAULT_LANG   = 'en',
    DEFAULT_DEVICE = '';

function basicDeviceDetection(ua) {

    // TODO: [Issue 74] Remove regex creation within this function scope,
    // and eventually offload to device catalog
    if (REGEX_OPERA_MINI.test(ua)) {
        return OPERA_MINI;
    }
    if (REGEX_IPHONE.test(ua)) {
        return IPHONE;
    }
    if (REGEX_IPAD.test(ua)) {
        return IPAD;
    }
    if (REGEX_ANDROID.test(ua)) {
        return ANDROID;
    }
    if (REGEX_IE_MOBILE.test(ua)) {
        return IE_MOBILE;
    }
    if (REGEX_PALM.test(ua)) {
        return PALM;
    }
    if (REGEX_KINDLE.test(ua)) {
        return KINDLE;
    }
    if (REGEX_BLACKBERRY.test(ua)) {
        return BLACKBERRY;
    }

}

function basicLangDetection(al) {

    al = (al || '').trim();

    if (!al) {
        return;
    }

    var list = al.split(REGEX_ACCEPT_LANGUAGE), // accept-language value can have spaces
        chosen,
        matches;

    if (!list[0].length) { // split always returns an array
        return;
    }

    chosen = list[0];

    // some useragents send "en-us" instead of the more-correct
    // "en-US" (FF3.8.13)
    matches = chosen.match(REGEX_LANGUAGE_MATCH);
    if (matches) {
        chosen = matches[1] + '-' + matches[2].toUpperCase();
    }

    return chosen;
}

function contextualizer(config) {
    var locals = this.app && this.app.locals;

    config = config || {};

    if (!locals) {
        console.warn('mojito.contextualizer() should happens after mojito() statement.');
    } else if (locals.yui) {
        console.warn('multiple attemps to set the ' +
                'configuration for `mojito.contextualizer(config)` ' +
                'middleware. Only the first attemp will ' +
                'be honored.');
    } else {
        // explosing config thru app.locals.
        locals({
            contextualizer: config
        });
        // TODO: initialize any special config here.
        // this config could be used by any middleware
        // during the runtime.
    }
    return contextualizer;
}

contextualizer.jurisdiction = function (req, res, next) {
    req.context = req.context || {};
    // TODO: better detection of the jurisdiction
    req.context.jurisdiction = req.query.jurisdiction || '';
    next();
};

contextualizer.tz = function (req, res, next) {
    req.context = req.context || {};
    // TODO: better detection of the timezone
    req.context.tz = req.query.tz || '';
    next();
};

contextualizer.lang = function (req, res, next) {
    req.context = req.context || {};
    // todo: better detection leveraging express
    req.context.lang =
        req.query.lang ||
        basicLangDetection(req.headers['accept-language']) ||
        DEFAULT_LANG;
    next();
};

contextualizer.device = function (req, res, next) {
    req.context = req.context || {};
    // TODO: [Issue 86] add configuration switch to detect device
    req.context.device =
        req.query.device ||
        basicDeviceDetection(req.headers['user-agent']) ||
        DEFAULT_DEVICE;
    next();
};

contextualizer.region = function (req, res, next) {
    req.context = req.context || {};
    // TODO: better detection of the region
    req.context.region = req.query.region || '';
    next();
};

/**
 * var mojito = require('mojito-server'),
 *     app = mojito();
 * app.use(mojito.contextualizer({...configs...}).device);
 **/

module.exports = contextualizer;