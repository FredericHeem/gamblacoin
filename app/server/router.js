/*global require */
module.exports = function (app, io, config, configBet) {
    "use strict";
    var log = require('winston');
    var accountManager = require('./modules/AccountManager.js')(config);
    var dbClient = require('./modules/DbClient.js')(config);
    var bet = require('./routes/bet')(config, configBet, accountManager);
    var account = require('./routes/account')(config, accountManager);
    var mongodb = require('./routes/mongodb')(config, dbClient);
    var bitcoin = require('./routes/bitcoin')(config);
    var iohandler = require('./routes/socketioHandler')(config, io);

    io.set('log level', 1);
    io.sockets.on('connection', iohandler.connection);

    app.param("user");
    app.param("currency");
    app.param("betId");

    //Bet
    app.post('/play', ensureRegisteredOrGuest, bet.play);
    app.get('/betInfo/:currency', bet.betInfo);
    app.get('/bet/:currency/:betId', bet.getBetId);
    app.get('/bet/:currency', bet.getBetsAll);

    //Account
    app.post('/login', account.login);
    app.delete('/logout', account.logout);
    app.post('/register', account.register);

    app.get('/account', ensureAdmin, account.accountList);
    app.get('/accountInfo', ensureRegisteredOrGuest, account.accountInfo);
    app.get('/account/:user/balance/:currency', ensureRegistered, account.balance);
    app.get('/account/:user/depositAddress/:currency', ensureRegistered, account.depositAddress);
    app.post('/account/:user/updateEmail', ensureRegistered, account.updateEmail);
    app.post('/account/:user/updatePassword', ensureRegistered, account.updatePassword);
    app.post('/account/:user/withdraw/:currency', ensureRegistered, account.withdraw);
    app.get('/account/:user/transactions/:currency', ensureRegistered, account.transactions);
    app.get('/account/:user/bets/:currency', ensureRegisteredOrGuest, account.bets);
    app.get('/account/:user/betStats/:currency', ensureRegisteredOrGuest, account.betStats);

    //Mongodb
    app.get('/mongodb/status', mongodb.status);
    app.post('/mongodb/connect', ensureAdmin, mongodb.connect);
    app.post('/mongodb/disconnect', ensureAdmin, mongodb.disconnect);
    
    //Bitcoin
    app.get('/bitcoin/getInfo', bitcoin.getInfo);
    app.get('/bitcoin/listAccounts', bitcoin.listAccounts);

    function ensureRegisteredOrGuest(req, res, next) {
    	account.ensureRegisteredOrGuest(req, res, next);
    }

    function ensureRegistered(req, res, next) {
        //console.log("ensureRegistered");
        var user = req.session.user;
        if (user && !user.guest) {
            return next();
        } else {
            console.log("ensureRegistered KO");
            res.send(401);
        }
    }

    function ensureAdmin(req, res, next) {
        var user = req.session.user;
        if (user) {
            log.info("ensureAdmin user %s, type: %s", user.username, user.type);
        } else {
            log.info("ensureAdmin no user");
        }
        
        if (user && user.type === "admin") {
            log.info("ensureAdmin OK");
            return next();
        } else {
            log.info("ensureAdmin KO");
            res.send(401);
        }
    }

	//app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });
};