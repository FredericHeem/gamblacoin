/*global require*/
module.exports = function (config) {
    "use strict";
    var log = require('winston');
    var bitcoinManager = {};
    var moment = require('moment');
    var bigdecimal = require("bigdecimal");
    var async = require('async');

    var bitcoinClient = require('./BitcoinClient.js')(config.bitcoinClient);

    var isWithdrawToLow = function (amount, callback) {
        var biAmountSatoshi = bigdecimal.BigDecimal(amount);
        var biWithdrawMin = bigdecimal.BigDecimal("1000000");//0.01BTC

        if (biWithdrawMin.compareTo(biAmountSatoshi) > 0) {
            callback("Amount to withdraw too low, minimum is 10 mBTC");
        } else {
            callback();
        }
    };

    var isWithdrawAboveHotWallet = function (amount, withdrawCallback, callback) {
        var biAmountSatoshi = bigdecimal.BigDecimal(amount);
        //var minConfirmation = 3;
        bitcoinClient.getBalance(function (error, balance) {
            if (error) {
                log.error("Cannot get hot wallet balance: %s", error);
                callback("Cannot get hot wallet balance, " + error);
            } else {
                var biBalanceHotWalletBTC = bigdecimal.BigDecimal(balance);
                var biBalanceHotWalletSatoshi = biBalanceHotWalletBTC.multiply(bigdecimal.BigDecimal("100000000"));
                log.info("isWithdrawAboveHotWallet hot wallet balance %s BTC, %s satoshi",
                    biBalanceHotWalletBTC.toString(), biBalanceHotWalletSatoshi.toString());
                if (biAmountSatoshi.compareTo(biBalanceHotWalletSatoshi) > 0) {
                    log.info("Deferred withdrawal");
                    withdrawCallback(null, { state: "withdrawDeferred" });
                    //callback("Deferred withdrawal");
                } else {
                    callback();
                }
            }
        });
    };

    bitcoinManager.getDepositAddress = function (username, callback) {
        log.debug("bitcoinManager.getDepositAddress: username %s", username);
        bitcoinClient.getAccountAddress(username, function (err, address) {
            if (err) {
                log.error("bitcoinManager.getDepositAddress username %s, error: %s", username, err);
                callback("Cannot create deposit address");
            } else {
                log.info("bitcoinManager.getDepositAddress username %s, address %s", username, address);
                callback(null, address);
            }
        });
    };

    bitcoinManager.withdraw = function (accountManager, username, account, address, amount, withdrawCallback) {
        log.info("bitcoinManager.withdraw: " + username + ", address " + address + ", amount " + amount + ", balance " + account.balance);
        log.info("Withdraw account: " + JSON.stringify(account));

        var balanceCurrentSatoshi = account.balance;
        var biBalanceCurrentSatoshi = bigdecimal.BigDecimal(balanceCurrentSatoshi);
        var biAmountSatoshi = bigdecimal.BigDecimal(amount);
        var biBalanceNewSatoshi = biBalanceCurrentSatoshi.subtract(biAmountSatoshi);
        var up = bigdecimal.RoundingMode.HALF_UP();
        biBalanceNewSatoshi = biBalanceNewSatoshi.setScale(0, up);
        var balanceNewSatoshi = biBalanceNewSatoshi.toString();

        async.series([
            function (callback) {
                bitcoinClient.validateAddress(address, function (error, response) {
                    if (error) {
                        log.error("withdraw error validating address: %s", error);
                        callback(error);
                    } else if (!response.isvalid) {
                        callback("Invalid address");
                    } else {
                        callback();
                    }
                });
            },
            function (callback) {
                isWithdrawToLow(amount, callback);
            },
            function (callback) {
                isWithdrawAboveHotWallet(amount, withdrawCallback, callback);
            },
            function (callback) {
                var confirmationMin = 3;
                log.info("bitcoinManager.withdraw getting unconfirmed transaction");
                bitcoinManager.hasUnconfirmedTransaction(username, confirmationMin, function (err, unconfirmed) {
                    if (err) {
                        callback(err);
                    } else if (unconfirmed) {
                        callback("Cannot withdraw due to unconfirmed incoming transaction(s)");
                    } else {
                        callback();
                    }
                });
            },
            function (callback) {
                accountManager.updateBalance(username, "BTC", balanceNewSatoshi, function (error, user) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                    }
                });
            },  
            function (callback) {
                var biAmountBTC = biAmountSatoshi.divide(bigdecimal.BigDecimal("100000000"));
                var amountBTC = parseFloat(biAmountBTC.toString());
                bitcoinClient.sendToAddress(address, amountBTC, function (errorSendToAddress, txid) {
                    if (errorSendToAddress) {
                        log.error("withdraw cannot send for username %s, amount in BTC %s, error: %s",
                            username, amountBTC, errorSendToAddress);
                        accountManager.updateBalance(username, "BTC", balanceCurrentSatoshi, function (error, user) {
                            if (error) {
                                log.error("Cannot rollback balance for user %s, should be rollbacked to %s but is %s",
                                    username, balanceCurrentSatoshi, balanceNewSatoshi);
                                callback("Cannot rollback balance, please contact the site administrator");
                            } else {
                                log.error("Cannot send %s satoshi to address %s, ",
                                    balanceCurrentSatoshi, address, errorSendToAddress);
                                callback("Cannot withdraw, ");
                            }
                        });
                    } else {
                        log.info("BTC withdraw txid address for username %s is %s, new balance %s, old balance %s",
                            username, txid, balanceNewSatoshi, balanceCurrentSatoshi);
                        withdrawCallback(null, {
                            state: "withdrawed",
                            balance: balanceNewSatoshi,
                            address: address,
                            txid: txid
                        });
                        callback();
                    }
                });
            }
        ], function (err) {
            if (err) {
                withdrawCallback(err);
            }
        });
    };

    bitcoinManager.getUpdatedAccount = function (user, callback) {
        //console.log("getUpdatedAccountBTC " + JSON.stringify(user));
        bitcoinClient.getReceivedByAccount(user.username, 0, function (err, receivedUnconfirmed) {
            if (err) {
                log.error("bitcoinManager.getUpdatedAccount: " + err);
                callback("Cannot get balance");
            } else {
                var biReceivedUnconfirmedBTC = bigdecimal.BigDecimal(receivedUnconfirmed);
                var biReceivedUnconfirmedSatoshi = biReceivedUnconfirmedBTC.multiply(bigdecimal.BigDecimal("100000000"));
                var up = bigdecimal.RoundingMode.HALF_UP();
                biReceivedUnconfirmedSatoshi = biReceivedUnconfirmedSatoshi.setScale(0, up);
                callback(null, biReceivedUnconfirmedSatoshi.toString());
                //bitcoinManager.checkNewDeposit(user, "BTC", biReceivedUnconfirmedSatoshi.toString(), callback);
            }
        });
    };


    bitcoinManager.getTransactions = function (username, callback) {
        log.info("BTC getTransactions " + username);
        var count = 1000;
        bitcoinClient.listTransactions(username, count, function (err, transactions) {
            //log.info("bitcoinClient listTransactions " + JSON.stringify(transactions, null, 4));
            if (err) {
                log.error("listTransactions: " + err);
                callback(err);
            } else {
                var transactionsToShow = [];
                transactions.forEach(function (transaction) {
                    //TODO check send
                    if ((transaction.category === "receive") || (transaction.category === "send")) {
                        transactionsToShow.push(transaction);
                        return;
                    }
                });
                callback(null, transactionsToShow);
            }
        });
    };

    bitcoinManager.hasUnconfirmedTransaction = function (username, confirmationMin, callback) {
        log.info("BTC hasUnconfirmedTransaction " + username);
        var count = 1000;
        var unconfirmed = false;
        bitcoinClient.listTransactions(username, count, function (err, transactions) {
            if (err) {
                log.error("hasUnconfirmedTransaction: " + err);
                callback(err);
            } else {
                transactions.forEach(function (transaction) {
                    if ((transaction.category === "receive") && (transaction.confirmations < confirmationMin)) {
                        unconfirmed = true;
                        return;
                    }
                });

                callback(null, unconfirmed);
            }
        });
    };
    return bitcoinManager;
};