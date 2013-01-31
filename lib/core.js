/**
 * var mojito = require('mojito-server');
 * app.use(mojito.core);
 **/

module.exports = function (req, res, next) {
    // TODO: if mojito.core is part of the chain,
    // we should prepare req and res in preparation
    // for the mojito dispatch
    if (!req.mojito) {
        req.mojito = req.mojito || {};
        req.mojito.version = "todo: collect mojito version from pkg";
    } else {
        console.warn('Attemp to set `req.mojito` object ' +
                'before `mojito.core` middleware gets executed.');
    }
    next();
};