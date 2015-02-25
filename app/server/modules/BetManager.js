/*global require*/
module.exports = function (config) {
    "use strict";
    var log = require('winston');
    var moment = require('moment');
    var mongoose = require('mongoose');
    var async = require('async');
    var bigdecimal = require("bigdecimal");

    var betManager = {};
    var BetBTC = require("./BetModel").BetBTC;
    var BetPlayCoin = require("./BetModel").BetPlayCoin;

    var getBet = function (currency) {
        log.debug("currency %s", currency);
        if (currency === "BTC") {
            return BetBTC;
        } else if (currency === "PlayCoin") {
            return BetPlayCoin;
        } else {
            log.error("getBet, not a know currency");
            return null;
        }
    };

    betManager.addBet = function (betParam, callback) {
        log.debug("addBet " + JSON.stringify(betParam, null, 4));
        var Bet = getBet(betParam.currency);
        if (!Bet) {
            callback("Invalid Currency");
            return;
        }
        var newbet = new Bet(betParam);

        var query = Bet.find({}).sort({ date: -1 }).limit(1);
        query.execFind(function (error, bets) {
            if (error) {
                log.error("addBet cannot query least bet: " + error);
                callback(error);
            } else {
                var lastBet = bets[0];
                var bdBetAmount = bigdecimal.BigDecimal(newbet.bet);
                var bdProfitLoss = bigdecimal.BigDecimal(newbet.profitLoss);

                log.debug("addBet last bet: " + JSON.stringify(lastBet, null, 4));
                if (lastBet) {
                    newbet.bankProfit = bigdecimal.BigDecimal(lastBet.bankProfit).subtract(bdProfitLoss).toString();
                    newbet.totalBetAmount = bigdecimal.BigDecimal(lastBet.totalBetAmount).add(bdBetAmount).toString();
                } else {
                    newbet.bankProfit = bigdecimal.BigDecimal("0").subtract(bdProfitLoss).toString();
                    newbet.totalBetAmount = bdBetAmount.toString();
                }

                log.debug("addBet " + JSON.stringify(newbet, null, 4));

                newbet.save(function (error, betSaved) {
                    if (error) {
                        log.error("addBet cannot save: " + error);
                        callback(error);
                    } else {
                        callback(null, betSaved);
                    }
                });
            }
        });
    };

    betManager.getMyBets = function (userId, currency, callback, page, pageSize) {
        log.debug("getMyBets userId %s, currency %s", userId, currency);
        var Bet = getBet(currency);
        if (!Bet) {
            callback("Invalid Currency");
            return;
        }

        if (!page || page < 1) {
            page = 1;
        }
        if (!pageSize) {
            pageSize = 1000;
        }
        var query = Bet.find({ userId: userId }).sort({ date: -1 }).skip((page - 1) * pageSize).limit(pageSize);
        query.execFind(function (error, bets) {
            if (error) {
                callback(error);
            } else {
                log.info("#bets " + bets.length);
                callback(null, bets);
            }
        });
    };

    betManager.getBetsAll = function (currency, callback, page, pageSize, fromDate) {
        var Bet = getBet(currency);
        if (!Bet) {
            callback("Invalid Currency");
            return;
        }

        if (!page || page < 1) {
            page = 1;
        }

        if (!pageSize) {
            pageSize = 15;
        }

        if (!fromDate) {
            fromDate = new Date("2012");
        }

        log.debug("getBetsAll currency %s, page: %s, size: %s, %s", currency, page, pageSize, fromDate);
        var query = Bet.find({ date: { $gte: fromDate } }).sort({ date: -1 }).skip((page - 1) * pageSize).limit(pageSize);
        query.execFind(function (error, bets) {
            if (error) {
                callback(error);
            } else {
                log.debug("geBetsAll #bets " + bets.length);
                callback(null, bets);
            }
        });
    };

    betManager.getBetStats = function (username, currency, callback) {
        log.info("getBetStats username %s, currency %s", username, currency);
        var Bet = getBet(currency);
        Bet.aggregate([{
            $group: {
                _id: null,
                total: {
                    $sum: "$profitLoss"
                }
            }
        }], function (err, result) {
            if (err) {
                log.error("getBetStats: " + err);
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    betManager.getBetId = function (currency, betId, callback) {
        log.debug("getBetId currency %s, betId %s", currency, betId);
        var Bet = getBet(currency);
        if (!Bet) {
            callback("Invalid currency");
            return;
        }
        Bet.findOne({ betId: betId }, function (err, bet) {
            if (err) {
                log.error("getBetId %s", err);
                callback(err);
            } else {
                log.debug("getBetId: " + bet);
                callback(null, bet);
            }
        });
    };

    betManager.removeBets = function (callback) {
        log.info("removeBets");
        
        async.series([
            function (callback) {
                BetBTC.remove({}, function (err) {
                    callback();
                });
            },
            function (callback) {
                BetPlayCoin.remove({}, function (err) {
                    callback();
                });
            }
        ], function (err) {
            callback(err);
        });
    };

    return betManager;
};
