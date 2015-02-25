/*global describe, it, before, after, beforeEach, afterEach */
/* jslint node: true */
var log = require('winston');
var should = require('should');
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./../app/server/Config')();
var configTest = require('./ConfigTest.js')();
var bitcoinClient = require('./../app/server/modules/BitcoinClient.js')(config.bitcoinClient);
var bitcoinClientUser = require('./../app/server/modules/BitcoinClient.js')(configTest.bitcoinClient);

describe('BitcoinClient', function () {
    "use strict";
    var account = configTest.user1.username;

    var checkBalance = function (bitcoinClient, account, done) {
        bitcoinClient.getBalance(account, 0, function (err, balance) {
            assert(!err);
            log.info("bitcoinClient getBalance " + balance);
            if (balance) {
                done();
            } else {
                setTimeout(function () {
                    checkBalance(bitcoinClient, account, done);
                }, 1000);
            }
        });

    };
    describe('BitcoinClientUser', function () {
        this.timeout(10000);
        it('getInfoUser', function (done) {
            bitcoinClientUser.getInfo(function (err, info) {
                if (err) {
                    log.error(err);
                }
                assert(!err);
                done();
            });
        });

        it('sendToUserIfEmpty', function (done) {
            this.timeout(60000);

            var account = configTest.userWithdraw.username;
            bitcoinClientUser.getBalance(account, 0, function (err, balance) {
                if (err) {
                    log.error(err);
                    assert(false);
                }
                log.info("bitcoinClient getReceivedByAccount  " + account + " has " + balance);
                if (!balance) {
                    bitcoinClientUser.getAccountAddress(account, function (err, address) {
                        if (err) {
                            log.error(err);
                        }
                        assert(!err);
                        log.info("bitcoinClient getAccountAddress " + address);
                        var amount = 5; //BTC;
                        bitcoinClient.sendToAddress(address, amount, function (err, txid) {
                            if (err) {
                                log.error(err);
                            }
                            assert(!err);
                            log.info("bitcoinClient sendToAddress " + JSON.stringify(txid));
                            checkBalance(bitcoinClientUser, account, done);
                        });
                    });
                } else {
                    done();
                }
            });
        });

        it('sendToAddress', function (done) {
            this.timeout(60000);
            var account = configTest.user1.username;
            bitcoinClient.getAccountAddress(account, function (err, address) {
                if (err) {
                    log.error(err);
                }
                assert(!err);
                log.info("bitcoinClient getAccountAddress " + address);
                var amount = 0.1; //BTC;
                bitcoinClientUser.sendToAddress(address, amount, function (err, txid) {
                    if (err) {
                        log.error(err);
                    }
                    assert(!err);
                    log.info("bitcoinClient sendToAddress " + JSON.stringify(txid));
                    checkBalance(bitcoinClient, account, done);
                });
            });
        });

        it('move', function (done) {
            var from = configTest.user1.username;
            var to = "UserFund";
            var amount = 0.1;
            var minConfirmation = 3;
            bitcoinClient.move(from, to, amount, minConfirmation, function (err, info) {
                if (err) {
                    log.error(err);
                    assert(false);
                }
                assert(info);
                bitcoinClient.move(to, from, amount, minConfirmation, function (err, info) {
                    if (err) {
                        log.error(err);
                        assert(false);
                    }
                    assert(info);
                    done();
                });
            });
        });
    });

    describe('BitcoinClient', function () {
        this.timeout(10000);
        it('getInfo', function (done) {
            bitcoinClient.getInfo(function (err, info) {
                assert(!err);
                //console.log("bitcoinClient info " + JSON.stringify(info))
                done();
            });
        });
        it('getReceivedByAddressInvalid', function (done) {
            var address = "1DNxoJCfVG8JpoFtXpa9c9dsCZJNkSxxxx";
            bitcoinClient.getReceivedByAddress(address, function (err, info) {
                assert(err);
                done();
            });
        });

        it('getReceivedByAddress', function (done) {
            var address = "n3dsfnpKhByZ3oVYzbLsCcJ2FDD8RRrJAC";
            
            bitcoinClient.getReceivedByAddress(address, 0, function (err, info) {
                if(err){
                    log.error(err);
                    assert(!err);
                }
                //console.log("bitcoinClient getReceivedByAddress " + JSON.stringify(info))
                done();
            });
        });
        it('getReceivedByAccount', function (done) {
            
            bitcoinClient.getReceivedByAccount(account, function (err, info) {
                assert(!err);
                log.info("bitcoinClient getReceivedByAccount " + JSON.stringify(info));
                done();
            });
        });
        it('listreceivedbyaddress', function (done) {
            bitcoinClient.listReceivedByAddress(0, true, function (err, info) {
                assert(!err);
                //console.log("bitcoinClient listreceivedbyaddress " + JSON.stringify(info, null, 4));
                done();
            });
        });
        it('listAccounts', function (done) {
            bitcoinClient.listAccounts(0, function (err, info) {
                assert(!err);
                log.info("bitcoinClient listAccounts " + JSON.stringify(info, null, 4));
                done();
            });
        });
        it('listTransactions', function (done) {
            bitcoinClient.listTransactions(account, function (err, transactions) {
                assert(!err);
                log.info("bitcoinClient listTransactions " + JSON.stringify(transactions, null, 4));
                done();
            });
        });
        it('getBalance', function (done) {
            bitcoinClient.getBalance(account, function (err, info) {
                assert(!err);
                log.info("bitcoinClient getBalance " + JSON.stringify(info, null, 4));
                done();
            });
        });
    });
});