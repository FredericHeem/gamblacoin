/*global require */
module.exports = function (config) {
    "use strict";
    var log = require('winston');
    var bitcoinManager = require('./../modules/BitcoinManager.js')(config);
    var bitcoinClient = require('./../modules/BitcoinClient.js')(config.bitcoinClient);
    var Bitcoin = {};
    Bitcoin.getInfo = function (req, res) {
        bitcoinClient.getInfo(function (err, info) {
            if (err) {
                log.error(err);
                res.send(err);
            } else {
                res.send(info);
            }
        });
    };

    Bitcoin.listAccounts = function (req, res) {
        bitcoinClient.listAccounts(function (err, account) {
            if (err) {
                log.error(err);
                res.send(err);
            } else {
                res.send(account);
            }
        });
    };

    return Bitcoin;
};