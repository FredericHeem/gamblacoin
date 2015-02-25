/*global require */
module.exports = function (config, ioSocket) {
    "use strict";
    var log = require('winston');
    var betManager = require('./../modules/BetManager.js')(config);
    var ioHandler = {};

    var lastTime = new Date();

    function sendLastBets() {
        betManager.getBetsAll("BTC", function (error, bets) {
            if (error) {
                log.error("sendLastBets: " + error);
            } else {
                log.debug("sendLastBets #bets " + bets.length + ", date " + lastTime);
                ioSocket.sockets.emit('betsAll', bets);
                lastTime = new Date();
            }
        }, 1, 12, lastTime);
    }

    setInterval(sendLastBets, 5000);

    ioHandler.connection = function (socket) {
        log.info("ioHandler.connection");
        socket.on('getBetsLast', function () {
            log.info("ioHandler.getBetsLast");
            betManager.getBetsAll("BTC", function (error, bets) {
                log.info("ioHandler.getBetsLast sendLastBets #bets " + bets.length);
                socket.emit('betsAll', bets);
            }, 1, 12);
        });
    };

    
    return ioHandler;
};