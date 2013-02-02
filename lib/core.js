/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true*/

/**
 * var mojito = require('mojito-server'),
 *     app = mojito();
 * app.use(mojito.core);
 **/

module.exports = function (req, res, next) {
    // TODO: if mojito.core is part of the chain,
    // we should prepare req and res in preparation
    // for the mojito dispatch

    if (res.locals.mojito) {
        console.warn('`res.locals.mojito is already set before the ' +
                '`mojito.core` middleware gets executed.');
    }

    // TODO: what else should we include in mojito structure at the `res` level?
    res.locals({
        mojito: {
            version: "todo: collect mojito version from pkg"
        }
    });

    next();
};