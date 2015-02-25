var dice = require('./../modules/Dice.js')();
var async = require('async');
var log = require('winston');

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require("bcrypt"),
    SALT_WORK_FACTOR = 10;

var TransactionSchema = new Schema({
    username : { type: String, required: true},
    state: { type: String },
    dateCreation: { type: Date, default: Date.now, required: true },
    dateLastUpdated: { type: String, default: Date.now, required: true },
    amount: { type: String, required: true },
    address: { type: String, required: true },
    error: { type: String }
});

var TransactionWithdrawBtc = mongoose.model('transaction-withdraw-btc', TransactionSchema, 'transactionwithdrawbtc');

TransactionSchema.pre("save", function (next) {
    log.info("TransactionModel pre save");
    var transaction = this;
    transaction.dateLastUpdated = new Date();
    next();
});


var AccountSchema = new Schema({
    balance: { type: String, default: "0" },
    profit: { type: String, default: "0" },
    currency: { type: String, required: true },
    unit: { type: String, default: "" },
    betNumber: { type: Number, default: 0 },
    receivedUnconfirmed: { type: String, default: "0" },
});

var UserCounterSchema = new Schema({
    userCounterCounter: { type: Number, required: true, default: 0 },
});

var UserCounter = mongoose.model('UserCounter', UserCounterSchema);

var UserSchema = new Schema({
    username: { type: String, required: true, index: { unique: true } },
    userId: { type: String },
    email: { type: String },
    password: { type: String, required: true },
    type: { type: String },
    guest: { type: Boolean },
    date: { type: String },
    accounts: [AccountSchema],
    currentCurrency: { type: String, default: "PlayCoin" },
    serverSeed: { type: String, required: true }
});

UserSchema.path('username').validate(function (username) {
    var usernameRegex = /^[a-zA-Z0-9]+$/;
    return username.length >= 4 && username.length <= 32 && username.match(usernameRegex);
}, 'Invalid username');

UserSchema.path('email').validate(function (email) {
    if (email) {
        log.debug("UserSchema email save %s", email);
        var emailRegex = /\S+@\S+\.\S+/;
        return email.length >= 4 && email.length <= 32 && email.match(emailRegex);
    } else {
        log.debug("UserSchema empty email");
        return true;
    }
}, 'Invalid email');

UserSchema.path('password').validate(function (password) {
    log.info("UserSchema password save %s", password);
    return password.length >= 6 && password.length <= 32;
}, 'Invalid password');


UserSchema.pre("save", function (next) {
    log.info("UserModel pre save");
    var user = this;
    async.series([function (callback) {
        if (!user.userId) {
            log.info("UserModel userid undefined");
            UserCounter.findOneAndUpdate(
                {},
                { $inc: { "userCounter": 1 } },
                { upsert: true }, function (err, userCounter) {
                    log.info("UserModel pre save userCounter: %s, userId %s", userCounter, user.userId);
                    if (!userCounter) {
                        userCounter = 0;
                    }
                    user.userId = userCounter + 1;
                    callback();
                });
        } else {
            callback();
        }
    }, function (callback) {
        if (user.isModified('password')) {
            log.info("UserModel password changed");
            // generate a salt
            bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
                if (err) {
                    log.error("bcrypt.genSalt %s", err);
                    return next(err);
                }

                log.debug("UserModel hashing, salt %s", salt);
                // hash the password using our new salt
                bcrypt.hash(user.password, salt, function (err, hash) {
                    console.log("hashing done");
                    if (err) {
                        log.error("bcrypt.hash %s", err);
                        return next(err);
                    }

                    // override the cleartext password with the hashed one
                    user.password = hash;
                    log.debug("UserModel save password hash %s", user.password);
                    callback();
                });
            });
        }
    }], function (err) {
        next(err);
    });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', UserSchema);

module.exports = {
    User: User,
    TransactionWithdrawBtc: TransactionWithdrawBtc
};
