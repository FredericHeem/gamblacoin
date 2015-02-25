/*global require */
module.exports = function (config, configBet, accountManager) {
    "use strict";
    var log = require('winston');
    var bigdecimal = require("bigdecimal");
    var betRoute = {};
    var betManager = require('./../modules/BetManager.js')(config);
    var dice = require('./../modules/Dice.js')();

    function validatePlayInput(bet, payout, currency, clientSeed, user) {
        if (!user) {
            return { error: { text: "Not authenticated", type: "technical" } };
        }

        var config = configBet[currency];
        if (!config) {
            return { error: { text: "Invalid currency", type: "technical" } };
        }

        //Check Bet
        var bdBet;
        try {
            bdBet = bigdecimal.BigDecimal(bet);
        } catch (eBet) {
            return { error: { text: "Invalid bet", type: "technical" } };
        }

        if (bdBet.compareTo(bigdecimal.BigDecimal(config.bet_min)) < 0) {
            return { error: { text: "Bet below minimum", type: "technical" } };
        }

        //Check Payout
        var bdPayout;
        try {
            bdPayout = bigdecimal.BigDecimal(payout);
        } catch (ePayout) {
            return { error: { text: "Invalid payout", type: "technical" } };
        }

        if (bdPayout.compareTo(bigdecimal.BigDecimal(config.payout_min)) < 0) {
            return { error: { text: "Payout below minimum", type: "technical" } };
        }

        var potential_gain = bdBet.multiply(bdPayout);
        var win_max = bigdecimal.BigDecimal(config.win_max);
        if (potential_gain.compareTo(win_max) > 0) {
            return { error: { text: "Gain above maximum", type: "technical" } };
        }

        var account = getAccountFromCurrency(user, currency);
        if (!account) {
            return { error: { text: "Invalid currency", type: "technical" } };
        }

        var bdBalance;
        try {
            bdBalance = new bigdecimal.BigDecimal(account.balance);
        } catch (e) {
            return { error: { text: "Invalid balance in DB", type: "technical" } };
        }

        if (bdBet.compareTo(bdBalance) > 0) {
            return { error: { text: "Insuffucient fund", type: "technical" } };
        }

        // Client Seed
        if (!clientSeed) {
            return { error: { text: "Invalid client seed", type: "technical" } };
        }

        return {
            balance: bdBalance,
            bet: bdBet,
            payout: bdPayout,
            potential_gain: potential_gain,
            account: account
        };
    }

    function getAccountFromCurrency(user, currency) {
        var accountDic = {};
        user.accounts.map(function (account) {
            accountDic[account.currency] = account;
        });

        return accountDic[currency];
    }

    betRoute.play = function (req, res) {
        var bet = req.param('bet');
        var payout = req.param('payout');
        var currency = req.param('currency');
        var clientSeed = req.param('clientSeed');
        var user = req.session.user;
        var userId = user.userId;
        var username = user.username;
        log.info("play currency: %s, user: %s, id %s, bet: %s, payout: %s, clientSeed %s",
            currency, username, userId, bet, payout, clientSeed);
        var betInput = validatePlayInput(bet, payout, currency, clientSeed, user);
        if (betInput.error) {
            log.error("/play Error: " + JSON.stringify(betInput));
            res.send(betInput);
            return;
        }

        var bdBalance = betInput.balance;
        var bdBet = betInput.bet;
        var bdPayout = betInput.payout;
        var account = betInput.account;
        var betNumberCurrent = account.betNumber;

        var bdGain = bigdecimal.BigDecimal("0").subtract(bdBet);
        var maxRoll = 10000;
        var houseHedge = 1;
        
        var result = dice.computeResult(user.serverSeed, clientSeed, betNumberCurrent, maxRoll, houseHedge, payout);
        if (result.win) {
            bdGain = bdGain.add(bdBet.multiply(bdPayout));
        } else {
        }

        bdBalance = bdBalance.add(bdGain);

        var sBalance = bdBalance.toString();

        account.balance = sBalance;
        account.betNumber = betNumberCurrent + 1;
        account.profit = bigdecimal.BigDecimal(account.profit).add(bdGain).toString();
        var serverSeedCurrent = user.serverSeed;
        user.serverSeed = dice.createServerSeed();
        var nextServerSeedHash = dice.createServerSeedHash(user.serverSeed);

        var betResult = {
            userId: userId,
            currency: currency,
            win: result.win,
            bet: bet,
            profitLoss: parseFloat(bdGain.toString()),
            userBalance: account.balance,
            userProfit: account.profit,
            roll: result.roll,
            targetNumber: result.targetNumber,
            maxRoll: result.maxRoll,
            payout: payout,
            serverSeedHashNext: nextServerSeedHash,
            serverSeed: serverSeedCurrent,
            clientSeed: clientSeed,
            betNumberPlayer: account.betNumber
        };
        
        if (user.guest) {
            res.send(betResult);
        } else {
            betManager.addBet(betResult, function (error, betSaved) {
                if (error) {
                    log.error("addBet: " + error);
                    res.send({ error: { text: "Database error", type: "technical", detail: error } });
                } else {
                    accountManager.updateUserBalance(
                        username,
                        currency,
                        account,
                        user.serverSeed,
                        function (err) {
                            if (err && !user.guest) {
                                res.send({ error: { text: "Database error", type: "technical", detail: err } });
                            } else {
                                betResult.betId = betSaved.betId;
                                betResult.bankProfit = betSaved.bankProfit;
                                res.send(betResult);
                            }
                        }
                    );
                }
            });
        }
    };

    // /betInfo/:currency
    betRoute.betInfo = function (req, res) {
        var currency = req.params.currency;
        //console.log("/bet " + currency);
        var response;
        if (currency === "BTC") {
            response = configBet.BTC;
        } else if (currency === "PlayCoin") {
            response = configBet.PlayCoin;
        } else {
            response = { error: { text: "Invalid currency" } };
        }
        res.send(response);
    };

    // /bet/:currency/:betId
    betRoute.getBetId = function (req, res) {
        var currency = req.params.currency;
        var betId = req.params.betId;
        log.debug("getBetId %s, id %s", currency, betId);
        betManager.getBetId(currency, betId, function (error, bet) {
            if (error) {
                res.send({ error: { text: "db error", details: error } });
            } else if (!bet) {
                res.send({ error: {text: "Invalid Bet Id"} });
            } else {
                res.send(bet);
            }
        });
    };

    // /bet/:currency
    betRoute.getBetsAll = function (req, res) {
        var currency = req.params.currency;
        log.info("getBetsAll %s", currency);
        betManager.getBetsAll(currency, function (error, bets) {
            if (error) {
                res.send({ error: { text: "db error", details: error } });
            } else if (!bets) {
                res.send({ error: { text: "Cannot get bets" } });
            } else {
                res.send(bets);
            }
        });
    };

    return betRoute;
};