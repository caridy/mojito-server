/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true, nomen: true*/

var express    = require('express'),
    expose     = require('express-expose'),
    methods    = ['get'];

// -- Utilites -----------------------------------------------------------------

function extend(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
        var key;

        if (!source) { return; }

        for (key in source) {
            if (source.hasOwnProperty(key)) {
                obj[key] = source[key];
            }
        }
    });

    return obj;
}

// -- Mojito Server -----------------------------------------------------------

function mojito(config) {
    var app = express();

    // getting mojito.locals ready is a one time operation
    mojito.locals  = app.locals.mojito || {};
    mojito.plugins = [];

    // setting app locals
    config = app.locals({
        mojito: mojito.config(config)
    });

    mojito.configure(app, config);
    mojito.bind(app, config);

    return (mojito.app = app);
}

mojito.configure = function (app, config) {

    app.configure(function () {

        app.set('port', process.env.PORT || 8666);
        // TODO: resolve the app name from pkg.json if it
        //       is not hard coded.
        app.set('name', config.appName || 'app');

        app.use(express.cookieParser());
        app.use(express.bodyParser());
        app.use(express.errorHandler());

    });

    app.configure('development', function () {

        app.set('port', process.env.PORT || config.appPort || 8666);

        app.set('view options', {
            pretty: true
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
};

mojito.bind = function (app, config) {
    var original = {},
        routes = {};

    function exposeRoutesCallback(req, res, next) {
        res.locals.routes = routes;
        next();
    }

    // taking control over app[VERB]()
    methods.forEach(function (method) {
        original[method] = app[method];
        app[method] = function (path) {
            var callbacks,
                dispatcher,
                result,
                route,
                i;

            // honoring the dual role of app.get() from express
            if ('get' === method && 1 === arguments.length) {
                return this.set(path);
            }

            // mixing a generic callback to expose the routes, plus
            // the specific route callbacks.
            callbacks = [].concat([exposeRoutesCallback], [].slice.call(arguments, 1));

            // executing the original app[method] but augmenting the
            // callback list if needed.
            result = original[method].apply(app, [path].concat(callbacks));

            for (i = 0; i < callbacks.length; i += 1) {
                if (callbacks[i] && callbacks[i].dispatcher) {
                    // this route has a dispatcher routine associated
                    // to it, and that's all we really need to know.
                    dispatcher = callbacks[i].dispatcher;
                    break;
                }
            }

            if (dispatcher && dispatcher[0]) {
                // getting a handle on the internal routes and adding
                // it to the collection that will be exposed into the client
                // in a form of a group
                route  = app.routes[method][app.routes[method].length - 1];
                routes[method] = routes[method] || {};
                routes[method][dispatcher[0]] = {
                    path    : route.path,
                    keys    : route.keys,
                    regex   : route.regexp.toString(),
                    dispatch: dispatcher
                };
            } else {
                console.warn('Skipping route [' + path + '] that does not ' +
                        'rely on `mojito.dispatch()` as part of the ' +
                        'callbacks, which means it cannot be exposed ' +
                        'to the client side.');
            }

            return result;
        };
    });

    return this;
};

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
        res.render(404);
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
        res.send(500);
        return;
    }

    if (req.accepts('json')) {
        res.send({error: '500 Internal Server Error'});
        return;
    }

    res.type('txt').send('Internal Server Error');
};

mojito.dispatcher = function (name, dispatcher) {
    var defaultEngine = this.app.set('dispatch engine');

    this.dispatchers = this.dispatchers || {};
    if (dispatcher && dispatcher.dispatch) {
        this.dispatchers[name] = dispatcher;
    } else {
        throw new Error('Invalid dispatcher: ' + name);
    }

    if (!defaultEngine) {
        // making the first entry the default dispatch engine
        this.app.set('dispatch engine', name);
    }
    return this;
};

mojito.plug = function (mod) {

    if (!this.plugins) {
        throw new Error('mojito() should happens before.');
    }

    // if config is a function that means they are just trying
    // mojitize an extension, otherwise we just create the app.
    if ('function' === typeof mod && mod.name) {
        // registering the plugin
        this[mod.name] = mod;
        this.plugins.push(mod.name);
    } else {
        throw new Error('Invalid extension');
    }
    return this;
};

/* dispatch integration routine */
mojito.dispatch = function (name, options) {
    var self = this;

    options = options || {};

    if (options.dispatcher && !this.dispatchers[options.dispatcher]) {
        throw new Error('Invalid dispatch engine [' + options.dispatcher +
            '] for mojito.dispatch("' + name + '")');
    }

    function callback(req, res, next) {
        var app  = self.app,
            engine  = options.dispatcher || self.app.set('dispatch engine'),
            mainTag = options.mainTag || 'body',
            queue = [],
            plugin,
            i;

        function dequeue() {
            var q = queue.shift();
            if (q && q.fn) {
                // executing the plugin expose method with
                // the proper context, we don't want to be
                // invasive.
                q.fn.apply(q.context, [req, res, dequeue]);
            } else {
                next.apply(this, arguments);
            }
        }

        // adding mojito expose into the queue
        queue.push({
            context: self,
            fn: self.expose
        });

        // adding mojito helpers into the queue
        queue.push({
            context: self,
            fn: self.helpers
        });

        if (self.plugins && self.plugins.length > 0) {
            // adding plugins into the queue
            for (i = 0; i < self.plugins.length; i += 1) {
                plugin = self.plugins[i];
                if (self[plugin] && self[plugin].expose) {
                    queue.push({
                        context: self[plugin],
                        fn: self[plugin].expose
                    });
                }
            }
        }

        // adding dispatch routine into the queue
        queue.push({
            context: self,
            fn: function (req, res, next) {

                console.log('Dispatching logical piece [' + name +
                        '] using dispatch engine [' + engine + ']');

                var api = {
                    redirect: function (path, code) {
                        this.dispatched = true;
                        res.redirect(path, code);
                    },
                    notFound: function () {
                        this.dispatched = true;
                        self.notFound(req, res, next);
                    },
                    expose: function () {
                        var args = [].slice.call(arguments);
                        // hack to add support to .toJSON that
                        // it is not available yet in express-expose
                        if (args[0] && args[0].toJSON) {
                            args[0] = args[0].toJSON();
                        }
                        // just piping api.expose with res.expose.
                        res.expose.apply(res, args);
                    },
                    error: function (err) {
                        this.dispatched = true;
                        next(err);
                    },
                    done: function (data, meta) {
                        if (api.dispatched) {
                            // this means we don't really need to do much, probably
                            // because api.redirect or api.notFound was triggered before.
                            // TODO: why?
                            return;
                        }
                        // flagging the dispatch engine
                        this.dispatched = true;

                        data = data || {};

                        if (res.locals.view.helpers) {
                            extend(res.locals.helpers, res.locals.view.helpers);
                            // TODO: partials should be allow here too
                        }

                        if (options.json) {
                            res.send(data);
                            return;
                        } else if (typeof data === 'string') {
                            // assume data is just a HTML fragment
                            data = (extend({}, options)[mainTag] = data);
                        } else {
                            // data is an object and should be merged with
                            // options before rendering it, that way
                            // dispatcher has a little bit of control over
                            // the data we sent to the view engine.
                            data = extend({}, options, data);
                        }

                        // if req is asking for json, and we are not blocking
                        // it by setting options.json=false, we should send
                        // the json structure even though it might holds the
                        // fragment as mainTag.
                        if (req.accepts('json') && (options.json === false)) {
                            res.send({error: '500 Internal Server Error'});
                            return;
                        }

                        // hack until handlebars adds support for #each help
                        var i;
                        for (i in res.locals.data) {
                            if (res.locals.data.hasOwnProperty(i)) {
                                if (res.locals.data[i] && res.locals.data[i].toJSON) {
                                    data[i] = res.locals.data[i].toJSON();
                                } else {
                                    data[i] = res.locals.data[i];
                                }
                            }
                        }

                        // rendering the view selected during the dispatch process
                        res.render(res.locals.view.name || name, data);
                    }
                };

                self.dispatchers[engine].dispatch(name, extend({
                    query:  req.query,
                    params: req.params,
                    url:    req.url
                }, options), res.locals, api);
            }
        });

        // rock and roll
        dequeue();

    }

    // adding dispatcher signature into the callback
    // with the list of arguments in case we need to
    // dispatch this route in a different runtime.
    callback.dispatcher = [].slice.call(arguments);

    return callback;

};

mojito.data = function (name) {
    var entries = [].slice.call(arguments);

    return function (req, res, next) {
        var i;
        res.locals.data = res.locals.data || {};

        for (i = 0; i < entries.length; i += 1) {
            if (entries[i] && req[entries[i]]) {
                res.locals.data[entries[i]] = req[entries[i]];
            }
        }
        next();
    };
};

mojito.config = function (config) {
    var locals = this.locals;

    if (!locals) {
        throw new Error('mojito() should happens before.');
    }

    if (!locals.mojito) {
        locals.mojito = {};
    }
    if (config) {
        extend(locals.mojito, config);
    }
    return locals.mojito;
};

mojito.expose = function (req, res, next) {
    var i,
        data = {};

    res.expose(this.config(), 'mojito.config');

    // TODO: move these to their own package
    res.expose(res.locals.routes || {}, 'mojito.routes');

    // Data structures are more complex in a sense that they can
    // be models, in which case we should try to transform them
    // into a JSON object to be stringified later on.
    data = res.locals.data ? extend({}, res.locals.data) : {};
    for (i in data) {
        if (data.hasOwnProperty(i) && data[i] && data[i].toJSON) {
            data[i] = data[i].toJSON();
        }
    }
    res.expose(data, 'mojito.data');

    next();
};

mojito.helpers = function (req, res, next) {
    var routes  = res.locals.routes  || {},
        helpers = res.locals.helpers || {};

    helpers.pathTo = function (name, context) {
        var regexPathParam = /([:*])([\w\-]+)?/g,
            route = (typeof routes === 'object' ? routes : mojito.routes).get[name],
            path,
            keys;

        if (!route) { return ''; }

        context = context || this;
        path = route.path;
        keys = route.keys.map(function (key) { return key.name; });

        if (context && keys.length) {
            if (context._isYUIModel) {
                context = context.getAttrs(keys);
            }

            keys.forEach(function (key) {
                var regex = new RegExp('[:*]' + key + '\\b');
                path = path.replace(regex, context[key]);
            });
        }

        // Replace missing params with empty strings.
        return path.replace(regexPathParam, '');
    };

    // exposing helpers
    res.expose(helpers, 'mojito.helpers');
    res.locals.helpers = helpers;
    next();
};

module.exports = mojito;