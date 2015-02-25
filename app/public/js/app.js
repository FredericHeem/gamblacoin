// Filename: app.js
define(['jquery', 'underscore', 'backbone', 'bootstrap', 'marionette', 'vent', 'router', 'accounting' // Require
], function ($, _, Backbone, Bootstrap, Marionette, vent, Router, Accounting) {
    "use strict";
    console.log("app.js");

    var AmountFormaterOptions = {
        symbol: "",
        thousand: ",",
        precision: 1,
        format: "%v"
    };

    Accounting.formatUBTC = function (amountSatoshi, precision) {
        var options = AmountFormaterOptions;
        if (precision) {
            options.precision = precision;
        } else {
            options.precision = 2;
        }
        return Accounting.formatMoney(amountSatoshi / 100000, options);
    };

    var App = new Backbone.Marionette.Application();

    App.addRegions({
        mainRegion: "#main-content",
        navigationRegion: "#usernav"
    });

    App.on('start', function (options) {
        Router.initialize({});

    });

    $.ajaxSetup({
        cache: false,
        statusCode: {
            401: function () {
                console.error("401, Not Authorized");
                vent.trigger("ajaxError", 401);
            },
            403: function () {
                console.error("403, Access denied");
                vent.trigger("ajaxError", 403);
            }
        }
    });
    return App;
    
});