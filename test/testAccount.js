/*global describe, it, before, after, beforeEach, afterEach*/
var winston = require('winston');

var expressApp = require('./../app/server/ExpressApp.js')(__dirname + "/../");
var should = require('should');
var assert = require('assert');
var request = require('supertest');
var mongoose = require('mongoose');
var async = require('async');
//var winston = require('winston');
var config = require('./../app/server/Config')();
var configTest = require('./ConfigTest.js')();
var User = require("./../app/server/modules/UserModel").User;
var accountManager = require('./../app/server/modules/AccountManager.js')(config);

describe('Account', function () {
    "use strict";
    var timeout = 10000;
    var cookieOk;
    var accountInfo;
    var url = config.url;

    var user = configTest.user1;

    var username = user.username;
    var email = user.email;
    var password = user.password;

    var profileAdmin = configTest.userAdmin;

    var profile = user;

    var profileWithdraw = configTest.userWithdraw;

    before(function (done) {
        this.timeout(timeout);
        expressApp.start(done);
    });

    after(function (done) {
        this.timeout(timeout);
        expressApp.stop(done);
    });

    var login = function (profile, callback) {
        request(url).post('/login').send(profile).expect(200).end(function (err, res) {
            if (err) {
                callback(err);
            } else {
                var cookie = res.headers['set-cookie'];
                accountInfo = res.body;
                callback(null, cookie, res.body);
            }
        });
    };

    var checkAccountResponse = function (accountResponse) {
        //console.log("accountResponse " + JSON.stringify(accountResponse));
        assert(!accountResponse.error);
        //accountResponse.authenticated.should.equal(true);
        accountResponse.username.should.equal(username);
        accountResponse.should.have.property('serverSeedHash').with.lengthOf(64);
        assert.equal(accountResponse.accounts.length, 2);
        assert(accountResponse.currentCurrency);
        accountResponse.should.have.property('balance');
        accountResponse.should.have.property('unit');
    };

    describe('Register', function () {
        it('RegisterOk', function (done) {
            this.timeout(timeout);
            console.log("delete " + username)
            accountManager.deleteUser(username, function () {
                request(url).post('/register').send(profile)
                    .expect('Content-Type', /json/)
                    .expect(200) //Status code
                    .end(function (err, res) {
                    	if(err){
                    		console.log(error);
                    		assert(false)
                    	}
                        var response = res.body;
                        console.log(response.error);
                        assert(!response.error);

                        var cookie = res.headers['set-cookie'];
                        assert.notEqual(cookie[0].indexOf("user=" + username), -1);
                        assert.notEqual(cookie[1].indexOf("pass="), -1);
                        assert.equal(response.currentCurrency, "BTC");

                        response.should.have.property("balance");
                        assert.equal(response.unit, "mBTC");
                        accountManager.getUserBalance(username, "BTC", function (error, user, account) {
                            assert(!error);
                            //console.log(JSON.stringify(account, null, 4));
                            account.should.have.property("balance");
                            assert.equal(account.betNumber, 0);
                            done();
                        });
                    });
            });
        });

        it('RegisterUsernameTooShort', function (done) {
            var profile = {
                username: "",
                email: email,
                password: password
            };
            request(url).post('/register').send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    assert(!err);
                    res.body.should.have.property("error");
                    done();
                });
        });
        it('RegisterUsernameTooLong', function (done) {
            var profile = {
                username: "qqqqqaaaaazzzzzxxxxxssssswwwwweeeee",
                email: "asdfs",
                password: password
            };
            request(url).post('/register').send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    assert(!err);
                    //console.log(res.body);
                    res.body.should.have.property("error");
                    done();
                });
        });

        it('RegisterUsernameInvalid', function (done) {
            var profile = {
                username: "$myEvil; drop table !",
                email: "asdf",
                password: password
            };
            request(url).post('/register').send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    assert(!err);
                    console.log(res.body);
                    res.body.should.have.property("error");
                    done();
                });
        });
        it('RegisterUsernameTaken', function (done) {
            request(url).post('/register').send(profile)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (error, res) {
                    if (error) {
                        console.log(error);
                        assert(false);
                    }
                    
                    res.body.error.text.should.equal("username-taken");
                    done();
                });
        });
        it('RegisterEmailInvalid', function (done) {
            var profile = {
                username: "adamdesagesseqq",
                email: "space in it  ",
                password: password
            };
            request(url).post('/register').send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    assert(!err);
                    console.log(res.body);
                    res.body.should.have.property("error");
                    done();
                });
        });
        it('RegisterEmailTooShort', function (done) {
            var profile = {
                username: "alainproviste",
                email: "lll",
                password: password
            };
            request(url).post('/register').send(profile)
                .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                    assert(!err);
                    console.log(res.body);
                    res.body.should.have.property("error");
                    done();
                });
        });
        it('RegisterEmailTaken', function (done) {
            var profile = {
                username: 'AnotherTestUser',
                email: email,
                password: password
            };
            request(url).post('/register').send(profile)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (error, res) {
                    assert(!error);
                    res.body.error.text.should.equal("email-taken");
                    done();
                });
        });
        it('RegisterEmptyEmail', function (done) {
            var profile = {
                username: "TestUserEmailEmpty",
                email: "",
                password: password
            };

            accountManager.deleteUser(profile.username, function () {
                request(url).post('/register').send(profile)
                    .expect('Content-Type', /json/).expect(200).end(function (err, res) {
                        assert(!err);
                        assert(!res.body.error);
                        done();
                    });
            });
        });
    });

    describe('LoginLogout', function () {

        it('LoginOk', function (done) {
            login(profile, function (error, cookie, response) {
                cookieOk = cookie;
                assert(!error);
                checkAccountResponse(response);
                assert.equal(response.currentCurrency, "BTC");
                done();
            });
        });

        it('LoginKo', function (done) {
            var profile = {
                username: 'idonotexist',
                password: 'aaappmm'
            };
            login(profile, function (error, cookie, response) {
                assert(!error);
                response.authenticated.should.equal(false);
                done();
            });
        });

        it('LogoutOk', function (done) {
            request(url).del('/logout')
                .set('cookie', cookieOk)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    var cookie = res.headers['set-cookie'];
                    assert.notEqual(cookie[0].indexOf("user=;"), -1);
                    assert.notEqual(cookie[1].indexOf("pass=;"), -1);
                    done();
                });
        });

        it('AutoLoginOkGuest', function (done) {
            request(url).get('/')
                .expect(200)
                .end(function (err, res) {
                    assert(!err);

                    var cookie = res.headers['set-cookie'];
                    assert.notEqual(cookie[0].indexOf("connect.sid="), -1);
                    console.log(cookie);
                    request(url).get('/accountInfo').set('cookie', cookie)
                        .expect('Content-Type', /json/).expect(200).end(function (error, res) {
                            assert(!error);
                            var response = res.body;
                            console.log(response);
                            assert.equal(response.currentCurrency, "PlayCoin");
                            assert.equal(response.balance, "100000000");
                            assert(response.guest);
                            done();
                        });
                });
        });
        it('AutoLoginRegistered', function (done) {
            login(profile, function (error, cookie, response) {
                request(url).get('/').set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    assert(!err);
                    request(url).get('/accountInfo').set('cookie', cookie)
                        .expect('Content-Type', /json/).expect(200).end(function (error, res) {
                            assert(!error);
                            var response = res.body;
                            assert.equal(response.currentCurrency, "BTC");
                            assert(!response.guest);
                            done();
                        });
                });
            });
        });
    });

    describe('AccountNotAuthenticated', function () {
        it('AccountInfoNotAuthenticated', function (done) {
            request(url).get('/accountInfo')
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (error, res) {
                    done();
                });
        });

        it('AccountBalanceNotAuthenticated', function (done) {
            var currency = "PlayCoin";
            request(url).get('/account/' + username + "/balance/" + currency)
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (error, res) {
                    done();
                });
        });
        it('DepositAddressNotAuthenticated', function (done) {
            var currency = "BTC";
            request(url).get('/account/' + username + "/depositAddress/" + currency)
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });
        it('WithdrawNotAuthenticated', function (done) {
            var currency = "BTC";
            request(url).post('/account/' + username + "/withdraw/" + currency)
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });

        it('TransactionsNotAuthenticated', function (done) {
            var currency = "BTC";
            request(url).get('/account/' + username + "/transactions/" + currency)
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });
        it('PlayNotAuthenticated', function (done) {
            var currency = "BTC";
            request(url).get("/play/" + currency)
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });
        it('BetsNotAuthenticated', function (done) {
            var currency = "BTC";
            request(url).get('/account/' + username + "/bets/" + currency)
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });
        it('AccountListNotAuthenticated', function (done) {
            var currency = "BTC";
            request(url).get("/account/")
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });
    });
    describe('AccountAuthenticated', function () {
        beforeEach(function (done) {
            login(profile, function (error, cookie, response) {
                assert(!error);
                cookieOk = cookie;
                done();
            });
        });

        afterEach(function (done) {
            done();
        });
        it('AccountListNotAdmin', function (done) {
            var currency = "BTC";
            request(url).get("/account/")
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });
        describe('AccountInfo', function () {
            it('AccountInfoOk', function (done) {
                request(url).get('/accountInfo')
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (error, res) {
                        assert(!error);
                        checkAccountResponse(res.body);
                        done();
                    });
            });
        });

        describe('AccountBalance', function () {
            it('AccountBalanceBTCOk', function (done) {
                var currency = "BTC";
                request(url).get('/account/' + username + "/balance/" + currency)
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        assert(!err);
                        var response = res.body;
                        assert.equal(response.currency, currency);
                        assert(response.balance);
                        done();
                    });
            });
            it('AccountBalancePlayCoinOk', function (done) {
                var currency = "PlayCoin";
                request(url).get('/account/' + username + "/balance/" + currency)
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        assert(!err);
                        var response = res.body;
                        assert.equal(response.currency, currency);
                        done();
                    });
            });
            it('AccountBalanceInvalidCurrency', function (done) {
                var currency = "InvalidCurrency";
                request(url).get('/account/' + username + "/balance/" + currency)
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        assert(!err);
                        var response = res.body;
                        assert.equal(response.error.text, "Invalid currency");
                        done();
                    });
            });
            it('DepositAddressBTC', function (done) {
                var currency = "BTC";
                request(url).get('/account/' + username + "/depositAddress/" + currency)
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(err);
                        assert(!err);
                        var response = res.body;
                        console.log(response);
                        response.should.have.property('depositAddress').with.lengthOf(34);
                        done();
                    });
            });
            it('DepositAddressPlayCoin', function (done) {
                var currency = "PlayCoin";
                request(url).get('/account/' + username + "/depositAddress/" + currency)
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        assert(!err);
                        var response = res.body;
                        assert.equal(response.error.text, "No deposit address for this currency");
                        done();
                    });
            });
            it('TransactionsBTC', function (done) {
                var currency = "BTC";
                request(url).get('/account/' + username + "/transactions/" + currency)
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        assert(!err);
                        var response = res.body;
                        console.log(JSON.stringify(response));
                        assert(response.transactions);
                        done();
                    });
            });
        });
        describe("Bets", function () {
            this.timeout(timeout);
            it('BetsBTC', function (done) {
                var currency = "BTC";
                request(url).get('/account/' + username + "/bets/" + currency)
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        assert(!err);
                        var response = res.body;
                        //console.log(JSON.stringify(response));
                        assert(response);
                        done();
                    });
            });
        });

        describe('AccountAdmin', function () {
            before(function (done) {
                accountManager.addNewAccount({
                    username: profileAdmin.username,
                    password: profileAdmin.password,
                    type: "admin"
                }, function (e, user) {
                    console.log(e);
                    console.log(user);
                    done();
                });
            });
            beforeEach(function (done) {
                login(profileAdmin, function (error, cookie, response) {
                    assert(!error);
                    cookieOk = cookie;
                    done();
                });
            });

            afterEach(function (done) {
                done();
            });

            it('AccountList', function (done) {
                var currency = "BTC";
                request(url).get("/account/")
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(err);
                        assert(!err);
                        var response = res.body;
                        assert(response);
                        done();
                    });
            });
        });

        describe('Home', function () {
            it('HomeAutenticated', function (done) {
                request(url).get("/home")
                    .set('cookie', cookieOk)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        done();
                    });
            });
        });
    });

    describe('RestWithdraw', function () {
        beforeEach(function (done) {
            login(profileWithdraw, function (error, cookie, response) {
                assert(!error);
                cookieOk = cookie;
                done();
            });
        });
        it('RestWithdrawBTCOk', function (done) {
            var currency = "BTC";
            var withdrawParam = {
                amount: "100000",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z"
            };

            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(err);
                    }
                    assert(!err);
                    done();
                });
        });

        it('RestWithdrawPlayCoinOk', function (done) {
            var currency = "PlayCoin";
            var withdrawParam = {
                amount: "100000",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z"
            };
            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    var response = res.body;
                    assert(!err);
                    assert(response.error);
                    done();
                });
        });
        it('RestWithdrawInvalidCurrency', function (done) {
            var currency = "ABC";
            var withdrawParam = {
                amount: "100000",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z"
            };
            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    var response = res.body;
                    assert(!err);
                    console.log(response.error);
                    assert(response.error);
                    assert.equal(response.error.text, "Invalid currency");
                    done();
                });
        });
        it('RestWithdrawInvalidAddress', function (done) {
            var currency = "BTC";
            var withdrawParam = {
                amount: "100000",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6Uzvdzxxxx"
            };
            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    var response = res.body;
                    assert(!err);
                    assert(response.error);
                    assert.equal(response.error.text, "Invalid address");
                    done();
                });
        });
        it('RestWithdrawInvalidAmount', function (done) {
            var currency = "BTC";
            var withdrawParam = {
                amount: "100,000",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z"
            };
            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    var response = res.body;
                    assert(!err);
                    assert(response.error);
                    assert.equal(response.error.text, "Invalid amount");
                    done();
                });
        });
        it('RestWithdrawEmptyAmount', function (done) {
            var currency = "BTC";
            var withdrawParam = {
                amount: "",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z"
            };
            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    var response = res.body;
                    assert(!err);
                    assert(response.error);
                    assert.equal(response.error.text, "Invalid amount");
                    done();
                });
        });
        it('RestWithdrawMinAmount', function (done) {
            var currency = "BTC";
            var withdrawParam = {
                amount: "99999",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z"
            };
            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    var response = res.body;
                    assert(!err);
                    assert(response.error);
                    assert.equal(response.error.text, "Amount to withdraw too low, minimum is 10 mBTC");
                    done();
                });
        });
        it('RestWithdrawMaxAmount', function (done) {
            var currency = "BTC";
            var withdrawParam = {
                amount: "1000000000",
                address: "mofkZd8X4Q5mYmcBqbFKKWyy6UzvdzJk5Z"
            };
            request(url).post('/account/' + username + "/withdraw/" + currency).send(withdrawParam)
                .set('cookie', cookieOk)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    var response = res.body;
                    assert(!err);
                    console.log(response.error.text);
                    assert(response.error);
                    assert.equal(response.error.text, "Withdraw amount above balance");
                    done();
                });
        });

    });
});