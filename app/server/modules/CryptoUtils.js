/*global require*/
module.exports = function (config, bitcoinClient) {
    "use strict";
    //console.log("CryptoUtils.js");
    var crypto = require('crypto');
    var cryptoUtils = {};

    cryptoUtils.createRandomString = function (size) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < size; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;

    };



    return cryptoUtils;
};