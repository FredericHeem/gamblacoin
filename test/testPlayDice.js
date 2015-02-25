/*global describe, it, before, after, beforeEach, afterEach */
/* jslint node: true */
var winston = require('winston');

var expressApp = require('./../app/server/ExpressApp.js')(__dirname + "/../");
var should = require('should');
var assert = require('assert');
var request = require('supertest');
var mongoose = require('mongoose');
var async = require('async');
//var winston = require('winston');
var config = require('./../app/server/Config')();
var configTest = require('./ConfigTest.js')();
var accountManager = require('./../app/server/modules/AccountManager.js')(config);
var User = require("./../app/server/modules/UserModel").User;
var dice = require("./../app/server/modules/Dice")();
var crypto = require('crypto');
var bigdecimal = require("bigdecimal");

describe('Dice', function () {
    "use strict";
    var timeout = 10000;
    var cookie;
    var accountInfo;
    var url = config.url;

    var user = configTest.user1;
    var username = user.username;
    var email = user.email;
    var password = user.password;

    var clientSeed = configTest.clientSeed;
    var betNumber = 0;
    var profile = user;

    var login = function (profile, callback) {
        request(url).post('/login').send(profile).expect(200).end(function (err, res) {
            if (err) {
                callback(err);
            } else {
                cookie = res.headers['set-cookie'];
                assert(!res.body.error);
                accountInfo = res.body;
                callback(null);
            }
        });
    };

    var logout = function (profile, callback) {
        request(url).del('/logout').set('cookie', cookie).send(profile)
            .expect(200).end(function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
                var cookieLogout = res.headers['set-cookie'];
                assert.notEqual(cookieLogout[0].indexOf("user=;"), -1);
                assert.notEqual(cookieLogout[1].indexOf("pass=;"), -1);
            });
    };

    before(function (done) {
        this.timeout(timeout);
        expressApp.start(done);
    });

    after(function (done) {
        this.timeout(timeout);
        async.series([function (callback) {
            accountManager.resetUser(profile, callback);
        }, function (callback) {
            expressApp.stop(callback);
        }], function (err) {
            assert(!err);
            done();
        });
    });

    beforeEach(function (done) {
        this.timeout(timeout);
        async.series([function (callback) {
            accountManager.resetUser(profile, callback);
        }, function (callback) {
            accountManager.updateReceivedUnconfirmed(profile.username, "BTC", "100000000", "100000000", callback);
        },
        function (callback) {
            login(profile, callback);
        }], function (err) {
            assert(!err);
            done();
        });
    });

   
    afterEach(function (done) {
        this.timeout(timeout);
        async.series([function (callback) {
            logout(profile, callback);
        }, function (callback) {
            accountManager.resetUser(profile, callback);
        }], function (err) {
            assert(!err);
            done();
        });
    });

    var playUntillNoFund = function (url, cookie, done) {
        var profile = {
            bet: '10000000',
            payout: '10',
            currency: 'BTC',
            clientSeed: clientSeed
        };
        request(url)
            .post('/play').set('cookie', cookie).send(profile)
            .expect('Content-Type', /json/)
            .expect(200).end(function (err, res) {
                if (err) {
                    throw err;
                }
                if (res.body.error) {
                    assert.equal(res.body.error.text, "Insuffucient fund");
                    done();
                    return;
                }
                betNumber = res.body.betNumber;
                //if ((+betNumber) % 10 == 0) {
                console.log("bet number: " + betNumber +
                    ", balance: " + res.body.balance);
                //}
                playUntillNoFund(url, cookie, done);
            });
    };

    var play = function (cookie, betProfile, callback) {
        request(url).post('/play').set('cookie', cookie).send(betProfile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    assert(!err);
                    callback(res.body);
                });
    };

    var playUntillWin = function (url, cookie, nbWin, done) {
        var profile = {
            bet: '10000',
            payout: '10000',
            currency: 'PlayCoin',
            clientSeed: clientSeed
        };
        var nbWinMax = 1;
        request(url)
            .post('/play').set('cookie', cookie).send(profile)
            .expect('Content-Type', /json/)
            .expect(200).end(function (err, res) {
                if (err) {
                    throw err;
                }
                if (res.body.error) {
                    done();
                    return;
                }
                betNumber = res.body.betNumber;
                if (!res.body.win) {
                    playUntillWin(url, cookie, nbWin, done);
                } else {
                    console.log("bet number: " + betNumber +
                    ", balance: " + res.body.balance);
                    if (nbWin >= nbWinMax) {
                        done();
                    } else {
                        playUntillWin(url, cookie, nbWin + 1, done);
                    }
                }
            });
    };

    var checkGame = function (playResponse) {
        console.log("checkGame " + JSON.stringify(playResponse));
        //console.log("checkGame accountInfo " + JSON.stringify(accountInfo));
        var serverSeed = playResponse.serverSeed;
        //Check server hash
        assert(serverSeed);
        assert(playResponse.betId);
        assert(playResponse.clientSeed);
        assert(playResponse.currency);
        assert(playResponse.userBalance);
        assert(playResponse.bankProfit);

        assert.equal(accountInfo.serverSeedHash,
            crypto.createHash('sha256').update(serverSeed).digest('hex'));

        //Check target number
        var hash = crypto
            .createHash('sha512')
            .update(serverSeed)
            .update(clientSeed)
            .update(betNumber.toString())
            .digest('hex');
        var biHashNumber = new bigdecimal.BigInteger(hash, 16);
        var biMaxRoll = new bigdecimal.BigInteger(playResponse.maxRoll.toString());
        var roll = biHashNumber.remainder(biMaxRoll);
        roll = roll.add(new bigdecimal.BigInteger("1"));
        assert.equal(roll.toString(), playResponse.roll);

        // Prepare for next game
        accountInfo.serverSeedHash = playResponse.serverSeedHash;

        accountManager.getUserBalance(username, playResponse.currency, function (error, user, account) {
            assert(!error);
            assert.equal(playResponse.userBalance, account.balance);
            //console.log(JSON.stringify(account, null, 4));
        });
    };

    describe('BetInfo', function () {
        it('BetInfoBTC', function (done) {
            request(url).get('/betInfo/BTC').expect(200).end(function (err, res) {
                assert(!err);
                var response = res.body;
                assert.equal(response.unit, "Satoshi");
                done();
            });
        });
        it('BetInfoPlayCoin', function (done) {
            request(url).get('/betInfo/PlayCoin').expect(200).end(function (err, res) {
                assert(!err);
                var response = res.body;
                assert.equal(response.unit, "PlayCoin");
                done();
            });
        });
        it('BetInfoInvalidCurrency', function (done) {
            request(url).get('/betInfo/aaa').expect(200).end(function (err, res) {
                assert(!err);
                var response = res.body;
                assert(response.error);
                done();
            });
        });
    });

    describe('Play', function () {
        it('PlayCoinSingleRegistered', function (done) {
            var currency = 'PlayCoin';
            var betProfile = {
                bet: '10000',
                payout: '10',
                currency: currency,
                clientSeed: clientSeed
            };
            play(cookie, betProfile, function (response) {
                console.log("play " + JSON.stringify(response));
                checkGame(response);
                assert(!response.error);
                assert.equal(response.clientSeed, clientSeed);
                assert.equal(response.currency, currency);
                done();
            });
        });

        //it('PlayCoinUntillWin', function (done) {
        //    winston.log("PlayCoinUntillWin");
        //    this.timeout(36000000);
        //    playUntillWin(url, cookie, 1, done);
        //});


        //it('PlayCoinUntillNoFund', function (done) {
        //    this.timeout(36000000);
        //    winston.log("PlayCoinUntillNoFund");
        //    playUntillNoFund(url, cookie, done);
        //});

        it('PlayCoinSingleAnonymous', function (done) {
            var currency = 'PlayCoin';
            var betProfile = {
                bet: '10000',
                payout: '100',
                currency: currency,
                clientSeed: clientSeed
            };
            request(url).get('/')
                .expect(200)
                .end(function (err, res) {
                    assert(!err);
                    var cookieNotAuthenticated = res.headers['set-cookie'];
                    request(url).post('/play').set('cookie', cookieNotAuthenticated)
                        .send(betProfile)
                        .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                            if (err) {
                                throw err;
                            }
                            assert(!res.body.error);
                            assert.equal(res.body.clientSeed, clientSeed);
                            assert.equal(res.body.currency, currency);
                            done();
                        });
                });
        });

        it('PlayBTC', function (done) {
            var currency = 'BTC';
            var betProfile = {
                bet: '10000',
                payout: '2',
                currency: currency,
                clientSeed: clientSeed
            };
            play(cookie, betProfile, function (response) {
                assert.equal(response.clientSeed, configTest.clientSeed);
                assert.equal(response.currency, currency);
                done();
            });
        });
        it('ClientSeedInvalid', function (done) {
            var currency = 'BTC';
            var betProfile = {
                bet: '10000',
                payout: '2',
                currency: currency,
                clientSeed: ""
            };
            play(cookie, betProfile, function (response) {
                assert(response.error);
                assert.equal(response.error.text, "Invalid client seed");
                assert.equal(response.error.type, "technical");
                done();
            });
        });
        it('CurrencyInvalid', function (done) {
            var currency = 'invalid';
            var betProfile = {
                bet: '10000',
                payout: '2',
                currency: currency,
                clientSeed: clientSeed
            };
            play(cookie, betProfile, function (response) {
                assert(response.error);
                assert.equal(response.error.text, "Invalid currency");
                assert.equal(response.error.type, "technical");
                done();
            });
        });

        it('BetInvalid', function (done) {
            var currency = 'BTC';
            var betProfile = {
                bet: '',
                payout: '2',
                currency: currency,
                clientSeed: clientSeed
            };
            play(cookie, betProfile, function (response) {
                assert(response.error);
                assert.equal(response.error.text, "Invalid bet");
                assert.equal(response.error.type, "technical");
                done();
            });
        });
        it('BetBelow', function (done) {
            var currency = 'BTC';
            var profile = {
                bet: '9999',
                payout: '2',
                currency: currency,
                clientSeed: clientSeed
            };
            request(url).post('/play').set('cookie', cookie).send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    assert(res.body.error);
                    assert.equal(res.body.error.text, "Bet below minimum");
                    assert.equal(res.body.error.type, "technical");
                    done();
                });
        });
        it('PayoutInvalid', function (done) {
            var currency = 'BTC';
            var profile = {
                bet: '100000',
                payout: '',
                currency: currency,
                clientSeed: clientSeed
            };

            request(url).post('/play').set('cookie', cookie).send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    assert(res.body.error);
                    assert.equal(res.body.error.text, "Invalid payout");
                    assert.equal(res.body.error.type, "technical");
                    done();
                });
        });
        it('PayoutBelow', function (done) {
            var currency = 'BTC';
            var profile = {
                bet: '100000',
                payout: '1',
                currency: currency,
                clientSeed: clientSeed
            };
            request(url).post('/play').set('cookie', cookie).send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    assert(res.body.error);
                    assert.equal(res.body.error.text, "Payout below minimum");
                    assert.equal(res.body.error.type, "technical");
                    done();
                });
        });
        it('GainBelow', function (done) {
            var currency = 'BTC';
            var profile = {
                bet: '50000000',
                payout: '10000',
                currency: currency,
                clientSeed: clientSeed
            };
            request(url).post('/play').set('cookie', cookie).send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    assert(res.body.error);
                    assert.equal(res.body.error.text, "Gain above maximum");
                    assert.equal(res.body.error.type, "technical");
                    done();
                });
        });

        it('PlayInvalidCurrency', function (done) {
            var profile = {
                bet: '',
                payout: '2',
                currency: 'idonotexist',
                clientSeed: clientSeed
            };
            request(url).post('/play').set('cookie', cookie).send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    assert(res.body.error);
                    assert.equal(res.body.error.text, "Invalid currency");
                    assert.equal(res.body.error.type, "technical");
                    done();
                });
        });
        it('PlayNotAuthencicated', function (done) {
            var profile = {
                bet: '10000',
                payout: '2',
                currency: 'PlayCoin',
                clientSeed: clientSeed
            };
            request(url).post('/play').send(profile)
                .expect('Content-Type', /json/).expect(401).end(function (err, res) {
                    done();
                });
        });
        //it('PlayDbKo', function (done) {
        //    this.timeout(40000);
        //    var currency = 'BTC';
        //    var profile = {
        //        bet: '10000',
        //        payout: '2',
        //        currency: currency,
        //        clientSeed: clientSeed
        //    };
        //    request(url).post('/mongodb/disconnect')
        //        .expect('Content-Type', /json/)
        //        .expect(200)
        //        .end(function (err, res) {
        //            if (err) {
        //                throw err;
        //            }
        //            console.log(res.body)
        //            res.body.should.have.property("disconnected");
        //            request(url).post('/play').set('cookie', cookie).send(profile)
        //                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
        //                    console.log("play return");
        //                    if (err) {
        //                        throw err;
        //                    }
                            
        //                    console.log(res.body)
        //                    assert.equal(res.body.clientSeed, clientSeed);
        //                    assert.equal(res.body.currency, currency);
        //                    done();
        //                });
        //        });
        //});
    });
});
