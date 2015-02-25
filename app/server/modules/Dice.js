/*global require*/
module.exports = function (config, bitcoinClient) {
    "use strict";
    //console.log("Dice.js");
    var crypto = require('crypto');
    var cryptoUtils = require('./CryptoUtils.js')();
    var dice = {};
    var bigdecimal = require("bigdecimal");

    dice.createServerSeed = function () {
        return cryptoUtils.createRandomString(64);
    };

    dice.createServerSeedHash = function (serverSeed) {
        return crypto.createHash('sha256').update(serverSeed).digest('hex');
    };

    dice.computeResult = function (serverSeed, clientSeed, betNumber, maxRollBase, houseHedge, payout) {
        var win = false;
        var targetNumber = Math.floor(maxRollBase / payout);
        var maxRoll = maxRollBase + (maxRollBase * houseHedge) / 100;
        var roll = dice.getRoll(serverSeed, clientSeed, betNumber, maxRoll);
        if (roll <= targetNumber) {
            win = true;
        } else {
            win = false;
        }
        return { win: win, roll: roll, maxRoll: maxRoll, targetNumber: targetNumber };
    };

    dice.getRoll = function (serverSeed, clientSeed, betNumber, maxRoll) {
        var hash = crypto
            .createHash('sha512')
            .update(serverSeed)
            .update(clientSeed)
            .update(betNumber.toString())
            .digest('hex');
        var biHashNumber = new bigdecimal.BigInteger(hash, 16);
        var biMaxRoll = new bigdecimal.BigInteger(maxRoll.toString());
        var roll = biHashNumber.remainder(biMaxRoll);
        roll = roll.add(new bigdecimal.BigInteger("1"));
        return roll.toString();
    };

    return dice;
};