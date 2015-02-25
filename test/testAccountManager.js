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
var accountManager = require('./../app/server/modules/AccountManager.js')(config);
var Account = require('./../app/server/routes/account.js')(config, accountManager);
var dice = require("./../app/server/modules/Dice")();

describe('AccountManager', function () {
    "use strict";
    var user = configTest.user1;
    var username = user.username;
    var email = user.email;
    var password = user.password;
    var userData = user;

    before(function (done) {
        this.timeout(10000);
        async.series([function (callback) {
            dbClient.connect(callback);
        }], function (err) {
            assert(!err);
            done();
        });
    });

    after(function (done) {
        dbClient.disconnect(done);
    });

    describe('AccountManager', function () {
        describe('Login', function () {
            it('ResetUser', function (done) {
                accountManager.resetUser(userData, function (error, userSaved) {
                    assert(!error);
                    assert(userSaved);
                    done();
                });
            });

            it('ManualLoginOk', function (done) {
                accountManager.manualLogin(userData.username, userData.password, function (error, user) {
                    assert(!error);
                    assert.equal(user.username, userData.username);
                    assert.equal(user.password.length, 60);
                    done();
                });
            });

            it('ManualLoginKoUsername', function (done) {
                accountManager.manualLogin("imnoregistered", password, function (error, user) {
                    assert(error);
                    assert(!user);
                    done();
                });
            });

            it('ManualLoginKoPassword', function (done) {
                accountManager.manualLogin(userData.username, "wrong password", function (error, user) {
                    assert(error);
                    assert(!user);
                    done();
                });
            });

            it('AutoLoginOk', function (done) {
                User.findOne({ 'username': username }, function (err, userFound) {
                    assert(!err);
                    assert(userFound);
                    accountManager.autoLogin(username, userFound.password, function (error, user) {
                        assert(!error);
                        assert.equal(user.username, userData.username);
                        assert.equal(user.password.length, 60);
                        done();
                    });
                });
            });
            it('AutoLoginKoUsername', function (done) {
                User.findOne({ 'username': username }, function (err, userFound) {
                    assert(!err);
                    assert(userFound);
                    accountManager.autoLogin("iamnotregistered", "asdfghjklpoiuytrewq", function (error, user) {
                        assert(error);
                        assert(!user);
                        done();
                    });
                });
            });

            it('AutoLoginKoPassword', function (done) {
                User.findOne({ 'username': username }, function (err, userFound) {
                    assert(!err);
                    assert(userFound);
                    accountManager.autoLogin(username, "asdfghjklpoiuytrewq", function (error, user) {
                        assert(error);
                        assert(!user);
                        done();
                    });
                });
            });
        });

        describe('UserUpdateEmail', function () {
            it('UserUpdateEmailTaken', function (done) {
                accountManager.updateEmail(username, configTest.emailWithdraw, function (err) {
                    assert.equal(err, "email-taken");
                    done();
                });
            });

            it('UserUpdateEmail', function (done) {
                var emailNew = "pippo@donald.com";
                accountManager.updateEmail(username, emailNew, function (err) {
                    assert(!err);
                    User.findOne({ 'username': username }, function (err, userFound) {
                        console.log("findone ");
                        if (err) {
                            assert(false);
                        } else {
                            assert(userFound);
                            assert.equal(userFound.email, emailNew);
                            //Set ti back to original
                            accountManager.updateEmail(username, configTest.email, function (err) {
                                done();
                            });
                            
                        }
                    });
                });
            });

        });

        describe('UserUpdatePassword', function () {
            it('UserUpdatePasswordOk', function (done) {
                var passwordNew = "123456";
                accountManager.updatePassword(username, password, passwordNew, function (err) {
                    if (err) {
                        console.log(err);
                        assert(false);
                    } else {
                        accountManager.updatePassword(username, passwordNew, password, function (err) {
                            if (err) {
                                console.log(err);
                                assert(false);
                            }
                            done();
                        });
                    }
                });
            });
            it('UserUpdatePasswordWrongOld', function (done) {
                accountManager.updatePassword(username, "123456", "654321", function (err) {
                    assert(err);
                    done();
                });
            });
            it('UserUpdatePasswordTooShort', function (done) {
                var passwordNew = "12345";
                accountManager.updatePassword(username, password, passwordNew, function (err) {
                    assert(err);
                    done();
                });
            });
        });

        describe('Deposit', function () {

            it('getDepositAddressBTCOk', function (done) {
                accountManager.getDepositAddress(username, "BTC", function (err, address) {
                    assert(!err);
                    assert.equal(address.length, 34);
                    done();
                });
            });
        });

        describe('Balance', function () {

            it('getUserBalance', function (done) {
                accountManager.getUserBalance(username, "PlayCoin", function (err, user, account) {
                    if (err) {
                        console.log(err);
                        assert(false);
                    }
                    assert(user);
                    assert.equal(user.username, username);
                    account.should.have.property('balance');
                    done();
                });

            });

            it('GetUserBalanceInvalidCurrency', function (done) {
                accountManager.getUserBalance(username, "invalidcurrency", function (err, user, account) {
                    assert(err);
                    assert(user);
                    assert(!account);
                    done();
                });
            });
            it('GetUserBalanceInvalidUsername', function (done) {
                accountManager.getUserBalance("i do not exist", "PlayCoin", function (err, user, account) {
                    assert(err);
                    assert(!account);
                    done();
                });
            });

            it('ReceivedUnconfirmed', function (done) {
                User.findOne({ 'username': username }, function (err, user) {
                    assert(!err);
                    assert(user);
                    //console.log(JSON.stringify(user, null, 4));
                    var balanceUnconfirmedNew = "200000000";
                    accountManager.checkNewDeposit(user, "BTC", balanceUnconfirmedNew, function (error) {
                        assert(!error);
                        done();
                    });
                });
            });
            it('UpdateUserBalance', function (done) {
                var balance = "90000000";
                var currency = "BTC";
                var betNumber = 1;
                var serverSeed = "asdfghjkl";
                var profit = "100000000";
                var account = {
                    balance: balance,
                    betNumber: betNumber,
                    profit: profit
                };
                accountManager.updateUserBalance(username, currency, account, serverSeed, function (err) {
                    assert(!err);
                    accountManager.getUserBalance(username, currency, function (error, user, accountUpdated) {
                        assert(!error);
                        //console.log(JSON.stringify(account, null, 4));
                        assert.equal(user.serverSeed, serverSeed);
                        assert.equal(accountUpdated.balance, balance);
                        assert.equal(accountUpdated.betNumber, betNumber);
                        assert.equal(accountUpdated.profit, profit);
                        done();
                    });
                }
            );
            });
        });
        describe('Transactions', function () {
            it('getTransactionsOk', function (done) {
                accountManager.getTransactions(username, "BTC", function (err, transactions) {
                    assert(!err);
                    //log.info("bitcoinClient listTransactions " + JSON.stringify(transactions, null, 4));
                    assert(transactions);
                    done();
                });
            });
        });

        describe('Withdraw', function () {
            var usernameWithdraw = configTest.userWithdraw.username;
            var userData = configTest.userWithdraw;
            var currency = "BTC";
            before(function (done) {
                accountManager.addNewAccount(userData, function (error) {
                    //log.info(error);
                    //assert(error === "username-taken" || !error);
                    accountManager.getDepositAddress(usernameWithdraw, currency, function (error, address) {
                        assert(!error);
                        console.log(address);

                        accountManager.updateReceivedUnconfirmed(usernameWithdraw, currency, "500000000", "500000000", function () {
                            done();
                        });
                    });
                });
            });
            it('GetWithdrawBTCOk', function (done) {
                this.timeout(10000);
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z";
                var amountSat = "1000000";
                
                accountManager.getUserBalance(usernameWithdraw, currency, function (error, user, account) {
                    assert(!error);
                    var balanceCurrent = account.balance;
                    console.log("current balance:" + balanceCurrent);
                    accountManager.withdraw(usernameWithdraw, currency, address, amountSat, function (err, response) {
                        if (err) {
                            log.error(err);
                            assert(false);
                        }
                        console.log("response:" + JSON.stringify(response));
                        assert(response.txid);
                        assert.equal(response.address, address);
                        assert(response.balance);
                        assert.equal((+response.balance) + (+amountSat), balanceCurrent);

                        accountManager.getUserBalance(usernameWithdraw, currency, function (error, user, account) {
                            var balanceNew = account.balance;
                            console.log("new balance:" + balanceNew);
                            assert.equal((+balanceNew) + (+amountSat), balanceCurrent);
                            done();
                        });
                    });
                });
            });

            it('getWithdrawPlayCoinKo', function (done) {
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z";
                var amountSat = "10000000";
                accountManager.withdraw(usernameWithdraw, "PlayCoin", address, amountSat, function (err, response) {
                    assert(err);
                    assert(!response);
                    done();
                });
            });

            it('getWithdrawInvalidCurrency', function (done) {
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z";
                var amountSat = "10000000";
                accountManager.withdraw(usernameWithdraw, "invalidCurrency", address, amountSat, function (err, response) {
                    assert(err);
                    assert(!response);
                    done();
                });
            });

            it('getWithdrawBTCKoAmountMax', function (done) {
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z";
                var amountSat = "1000000000";
                accountManager.withdraw(usernameWithdraw, "BTC", address, amountSat, function (err, response) {
                    assert.equal(err, "Withdraw amount above balance");
                    assert(!response);
                    done();
                });
            });

            it('getWithdrawBTCKoAmountMin', function (done) {
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z";
                var amountSat = "999999";
                accountManager.withdraw(usernameWithdraw, "BTC", address, amountSat, function (err, response) {
                    assert.equal(err, "Amount to withdraw too low, minimum is 10 mBTC");
                    assert(!response);
                    done();
                });
            });

            it('getWithdrawInvalidAddress', function (done) {
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6Uzvdzxxxx";
                var amountSat = "1999999";
                accountManager.withdraw(usernameWithdraw, "BTC", address, amountSat, function (err, response) {
                    assert.equal(err, "Invalid address");
                    assert(!response);
                    done();
                });
            });

            it('getWithdrawInvalidAmount', function (done) {
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z";
                var amountSat = "1,000,000";
                accountManager.withdraw(usernameWithdraw, "BTC", address, amountSat, function (err, response) {
                    assert.equal(err, "Invalid amount");
                    assert(!response);
                    done();
                });
            });


            it('getWithdrawBTCKoUnconfirmed', function (done) {
                var address = "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z";
                var amountSat = "1000000";
                accountManager.withdraw(username, "BTC", address, amountSat, function (err, response) {
                    assert.equal(err, "Cannot withdraw due to unconfirmed incoming transaction(s)");
                    assert(!response);
                    done();
                });
            });
        });
    });
});
