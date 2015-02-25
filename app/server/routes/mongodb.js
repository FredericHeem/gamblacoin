/*global require */
module.exports = function (config, dbClient) {
    "use strict";
    var log = require('winston');
    var MongoDb = {};
    MongoDb.status = function (req, res) {
        var status = "down";
        if (dbClient.status()) {
            status = "up";
        }
        log.info("mongodb/status %s", status);
        res.send({ "status": status });
    };

    MongoDb.connect = function (req, res) {
        log.info("/mongodb/connect");
        dbClient.connect(function (error) {
            var connected = false;
            if (!error) {
                connected = true;
            }
            res.send({ "connected": connected });
        });
    };

    MongoDb.disconnect = function (req, res) {
        log.info("/mongodb/disconnect");
        dbClient.disconnect(function () {
            res.send({ "disconnected": true });
        });
    };

    return MongoDb;
};