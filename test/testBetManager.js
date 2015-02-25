/*global describe, it, before, after*/
var should = require('should');
var assert = require('assert');
var request = require('supertest');
var mongoose = require('mongoose');
var async = require('async');
var log = require('winston');
var config = require('./../app/server/Config')();
var configTest = require('./ConfigTest.js')();
var User = require("./../app/server/modules/UserModel").User;
var dbClient = require('./../app/server/modules/DbClient.js')(config);
var betManager = require('./../app/server/modules/BetManager.js')(config);
var cryptoUtils = require('./../app/server/modules/CryptoUtils.js')();

describe('BetManager', function () {
    "use strict";

    var user = configTest.user1;
    var username = user.username;
    var email = user.email;
    var password = user.password;

    var userData = {
        username: username,
        email: email,
        password: password
    };

    before(function (done) {
        this.timeout(10000);
        async.series([
            function (callback) {
                dbClient.connect(callback);
            }, function (callback) {
                betManager.removeBets(callback);
                //callback()
            }
        ],
        function (err) {
            assert(!err);
            done();
        });
    });

    after(function (done) {
        async.series([
            function (callback) {
                //betManager.removeBets(callback);
                callback();
            }, function (callback) {
                dbClient.disconnect(done);
                
            }
        ],
        function (err) {
            assert(!err);
            done();
        });
    });

    var getDefaultBetParam = function (currency) {
        var betParam = {
            currency: currency,
            userId: user.userId,
            win: true,
            bet: "100000",
            payout: "2",
            profitLoss: "100000",
            targetNumber: 5000,
            userBalance: "1000000",
            userProfit:  "1000000",
            roll: 4321,
            maxRoll: 10000,
            serverSeedHashNext: cryptoUtils.createRandomString(16),
            clientSeed: cryptoUtils.createRandomString(16),
            serverSeed: cryptoUtils.createRandomString(64),
            betNumberPlayer: 1
        };
        return betParam;
    };

    var betAddAndGet = function (currency, done) {
        var betParam = getDefaultBetParam(currency);
        betManager.addBet(betParam, function (error, betSaved) {
            if (error) {
                console.log(error);
            }
            assert(!error);
            console.log("addBet " + betSaved);
            assert(betSaved.date);
            assert(betSaved.betId);
            betManager.getBetId(currency, betSaved.betId, function (error, bet) {
                assert(!error);
                //console.log("getBetId" + JSON.stringify(bet, null, 4));
                assert(bet.date);
                assert.equal(bet.userId, user.userId);
                done();
            });
        });
    };
    var betAdd = function (betParam, currency, numBet, done) {
        var numBetMax = 1000;
        betManager.addBet(betParam, function (error, betSaved) {
            if (error) {
                console.log(error);
                assert(false);
            }
            
            numBet = numBet + 1;
            if (numBet > numBetMax) {
                betManager.getMyBets(user.userId, currency, function (error, bets) {
                    assert(!error);
                    assert(bets.length);
                    //console.log("#bets " + bets.length);
                    done();
                });
            } else {
                betAdd(betParam, currency, numBet, done);
            }
        });
    };
    describe('BetManager', function () {
        describe('Add', function () {
            it('BetAddBTC', function (done) {
                betAddAndGet("BTC", done);
            });
            it('BetAddBTCMulti', function (done) {
                this.timeout(600000);
                var currency = "BTC";
                var betParam = getDefaultBetParam(currency);
                betAdd(betParam, currency, 0, done);
            });

            it('BetAddPlayCoin', function (done) {
                console.log("BetAddPlayCoin");
                betAddAndGet("PlayCoin", done);
            });
        });

        describe('GetMyBets', function () {
            it('GetMyBetsBTC', function (done) {
                betManager.getMyBets(configTest.username, "BTC", function (error, bets) {
                    assert(!error);
                    done();
                });
            });
            it('GetMyBetsPlayCoin', function (done) {
                betManager.getMyBets(configTest.username, "PlayCoin", function (error, bets) {
                    assert(!error);
                    done();
                });
            });
            it('GetMyBetsInvalidCurrency', function (done) {
                betManager.getMyBets(configTest.username, "InvalidCurrency", function (error, bets) {
                    assert(error);
                    done();
                });
            });

        });
        describe('GetBetsAll', function () {
            it('GetBetsAllBTC', function (done) {
                betManager.getBetsAll("BTC", function (error, bets) {
                    assert(!error);
                    //console.log("GetBetsAllBTC" + bets);
                    done();
                });
            });
            it('GetMyBetsPlayCoin', function (done) {
                betManager.getBetsAll("PlayCoin", function (error, bets) {
                    assert(!error);
                    done();
                });
            });
            it('GetMyBetsInvalidCurrency', function (done) {
                betManager.getBetsAll("InvalidCurrency", function (error, bets) {
                    assert(error);
                    done();
                });
            });

        });
        describe('GetBetId', function () {
            it('GetBetIdInvalid', function (done) {
                betManager.getBetId("BTC", 100000000, function (error, bet) {
                    assert(!error);
                    assert(!bet);
                    done();
                });
            });
        });

        describe('BetStats', function () {
            this.timeout(60000);
            it('BetStatsBTC', function (done) {
                betManager.getBetStats(configTest.username, "BTC", function (error, betStats) {
                    assert(!error);
                    done();
                });
            });
        });
    });
});
