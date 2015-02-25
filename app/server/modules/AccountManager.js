/*global require*/
module.exports = function (config) {
    "use strict";
    var log = require('winston');
    var accountManager = {};
    var moment = require('moment');
    var mongoose = require('mongoose');
    var bigdecimal = require("bigdecimal");
    var User = require("./UserModel").User;
    var TransactionWithdrawBtc = require("./UserModel").TransactionWithdrawBtc;
    var dice = require('./Dice.js')();
    var cryptoUtils = require('./CryptoUtils.js')();
    var bitcoinManager = require('./BitcoinManager.js')(config);
    
    accountManager.autoLogin = function (username, passwordHash, callback) {
        //console.log("autoLogin user: " + username + ", password hash " + passwordHash);
        User.findOne({ 'username': username }, function (err, o) {
            if (err) {
                log.error("Error finding user: " + err);
                callback(err);
            } else if (o) {
                if (o.password === passwordHash) {
                    callback(null, o);
                } else {
                    log.error("autoLogin %s, pass %s, pass in db %s, invalid password", username, passwordHash, o.password);
                    callback("invalid-password");
                }
            } else {
                callback("user-not-found");
            }
        });
    };

    accountManager.manualLogin = function (username, password, callback) {
        //console.log("manualLogin username " + username + ", password " + password);
        User.findOne({ 'username': username }, function (err, user) {
            if (err) {
                log.error("Error finding user: " + err);
                callback(err);
            } else if (!user) {
                callback('user-not-found');
            } else {
                user.comparePassword(password, function (err, match) {
                    if (match) {
                        callback(null, user);
                    } else {
                        callback('invalid-password');
                    }
                });
            }
        });
    };

    accountManager.resetUser = function (userData, callback) {
        accountManager.deleteUser(userData.username, function () {
            var user = accountManager.createNewUser(userData);
            accountManager.saveUser(user, function (error, userSaved) {
                callback(error, userSaved);
            });
        });
    };

    accountManager.createNewUser = function (newData) {
        //console.log("createNewUser in: " + JSON.stringify(newData));

        if (!newData.username) {
            newData.username = cryptoUtils.createRandomString(8);
            newData.password = cryptoUtils.createRandomString(8);
        }

        var currentCurrency = "PlayCoin";
        if(!newData.guest){
            currentCurrency = "BTC";
        }

        var userData = {
            username: newData.username,
            password: newData.password,
            email: newData.email,
            type: newData.type,
            guest: newData.guest,
            currentCurrency: currentCurrency,
            date: moment().format('MMMM Do YYYY, h:mm:ss a'),
            serverSeed: dice.createServerSeed(),
            accounts: [
                { currency: "PlayCoin", balance: "100000000", unit:"PlayCoin" },
                { currency: "BTC", balance: "0", unit: "mBTC" }
            ]
        };

        //console.log("createNewUser out: " + JSON.stringify(userData));
        var user = new User(userData);
        return user;
    };

    accountManager.saveUser = function (user, callback) {
        //console.log("saveUser: " + JSON.stringify(user));
        user.save(function (error, data) {
            if (error) {
                log.error("saveUser error: " + error);
                callback(error);
            } else {
                callback(null, data);
            }
        });
    };

    accountManager.deleteUser = function (username, callback) {
        //console.log("deleteUser " + username);
        User.findOne({ 'username': username }, function (err, user) {
            if (err) {
                callback(err);
            }
            if (user) {
                user.remove();
            }
            callback(null);
        });
    };

    accountManager.getUserList = function (callback) {
        User.find({ }, function (err, users) {
            if (err) {
                callback(err);
            } else {
                callback(null, users);
            }
        });
    };

    accountManager.updateEmail = function (username, email, callback) {
        log.info("updateEmail " + username + ", email " + email);

        User.findOne({ 'email': email }, function (err, user) {
            if (err) {
                callback(err);
            } else if (user) {
                callback('email-taken');
            } else {
                User.update({ 'username': username }, { $set: { email: email } }, function (err) {
                    callback(err);
                });
            }
        });
    };

    accountManager.updatePassword = function (username, passwordOld, passwordNew, callback) {
        log.info("updatePassword %s", username);

        User.findOne({ 'username': username }, function (err, user) {
            if (err) {
                console.error("updatePassword %s", err);
                callback(err);
            } else if (user) {
                user.comparePassword(passwordOld, function (err, match) {
                    if (match) {
                        user.set("password", passwordNew);
                        accountManager.saveUser(user, callback);
                    } else {
                        callback('invalid-password');
                    }
                });

            } else {
                callback("cannot find user");
            }
        });
    };

    accountManager.addNewAccount = function (newData, callback) {
        log.info("addNewAccount: " + JSON.stringify(newData));
        var me = this;
        User.findOne({ 'username': newData.username }, function (err, o) {
            if (err) {
                callback(err);
            } else if (o) {
                log.info("addNewAccount: username taken: %s", newData.username);
                callback('username-taken');
            } else {
                User.findOne({ 'email': newData.email }, function (err, o) {
                    if (err) {
                        callback(err);
                    } else if (o && newData.email) {
                        log.info("addNewAccount: email taken: %s", newData.email);
                        callback('email-taken');
                    } else {
                        var userNew = accountManager.createNewUser(newData);
                        accountManager.saveUser(userNew, callback);
                    }
                });
            }
        });
    };

    accountManager.getAccount = function (user, currency) {
        var account;
        user.accounts.forEach(function (accountItem) {
            if (accountItem.currency === currency) {
                account = accountItem;
                return;
            }
        });
        return account;
    };

    accountManager.checkNewDeposit = function (user, currency, receivedUnconfirmedNew, callback) {
        var account = accountManager.getAccount(user, currency);

        log.info("checkNewDeposit rx unconfirmed: new " + receivedUnconfirmedNew + ", current " + account.receivedUnconfirmed);
        try {
            var biReceivedUnconfirmedNew = bigdecimal.BigDecimal(receivedUnconfirmedNew);
            var biReceivedUnconfirmedOld = bigdecimal.BigDecimal(account.receivedUnconfirmed);
            if (biReceivedUnconfirmedNew.compareTo(biReceivedUnconfirmedOld) > 0) {
                account.receivedUnconfirmed = receivedUnconfirmedNew;
                var balanceOld = account.balance;
                var biBalanceOld = bigdecimal.BigDecimal(balanceOld);
                var biCredit = biReceivedUnconfirmedNew.subtract(biReceivedUnconfirmedOld);
                var biBalanceNew = biBalanceOld.add(biCredit);
                account.balance = biBalanceNew.toString();
                log.info("checkNewDeposit UNCONFIRMED PAYMENT RECEIVED " +
                                  balanceOld + " to " +
                                  account.balance + ", credit " + biCredit.toString());

                accountManager.updateReceivedUnconfirmed(user.username, currency, receivedUnconfirmedNew, account.balance, callback);
            } else {
                callback(null);
            }
        } catch (e) {
            callback(e);
        }
    };

    accountManager.updateBalance = function (username, currency, balance, callback) {
        log.info("updateBalance for " + username + ", balance " + balance + ", currency: " + currency);
        if (!currency) {
            callback("Invalid currency");
            return;
        }
        if (!balance) {
            callback("Invalid balance");
            return;
        }

        User.update(
            { 'username': username, 'accounts.currency': currency },
            {
                '$set': {
                    'accounts.$.balance': balance,
                }
            },
            function (err) {
                if (err) {
                    log.error("updateBalance: " + err);
                    callback(err);
                } else {
                    callback(null);
                }
            }
        );
    };

    accountManager.updateReceivedUnconfirmed = function (username, currency, receivedUnconfirmedNew, balance, callback) {
        //console.log("updateReceivedUnconfirmed " + balance + ", currency: " + currency)
        User.update(
            { 'username': username, 'accounts.currency': currency },
            {
                '$set': {
                    'accounts.$.balance': balance,
                    'accounts.$.receivedUnconfirmed': receivedUnconfirmedNew
                }
            },
            function (err) {
                if (err) {
                    log.error("Cannot update user: " + err);
                    callback(err);
                } else {
                    callback(null);
                }
            }
        );
    };

    accountManager.updateUserBalance = function (username, currency, account, serverSeed, callback) {
        var balance = account.balance;
        var betNumber = account.betNumber;
        var profit = account.profit;

        log.debug("updateUserBalance for " + username + ", balance " + balance +
            ", profit" + profit + ", currency: " + currency);

        User.update(
            { 'username': username, 'accounts.currency': currency },
            {
                '$set': {
                    'serverSeed': serverSeed,
                    'accounts.$.balance': balance,
                    'accounts.$.profit': profit,
                    'accounts.$.betNumber': betNumber
                }
            },
            function (err) {
                if (err) {
                    log.error("Cannot update user: " + err);
                    callback(err);
                } else {
                    callback(null);
                }
            }
        );
    };

    accountManager.getUserBalance = function (username, currency, callback) {
        log.debug("getUserBalance username: %s, currency %s", username, currency);
        //console.log("getUserBalance user " + username + ", currency: " + currency)
        User.findOne({ 'username': username }, function (err, user) {
            if (err) {
                log.error("getUserBalance db error: " + err);
                callback(err);
            } else if (!user) {
                callback('user-not-found');
            } else {
                var accountFound;
                user.accounts.forEach(function (account) {
                    if (account.currency === currency) {
                        accountFound = account;
                        return;
                    }
                });
                if (accountFound) {
                    callback(null, user, accountFound);
                } else {
                    callback("no currency found", user);
                }
            }
        });
    };

    accountManager.getDepositAddress = function (username, currency, callback) {
        if (currency === "BTC") {
            bitcoinManager.getDepositAddress(username, function (error, address) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, address);
                }
            });
        } else if (currency === "PlayCoin") {
            callback("No deposit address for this currency");
        } else {
            callback("not a known currency: ");
        }
    };

    accountManager.isWithdrawAmountAboveBalance = function (amount, balance) {
        try {
            var biAmountSatoshi = bigdecimal.BigDecimal(amount);
            var biBalance = bigdecimal.BigDecimal(balance);
            if (biAmountSatoshi.compareTo(biBalance) > 0) {
                return true;
            } else {
                return false;
            }
        } catch (exception) {
            log.error("withdraw exception error %s", exception);
            return true;
        }
    };

    accountManager.isInvalidAmount = function (amount) {
        try {
            var biAmountSatoshi = bigdecimal.BigDecimal(amount);
            return false;
        } catch (exception) {
            log.error("accountManager.isValidAmount error %s", exception);
            return true;
        }
    };

    accountManager.withdrawReportError = function (transaction, error, callback) {
        transaction.state = "error";
        transaction.error = error;
        transaction.save();
        callback(error);
    };

    accountManager.withdraw = function (username, currency, address, amount, callback) {
        log.info("accountManager.withdraw username " + username + ", currency " + currency + ", amoumt " + amount);

        if (currency === "BTC") {
            
        } else if (currency === "PlayCoin") {
            callback("No withdraw for this currency");
            return;
        } else {
            callback("Not a known currency");
            return;
        }

        var transaction = new TransactionWithdrawBtc({
            username: username,
            state: "created",
            amount: amount,
            address: address
        });

        transaction.save();

        accountManager.getUserBalance(username, currency, function (error, user, account) {
            if (error) {
                log.error("accountManager.withdraw error getUserBalance: %s", error);
                accountManager.withdrawReportError(transaction, error, callback);
                return;
            }

            log.info("withdraw account %s", JSON.stringify(account));
            var balance = account.balance;
            if (balance == 0) {
                accountManager.withdrawReportError(transaction, "Empty balance", callback);
                return;
            }
            
            if (accountManager.isInvalidAmount(amount)) {
                log.error("accountManager.withdraw invalid amount, user: %s, balance %s, amount: %s",
                    username, balance, amount);
                accountManager.withdrawReportError(transaction, "Invalid amount", callback);
                return;
            }

            if (accountManager.isWithdrawAmountAboveBalance(amount, account.balance)) {
                log.error("accountManager.withdraw  amount above balance, user: %s, balance %s, amount: %s",
                    username, balance, amount);
                accountManager.withdrawReportError(transaction, "Withdraw amount above balance", callback);
                return;
            }
            
            if (currency === "BTC") {
                bitcoinManager.withdraw(accountManager, username, account, address, amount, function (error, status) {
                    if (error) {
                        log.error("accountManager.withdraw: error: ", error);
                        accountManager.withdrawReportError(transaction, error, callback);
                    } else {
                        log.info("accountManager.withdraw: status: ", status);
                        transaction.state = status.state;
                        transaction.save();
                        if (status.state === "withdrawDeferred") {
                            callback("Amount to withdraw above the hot wallet, please retry later");
                        } else {
                            callback(null, status);
                        }
                        
                    }
                });
            } else if (currency === "PlayCoin") {
                callback("No withdraw for this currency");
            } else {
                callback("Not a known currency");
            }
        });
    };

    accountManager.getUpdatedAccount = function (user, currency, callback) {
        var account = accountManager.getAccount(user, currency);
        if (!account) {
            callback("Invalid currency");
            return;
        }

        if (currency === "BTC") {
            bitcoinManager.getUpdatedAccount(user, function (error, receivedUnconfirmedSatoshi) {
                if (error) {
                    callback(error);
                } else {
                    accountManager.checkNewDeposit(user, "BTC", receivedUnconfirmedSatoshi, function () {
                        callback(null, account);
                    });
                }
            });
        } else if (currency === "PlayCoin") {
            callback(null, account);
        } else {
            callback("not a known currency: ");
        }
    };

    accountManager.getTransactions = function (username, currency, callback) {
        log.info("getTransactions " + username);
        if (currency === "BTC") {
            bitcoinManager.getTransactions(username, callback);
        } else {
            callback("Invalid currency");
        }
    };

    return accountManager;
};
