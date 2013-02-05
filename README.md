### Experimental repo for Mojito Server component on top of Express

`mojito-server` component groups a series of `connect` and `express`-like middleware that
will be used when a `mojito()` app is created, but they can also be used directly just like
any `express` middleware. As a result, they will augment `req` object with data that might
be used by `mojito-dispatch` engine or any other compatible engine.

### Usage

```
/*jslint node:true, nomen: true*/

'use strict';

var mojito = require('mojito-server'),
    app = mojito({
        dispatcher: {}, /* require('mojito-dispatcher') ? */
        locator:    {}, /* require('mojito-locator') ? */
        foo: 'mojito'
    }),
    contextualizer = mojito.contextualizer({
        foo: 'context',
        dimensions: {}  /* can this come from locator? */
    });

// plugging mojito meta into req and res by default
app.use(mojito.core);

app.configure('development', function () {
    app.use(mojito.yui({
        combine: false,
        debug: true,
        filter: "debug"
    }).local());

    // you can also use a custom version of YUI by
    // specifying a custom path as a second argument,
    // or by installing yui at th app level using npm:
    // app.use(mojito.yui({
    //     combine: false,
    //     debug: true,
    //     filter: "debug"
    // }, __dirname + '/node_modules/yui/').local();

});

app.configure('production', function () {
    app.use(mojito.yui({}).cdn());
    // Set a few security-related headers.
    // X-Content-Type-Options=nosniff
    // X-Frame-Options=SAMEORIGIN
    app.use(mojito.lockDownSecurity);
});

// we could drive this by dimensions automatically,
// or manually like this:
app.use(contextualizer.lang);
app.use(contextualizer.device);

// mojito will use dispatcher config to dispatch "index"
app.get('/', mojito.dispatch('index'));

mojito.exposeRoutes(function () {
    // these are all the routes that our client side will be able to
    // dispatch without a fullpage refresh, `mojito.dispatch()` is
    // required. The grouping helps with apps with different pages
    // where each page represents an app in the client side.
    app.get('/photo', mojito.dispatch('photo'));

    // you can have route specific middleware,
    // and you can also add group specific middleware
    // by passing them into `mojito.exposeRoutes()`
    app.get('/photos', function (req, res, next) { next(); },
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
