/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true, nomen: true*/

var express    = require('express'),
    handlebars = require('express3-handlebars'),
    methods    = ['get'];

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

mojito.dispatcher = function (name, dispatcher) {
    var defaultEngine = mojito.app.set('dispatch engine');

    mojito.dispatchers = mojito.dispatchers || {};
    if (dispatcher && dispatcher.dispatch) {
        mojito.dispatchers[name] = dispatcher;
    } else {
        throw new Error('Invalid dispatcher: ' + name);
    }

    if (!defaultEngine) {
        // making the first entry the default dispatch engine
        mojito.app.set('dispatch engine', name);
    }
    return mojito;
};

mojito.exposeRoutes = function (fn) {
    var groupCallbacks = [].slice.call(arguments),
        app = mojito.app,
        original = {},
        group = {},
        exposeGroupCallback = function (req, res, next) {
            res.locals({
                routes: group
            });
            next();
        };

    fn = groupCallbacks.pop();

    if (app) {

        // taking control over app[VERB]()
        methods.forEach(function (method) {
            original[method] = app[method];
            app[method] = function (path) {
                var routes = app.routes[method],
                    callbacks,
                    dispatcher,
                    data = [],
                    result,
                    route,
                    i;

                // mixing a generic callback to expose the routes within
                // the matching group to the client side, plus all the
                // groupCallbacks passed thru mojito.exposeRoutes(), plus
                // the specific route callbacks.
                callbacks = [].concat([exposeGroupCallback], groupCallbacks, [].slice.call(arguments, 1));

                // executing the original app[method] but augmenting the
                // callback list if needed.
                result = original[method].apply(app, [path].concat(callbacks));

                for (i = 0; i < callbacks.length; i += 1) {
                    if (callbacks[i]) {
                        if (callbacks[i].dispatcher) {
                            // this route has a dispatcher routine associated
                            // to it, and that's all we really need to know.
                            dispatcher = callbacks[i].dispatcher;
                        }
                        if (callbacks[i].data) {
                            // this route has a some data structure definition
                            // associated to it, and it should be exposed
                            data.push(callbacks[i].data);
                        }
                    }
                }

                if (dispatcher) {
                    // getting a handle on the internal routes and adding
                    // it to the collection that will be exposed into the client
                    // in a form of a group
                    route  = routes[routes.length - 1];
                    group[method] = group[method] || {};
                    group[method][path] = {
                        path    : route.path,
                        keys    : route.keys,
                        regex   : route.regexp.toString(),
                        dispatch: dispatcher
                    };
                    if (data.length > 0) {
                        group[method][path].data = data;
                    }
                } else {
                    console.warn('Skipping route [' + path + '] that does not ' +
                            'rely on `mojito.dispatch()` as part of the ' +
                            'callbacks, which means it cannot be exposed ' +
                            'to the client side.');
                }

                return result;
            };
        });

        // exposing routes within the callback
        fn();

        // restoring the original app[VERB]()
        methods.forEach(function (method) {
            app[method] = original[method];
        });

    } else {

        console.error('Trying to use `mojito.exposeRoutes()` with ' +
                'a server that is not a mojito server. ' +
                'Make sure you use `var app = mojito();` instead.');

    }

    original = null;

    return mojito;
};

mojito.plug = function (mod) {
    // if config is a function that means they are just trying
    // mojitize an extension, otherwise we just create the app.
    if ('function' === typeof mod && mod.name) {
        mojito[mod.name] = mod;
    } else {
        throw new Error('Invalid extension');
    }
    return mojito;
};

/* dispatch integration routine */
mojito.dispatch = function (name, options) {

    options = options || {};

    if (options.dispatcher && !mojito.dispatchers[options.dispatcher]) {
        throw new Error('Invalid dispatch engine [' + options.dispatcher +
            '] for mojito.dispatch("' + name + '")');
    }

    var callback = function (req, res, next) {
        var app     = mojito.app,
            runtime = {
                req: {
                    query: req.query,
                    params: req.params,
                    context: req.context
                },
                res: {
                    yui: res.locals.yui,
                    mojito: res.locals.mojito,
                    routes: res.locals.routes,
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
            },
            engine  = options.dispatcher || mojito.app.set('dispatch engine'),
            mainTag = options.mainTag || 'body',
            view    = options.view || 'frame';


        console.log('Dispatching logical piece [' + name +
                '] using dispatch engine [' + engine + ']');

        mojito.dispatchers[engine].dispatch(name, options, runtime, function (err, data) {

            if (err) {
                next(err);
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
                templateData = mojito.merge(templateData, data);
            } else {
                // otherwise assume data is just a HTML fragment
                templateData[mainTag] = data;
            }

            // if req is asking for json, and we are not blocking
            // it by setting options.json=false, we should send
            // the json structure even though it might holds the
            // fragment as mainTag.
            console.log(req.accepts('json'), options.json);
            if (req.accepts('json') && (options.json === false)) {
                res.send({error: '500 Internal Server Error'});
                return;
            }

            // the default response is HTML
            res.render(view, templateData);
        });

    };

    // adding dispatcher signature into the callback
    // with the list of arguments in case we need to
    // dispatch this route in a different runtime.
    callback.dispatcher = [].slice.call(arguments);

    return callback;

};

mojito.data = function (name, options) {

    var callback = function (req, res, next) {
        res.locals.data = res.locals.data || {};
        // attaching data definition into res
        res.locals.data[name] = options;
    };

    // adding data signature into the callback
    // with the list of arguments in case we need to
    // instantiate this data structure in a different runtime.
    callback.data = [].slice.call(arguments);

    return callback;
};

/**
 * Merge object b with object a.
 *
 *     var a = { foo: 'bar' }
 *       , b = { bar: 'baz' };
 *
 *     utils.merge(a, b);
 *     // => { foo: 'bar', bar: 'baz' }
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 * @api private
 */
mojito.merge = function (a, b) {
    var key;
    if (a && b) {
        for (key in b) {
            a[key] = b[key];
        }
    }
    return a;
};

module.exports = mojito;