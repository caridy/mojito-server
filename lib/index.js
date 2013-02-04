/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true, nomen: true*/

var express    = require('express'),
    handlebars = require('express3-handlebars');

function mojito(config) {
    var app = express();

    config = config || {};

    app.engine('handlebars', handlebars({
        extname: ".handlebars"
    }));

    app.configure(function () {

        app.set('port', process.env.PORT || 8666);
        // TODO: resolve the app name from pkg.json if it
        //       is not hard coded.
        app.set('name', config.appName || 'app');

        app.use(express.cookieParser());
        app.use(express.bodyParser());
        app.use(express.errorHandler());

        app.set('view engine', 'handlebars');
        app.set('views', __dirname + '/../views');
        app.set('view options', {
            layout: false
        });

    });

    app.configure('development', function () {

        app.set('port', process.env.PORT || config.appPort || 8666);

        app.set('view options', {
            pretty: true,
            layout: false
        });

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

    // setting app locals
    app.locals({
        mojito: config
    });

    return (mojito.app = app);
}

/* grouping all available libs */
mojito.core = require('./core.js');
mojito.yui = require('./yui.js');
mojito.contextualizer = require('./contextualizer.js');
mojito.data = require('./data.js');

/* other basic middlewares */
mojito.lockDownSecurity = function (req, res, next) {
    // Set a few security-related headers.
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
};

/* error handling middleware */
mojito.notFound = function (req, res, next) {
    res.status(404);

    if (req.accepts('html')) {
        // TODO: i18n
        res.render('404', {
            lang: req.context.lang || 'en',
            dir: req.context.dir || 'ltr',
            charset: 'utf-8',
            metas: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                { name: 'apple-mobile-web-app-capable', content: 'yes' }
            ]
        });
        return;
    }

    if (req.accepts('json')) {
        res.send({error: 'Not found.'});
        return;
    }

    res.type('txt').send('Not found.');
};

mojito.internalServerError = function (err, req, res, next) {
    res.status(err.status || 500);

    if (req.accepts('html')) {
        // TODO: i18n
        res.render('500', {
            lang: (req.context && req.context.lang) || 'en',
            dir: (req.context && req.context.dir) || 'ltr',
            charset: 'utf-8',
            metas: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                { name: 'apple-mobile-web-app-capable', content: 'yes' }
            ]
        });
        return;
    }

    if (req.accepts('json')) {
        res.send({error: '500 Internal Server Error'});
        return;
    }

    res.type('txt').send('Internal Server Error');
};

/* dispatch integration routine */
mojito.dispatch = function (id, options) {

    options = options || {};

    return function (req, res, next) {
        var app = mojito.app,
            runtime = {
                req: {
                    query: req.query,
                    params: req.params,
                    context: req.context
                },
                res: {
                    yui: res.locals.yui,
                    mojito: res.locals.mojito,
                    contextualizer: res.locals.contextualizer
                },
                app: {
                    yui: app.locals.yui,
                    mojito: app.locals.mojito,
                    contextualizer: app.locals.contextualizer
                }
            },
            templateData = {
                lang: req.context.lang || 'en',
                dir: req.context.dir || 'ltr',
                charset: 'utf-8',
                metas: [
                    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                    { name: 'apple-mobile-web-app-capable', content: 'yes' }
                ],
                title: res.locals.title || 'something fancy',
                top: 'top fragment',
                bottom: 'bottom fragment',
                yui_config: 'yui_init',
                mojito_env: 'mojito_env',
                mojito_init: 'mojito_init'
            };

        // TODO: rely on dispatcher instead
        templateData[options.mainTag || 'body'] = JSON.stringify(runtime);
        res.render('frame', templateData);

        /*
        mojito.app.locals.dispatcher(id, runtime, function(err, data) {
            var mainTag = options.mainTag || 'body',
                view = options.view || 'frame';

            if (err) {
                res.render(404);
                res.render(500);
                return;
            }

            if (options.json) {
                res.send(data);
                return;
            } else if (data && data[mainTag]) {
                // data is an object and should be merged with
                // templateData before rendering it, that way
                // dispatcher has a little bit of control over
                // the data we sent to the view engine.
                templateData = merge(templateData, data);
            } else {
                // otherwise assume data is just a HTML fragment
                templateData[mainTag] = data;
            }

            // if req is asking for json, and we are not blocking
            // it by setting options.json=false, we should send
            // the json structure even though it might holds the
            // fragment as mainTag.
            if (req.accepts('json') && (options.json !== false)) {
                res.send({error: '500 Internal Server Error'});
                return;
            }

            // the default response is HTML
            res.render(view, templateData);
        });
        */

    };

};

module.exports = mojito;