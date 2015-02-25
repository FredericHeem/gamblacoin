/*global require*/
module.exports = function () {
    "use strict";
    var konphyg = require('konphyg')(__dirname + '/config_bet');
    var configAll = konphyg.all();
    var config = configAll.config;
    return config;
};