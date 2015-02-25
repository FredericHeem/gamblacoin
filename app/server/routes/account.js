/*global require */
module.exports = function (config, accountManager) {
    "use strict";
    var log = require('winston');
    var dice = require('./../modules/Dice.js')();
    var bitcoinClient = require('./../modules/BitcoinClient.js')(config.bitcoinClient);
    var betManager = require('./../modules/BetManager.js')(config);

    function saveUserIntoSession(req, user) {
        log.info("saveUserIntoSession");
        req.session.user = user;
        req.session.userId = user.id;
    }

    function clearCookie(res) {
        log.info("clearCookie");
        res.clearCookie('user');
        res.clearCookie('pass');
    }

    function cookieSave(res, username, password, config) {
        //console.log("cookieSave, username: " + username + ", max age " + config.cookie_max_age);
        res.cookie('user', username, { maxAge: config.cookie_max_age });
        res.cookie('pass', password, { maxAge: config.cookie_max_age });
    }

    var Account = {};
    Account.ensureRegisteredOrGuest = function (req, res, next) {
        log.debug("ensureRegisteredOrGuest");
        
        var user = req.session.user;
        
        if (req.cookies.user && req.cookies.pass) {
    		log.info("ensureRegisteredOrGuest got cookies");
            accountManager.autoLogin(req.cookies.user, req.cookies.pass, function (error, o) {
                if (o) {
                    saveUserIntoSession(req, o);
                } else {
                    if (error) {
                        log.error("auto login error " + error);
                    }
                    log.error("auto login ko");
                    clearCookie(res);
                }
                next();
            });
        } else if (!user) {
        	 log.info("ensureRegisteredOrGuest create guest");
             var guestUserData = { username: "", guest: "true" };
             var guestUser = accountManager.createNewUser(guestUserData);
             saveUserIntoSession(req, guestUser);
             next();
        } else {
           next();
        }
    };

    Account.login = function (req, res) {
        var username = req.param('username');
        var password = req.param('password');
        log.info("login post, user: " + username);
        accountManager.manualLogin(username, password, function (e, user) {
            if (!user) {
                log.error("not authenticated error: " + e);
                res.send({
                    authenticated: false,
                    error: {
                        code: '0',
                        text: 'Invalid username or password'
                    }
                });
            } else {
                //console.log("login post, user: " + username + " is authenticated");
                saveUserIntoSession(req, user);
                cookieSave(res, user.username, user.password, config);
                Account.accountInfo(req, res);
            }
        });
    };

    Account.register = function (req, res) {
        var username = req.param('username');
        var password = req.param('password');
        //console.log("register post: username " + username + ", password " + password);
        accountManager.addNewAccount({
            email: req.param('email'),
            username: req.param('username'),
            password: req.param('password')
        }, function (e, user) {
            if (!user) {
                //console.log("register error: " + e);
                res.send({ authenticated: false, error: { code: '0', text: e.toString() } });
            } else {
                //console.log("register, username : " + user.username);
                saveUserIntoSession(req, user);
                cookieSave(res, user.username, user.password, config);
                Account.accountInfo(req, res);
            }
        });
    };

    Account.updateEmail = function (req, res) {
        var user = req.session.user;
        var email = req.param('email');
        log.info("updateEmail user: " + user.username + ", email " + email);
        
        accountManager.updateEmail(user.username, email, function (err) {
            if (err) {
                log.error("updateEmail error: " + err);
                res.send({ error: { "type": "technical", "text": err } });
            } else {
                user.email = email;
                res.send({ success: true });
            }
        });
    };

    Account.updatePassword = function (req, res) {
        var user = req.session.user;
        var passwordOld = req.param('passwordOld');
        var passwordNew = req.param('passwordNew');
        log.info("updatePassword user: %s", user.username);

        accountManager.updatePassword(user.username, passwordOld, passwordNew, function (err) {
            if (err) {
                log.error("updatePassword error: " + err);
                res.send({ error: { "type": "technical", "text": err } });
            } else {
                res.send({ success: true });
            }
        });
    };

    Account.logout = function (req, res) {
        log.info("logout %s", req.session.user);
        clearCookie(res);
        req.session.destroy(function () { res.send('ok', 200); });
    };

    Account.accountInfo = function (req, res) {
        var user = req.session.user;
        
        accountManager.getUpdatedAccount(user, user.currentCurrency, function (error, account) {
            var response;
            if (!error) {
                response = {
                    guest: user.guest,
                    username: user.username,
                    email: user.email,
                    accounts: ["BTC", "PlayCoin"],
                    currentCurrency: user.currentCurrency,
                    serverSeedHash: dice.createServerSeedHash(user.serverSeed),
                    balance: account.balance,
                    profit: account.profit,
                    receivedUnconfirmed: account.receivedUnconfirmed,
                    betNumber: account.betNumber,
                    unit: account.unit,
                };
                log.debug("accountInfo: ", response);
            } else {
                response = {
                    error: { text: error }
                };
            }

            res.send(response);
        });
    };
    // /account
    Account.accountList = function (req, res) {
        accountManager.getUserList(function (error, userList) {
            var response;
            if (!error) {
                response = userList;
            } else {
                response = {
                    error: { text: error }
                };
            }

            res.send(response);
        });
    };

    ///account/:user/balance/:currency
    Account.balance = function (req, res) {
        var user = req.session.user;
        var currency = req.params.currency;

        accountManager.getUpdatedAccount(user, currency, function (error, account) {
            var response;
            if (!error) {
                response = {
                    currency: account.currency,
                    balance: account.balance,
                    unit: account.unit,
                };
            } else {
                response = {
                    error: { text: error }
                };
            }

            res.send(response);
        });
    };
    
    ///account/:user/despositAddress/:currency
    Account.depositAddress = function (req, res) {
        var user = req.session.user;
        var currency = req.params.currency;

        log.info("depositAddress user: %s, currency: %s", user.username, currency);

        accountManager.getDepositAddress(user.username, currency, function (error, address) {
            var response;
            if (address) {
                response = { depositAddress: address };
            } else {
                response = { error: { text: error } };
            }
            res.send(response);
        });
    };

    ///account/:user/withdraw/:currency
    Account.withdraw = function (req, res) {
        var user = req.session.user;
        var currency = req.param('currency');
        var address = req.param('address');
        var amount = req.param('amount');

        log.info("Account.withdraw user: %s, amount: %s, address: %s, currency: %s", user.username, amount, address, currency);

        var account = accountManager.getAccount(user, currency);
        if (!account) {
            res.send( { error: { text: "Invalid currency" } });
            return;
        }

        accountManager.withdraw(user.username, currency, address, amount, function (error, withdrawResponse) {
            var response;
            if (error) {
                log.error("Account.withdraw error %s", error);
                response = { error: { text: error } };
            } else {
                account.balance = withdrawResponse.balance;
                response = withdrawResponse;
            }
            log.info("Account.withdraw send: %s", JSON.stringify(response));
            res.send(response);
        });
    };

    ///account/:user/transactions/:currency
    Account.transactions = function (req, res) {
        var user = req.session.user;
        var currency = req.params.currency;

        accountManager.getTransactions(user.username, currency, function (err, transactions) {
            var response;
            if (err) {
                response = { error: { text: err } };
            } else {
                response = {transactions: transactions};
            }
            res.send(response);
        });
    };

    ///account/:user/bets/:currency
    Account.bets = function (req, res) {
        var user = req.session.user;
        var currency = req.params.currency;
        var page = req.query.current_page;
        var pageSize = req.query.page_size;
        log.info("bets userId: %s, currency %s, page %s, pageSize %s",
            user.userId, currency, page, pageSize);

        betManager.getMyBets(user.userId, currency, function (error, bets) {
            if (error) {
                log.error("bets: %s", error);
                res.send({ error: { text: error } });
            } else {
                //console.log(JSON.stringify(bets, null, 4));
                res.send(bets);
            }
        }, page, pageSize);
    };

    ///account/:user/betsStat/:currency
    Account.betStats = function (req, res) {
        var user = req.session.user;
        var currency = req.params.currency;
        log.info("betStats %s, currency %s",
            user.username, currency);

        betManager.getBetStats(user.username, currency, function (error, bets) {
            if (error) {
                log.error("bets: %s", error);
                res.send({ error: { text: error } });
            } else {
                //console.log(JSON.stringify(bets, null, 4));
                res.send(bets);
            }
        });
    };

    return Account;
};