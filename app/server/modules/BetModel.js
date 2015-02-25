var log = require('winston');
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BetNumberSchema = new Schema({
    betCounter: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true,  index: { unique: true }, default: "PlayCoin" },
});

var BetNumber = mongoose.model('BetNumber', BetNumberSchema);

var BetSchema = new Schema({
    betId: { type: Number, required: true, default: 0 },
    win: { type: Boolean, required: true },
    bet: { type: String, required: true },
    payout: { type: String, required: true },
    profitLoss: { type: String, required: true },
    userBalance: { type: String, required: true },
    userProfit: { type: String, required: true },
    bankProfit: { type: String, required: true, default: "0" },
    totalBetAmount: { type: String, required: true, default: "0" },
    userId: { type: String, required: true },
    date: { type: Date },
    targetNumber: { type: Number, required: true },
    roll: { type: Number, required: true },
    maxRoll: { type: Number, required: true },
    serverSeedHashNext: { type: String, required: true },
    serverSeed: { type: String, required: true },
    clientSeed: { type: String, required: true },
    betNumberPlayer: { type: Number, required: true },
});

BetSchema.pre("save", function (next) {
    var bet = this;
    log.debug("BetModel pre save: " + JSON.stringify(bet, null, 4));

    bet.date = new Date();

    BetNumber.findOneAndUpdate(
        { name: "BTC" },
        { $inc: { "betCounter": 1 } },
        { upsert: true }, function (err, betNumber) {
            bet.betId = betNumber.betCounter;
            log.debug("BetModel save: " + JSON.stringify(bet, null, 4));
            next();
        });
});

var BetBTC = mongoose.model('BetBTC', BetSchema, "betsbtc");
var BetPlayCoin = mongoose.model('BetPlayCoin', BetSchema, "betsplaycoin");

module.exports = {
    BetBTC: BetBTC,
    BetPlayCoin: BetPlayCoin
};
