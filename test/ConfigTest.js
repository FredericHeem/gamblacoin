/*global require*/
module.exports = function () {
    "use strict";
    var konphyg = require('konphyg')('./test/ConfigTest');
    var configAll = konphyg.all();
    var config = configAll.config;
    return config;
};