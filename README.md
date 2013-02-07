### Mojito Server Component

`mojito-server` component groups a series of `connect` and
`express`-like middleware that will be used when a `mojito()`
app is created, but they can also be used directly just like
any `express` middleware. As a result, they will augment `req`
object with data that might be used by `mojito-dispatch`
engine or any other compatible engine.

### Usage

```
/*jslint node:true, nomen: true*/

'use strict';

var mojito = require('mojito-server'),
    app = mojito({
        foo: 'mojito'
    });

// mojitizing extensions so they can be available thru mojito.*
mojito.plug(require('mojito-yui'));
mojito.plug(require('mojito-contextualizer'));

mojito.contextualizer({
    more: 'configs here',
    dimensions: { /* can should be coming from locator */
        lang: {
            "en-US": null
        },
        speed: {
            dialup: null,
            dsl: null
        }
    }
});

// registering a fake `dispatch engine`.
mojito.dispatcher('mojito', {
    dispatch: function (name, options, runtime, callback) {
        callback(null, JSON.stringify({
            name: name,
            options: options,
            runtime: runtime
        }));
    }
});

app.configure('development', function () {
    mojito.yui({
        combine: false,
        debug: true,
        filter: "debug"
    });
    // you can also use a custom version of YUI by
    // specifying a custom path as a second argument,
    // or by installing yui at th app level using npm:
    // mojito.yui({
    //     combine: false,
    //     debug: true,
    //     filter: "debug"
    // }, __dirname + '/node_modules/yui/');

    // serving YUI from local server
    app.use(mojito.yui.local({
        // overruling any default config provided by mojito.yui.cdn()
        // routine by passing a new value. E.g:
        // comboSep: '~'
    }));
});

app.configure('production', function () {
    mojito.yui({
        combine: true,
        debug: false,
        filter: "min"
    });

    // serving YUI from CDN directly
    app.use(mojito.yui.cdn());

    // Set a few security-related headers.
    // X-Content-Type-Options=nosniff
    // X-Frame-Options=SAMEORIGIN
    app.use(mojito.lockDownSecurity);
});

// we could drive this by dimensions automatically by using
// `app.use(mojito.contextualizer.all())` which matches contextualizer.* and
// dimensions.*, so by hanging a middleware from contextualizer
// you are automatically enabling a new dimension to be populated;
app.use(mojito.contextualizer.all);
// or manually like this:
// app.use(mojito.contextualizer.lang);
// app.use(mojito.contextualizer.device);

// mojito will use dispatcher config to dispatch "index"
app.get('/', mojito.dispatch('index'));

mojito.exposeRoutes(function () {
    // these are all the routes that our client side will be able to
    // dispatch without a fullpage refresh, `mojito.dispatch()` is
    // required. The grouping helps with apps with different pages
    // where each page represents an app in the client side.
    app.get('/photo', mojito.dispatch('photo', {
        json: true
    }));

    // you can have route specific middleware,
    // and you can also add group specific middleware
    // by passing them into `mojito.exposeRoutes()`
    app.get('/photos', mojito.data('place'),
            mojito.dispatch('photos'));
});

// Error handlers
app.use(mojito.notFound);
app.configure('production', function () {
    app.use(mojito.internalServerError);
});

// listening
app.listen(app.get('port'), function () {
    console.log("Server listening on port " +
        app.get('port') + " in " + app.get('env') + " mode");
});
```
