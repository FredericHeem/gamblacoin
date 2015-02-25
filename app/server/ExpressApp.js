/*global require, __dirname*/
module.exports = function (rootDir) {
    "use strict";
    var log = require('./modules/log');
    var express = require('express');
    var http = require('http');
    var app = express();
    var async = require('async');
    var config = require('./Config.js')();
    var configBet = require('./ConfigBet.js')();

    var bitcoinClient = require('./modules/BitcoinClient.js')(config.bitcoinClient);
    bitcoinClient.getInfo();

    var dbClient = require('./modules/DbClient.js')(config);

    app.configure(function () {
    	console.log("configure common");
        app.set('port', config.port || 3000);
        app.set('views', __dirname + '/views');
        app.engine('.html', require('ejs').__express);
        app.set('view engine', 'html');

        app.locals.pretty = true;
        //	app.use(express.favicon());
        app.use(express.bodyParser());
        app.use(express.cookieParser());
        app.use(express.session({ secret: config.session_secret }));
        app.use(express.methodOverride());
        app.use(require('stylus').middleware({ src: rootDir + '/app/public' }));
        
        app.set('ip', "0.0.0.0");
        
        app.use(function (req, res, next) {
            res.locals.session = req.session;
            next();
        });

        app.use(require('connect-assets')({ src: rootDir + '/assets' }));
    });

    app.configure('development', function () {
    	console.log("DEV");
        //app.use(express.logger('dev'));
    	app.use(express.static(rootDir + '/app/public'));
        app.use(express.errorHandler());
    });

    app.configure('production', function () {
        console.log("PRODUCTION");
    	app.use(express.static(rootDir + '/public'));
        app.use(express.errorHandler());
    });
    
    var port = app.get('port');
    var ip = app.get('ip') || "localhost";

    var server = http.createServer(app);

    var io = require('socket.io').listen(server);

    require('./router')(app, io, config, configBet);

    app.start = function (done) {
        async.series([function (callback) {
            server.listen(port, function () {
                log.info("Express server listening on " + ip + ":" + port);
                callback();
            });
        },function (callback) {
            dbClient.connect(callback);
        },function (callback) {
            bitcoinClient.getInfo(function (err, info) {
                if (err){
                    log.error("BitcoinClient " + err);
                } else {
                    log.info("BitcoinClient info " + JSON.stringify(info));
                }
                callback();
            });
            
        }], function (err) {
            if (err){
                log.error("Error starting app: " + err);
            } else {
                log.info("App started");
            }
            if (done) {
                done();
            }
        });
    };

    app.stop = function (done) {
        dbClient.disconnect(function () {
            server.close();
            done();
        });
    };

    return app;
};
