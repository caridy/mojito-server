var express = require('express');

/* grouping all available libs */
mojito = {

    core: require('./core.js'),

    yui: require('./yui.js'),

    contextualizer: require('./contextualizer.js'),

    data: require('./data.js'),

    createServer: function (config) {
        var app = express();

        config = config || {};

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

        return (mojito.app = app);

    },

    dispatch: function (id) {

        // TODO: warm up the dispatch engine for "id"

        return function (req, res, next) {

            res.send({
                query: req.query,
                params: req.params,
                context: req.context,
                locals: req.locals,
                mojito: req.mojito,
                yui: mojito.yui.config,
                contextualizer: mojito.contextualizer.config
            });
            // TODO: dispatch id

        };

    }

};

module.exports = mojito;