/*global require*/
module.exports = function (config) {
    "use strict";
    var log = require('winston');
    var mongoose = require('mongoose');
    var dbClient = {};
    var configDb = config.db;
    var dbOptions = {
        db: {},
        user: config.username,
        pass: config.password,
        server: {
            auto_reconnect: true,
            socketOptions: {
                connectTimeoutMS: 30000
            }
        }
    };

    dbClient.connect = function (callback) {
        var uri = "mongodb://" + configDb.hostname + ":" + configDb.port + "/" + configDb.dbName;
        log.info("db connect: " + uri);
        //mongoose.set('debug', true);

        mongoose.connection.on('error', function (err) {
            log.error('db connection error: ' + err);
        });

        mongoose.connection.on('disconnected', function () {
            log.error('db disconnected');
        });

        var db = mongoose.connect(uri, dbOptions, function (err) {
            if (err) {
                log.error("Connected to db KO: " + err);
                if (callback) {
                    callback(err);
                }
            } else {
                log.info("Connected to db OK");
                if (callback) {
                    callback(null);
                }
            }
        });
    };

    dbClient.disconnect = function (callback) {
        log.info("disconnect: ");
        mongoose.connection.close(function () {
            mongoose.connection.removeAllListeners();
            if (callback) {
                callback();
            }
        });
    };

    dbClient.status = function (callback) {
        var status = mongoose.connection.readyState;
        //console.log("AccountManager status: " + status);
        return status;
    };
    
    return dbClient;
};
