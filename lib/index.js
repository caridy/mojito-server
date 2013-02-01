var express = require('express');

/* grouping all available libs */
mojito = function (config) {
    var app = express();

    config = config || {};

    mojito.config = config;

    app.configure(function(){

        app.set('port', process.env.PORT || 8666);
        // TODO: resolve the app name from pkg.json if it
        //       is not hard coded.
        app.set('name', config.appName || 'app');

        app.use(express.cookieParser());
        app.use(express.bodyParser());
        app.use(express.errorHandler());
    });

    app.configure('development', function(){

        app.set('port', process.env.PORT || config.appPort || 8666);

        app.use(express.responseTime());

        app.use(express.logger({
            format: 'dev'
            // a more advanced log
            // format: ":date -- :remote-addr :method :url :status " +
            //         ":response-time /ncookie::req[cookie]"
        }));

        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack     : true
        }));
    });

    app.configure('production', function () {

        app.disable('x-powered-by');

        if (app.enabled('gzip')) {
            app.use(express.compress());
        }

    });

    return (mojito.app = app);
};

mojito.core = require('./core.js');
mojito.yui = require('./yui.js');
mojito.contextualizer = require('./contextualizer.js');
mojito.data = require('./data.js');

mojito.lockDownSecurity = function (req, res, next) {
    // Set a few security-related headers.
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
};

mojito.dispatch = function (id) {

    // TODO: warm up the dispatch engine for "id"

    return function (req, res, next) {

        res.send({
            query: req.query,
            params: req.params,
            context: req.context,
            locals: req.locals,
            mojito: req.mojito,
            yui: req.yui,
            // global settings
            globals: {
                mojito: mojito.config,
                yui: mojito.yui.config,
                contextualizer: mojito.contextualizer.config
            }
        });
        // TODO: dispatch id

    };

};

module.exports = mojito;