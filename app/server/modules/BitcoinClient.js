/*global require*/
module.exports = function (config) {
    "use strict";
    var bitcoin = require('bitcoin');
    var log = require('winston');

    log.info("bitcoin client: " + config.hostname + ":" + config.port);
    var client = new bitcoin.Client({
        host: config.hostname,
        port: config.port,
        user: config.username,
        pass: config.password
    });

    return client;
};
