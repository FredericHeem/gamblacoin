/*global describe, it, before, after*/
var winston = require('winston');

var expressApp = require('./../app/server/ExpressApp.js')(__dirname + "/../");
var should = require('should');
var assert = require('assert');
var request = require('supertest');
var mongoose = require('mongoose');
var async = require('async');
var config = require('./../app/server/Config')();
var configTest = require('./ConfigTest.js')();
var accountManager = require('./../app/server/modules/AccountManager.js')(config);

describe('Mongodb', function () {
    "use strict";
    var cookie;
    var url = config.url;
    var userAdmin = configTest.userAdmin;
    var username = userAdmin.username;
    var password = userAdmin.password;

    var profile = {
        username: username,
        password: password
    };

    before(function (done) {
        cookie = undefined;
        async.series([function (callback) {
            expressApp.start(callback);
        }, function (callback) {
            createAdminUser(callback);
        }], function (err) {
            assert(!err);
            done();
        });
    });

    after(function (done) {
        expressApp.stop(done);
    });

    var login = function (profile, callback) {
        console.log("login");
        request(url).post('/login').send(profile).expect(200).end(function (err, res) {
            if (err) {
                assert(false);
                callback(err);
            } else {
                cookie = res.headers['set-cookie'];
                assert(cookie);
                callback(null);
            }
        });
    };

    var createAdminUser = function (done) {
        console.log("createAdminUser");
        accountManager.addNewAccount({
            username: username,
            password: password,
            type: "admin"
        }, function (e, user) {
            console.log(e);
            console.log(user);
            done();
        });
    };

    var status = function (done, response) {
        console.log("status " + cookie);
        request(url).get('/mongodb/status').set('cookie', cookie)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (err, res) {
            done(null, res.body);
        });
    };

    describe('MongodbNotAuthenticated', function () {
        it('status', function (done) {
            request(url).get('/mongodb/status')
            .expect('Content-Type', /json/)
            .expect(401)
            .end(function (err, res) {
                done();
            });

        });
        it('Disconnect', function (done) {
            request(url).post('/mongodb/disconnect')
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    done();
                });
        });
        it('Connect', function (done) {
            request(url).post('/mongodb/connect')
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function (err, res) {
                    //assert(err);
                    done();
                });
        });
    });

    describe('MongodbAuthenticated', function () {
        before(function (done) {
            login(profile, done);
        });

        it('MongodbAuthenticatedStatus', function (done) {
            status(function (error, response) {
                console.log(response);
                response.should.have.property("status");
                done();
            });
        });
        it('Disconnect', function (done) {
            request(url).post('/mongodb/disconnect').set('cookie', cookie)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    assert(!err);
                    //console.log(res.body);
                    res.body.should.have.property("disconnected");
                    status(done);
                });
        });
        it('Connect', function (done) {
            request(url).post('/mongodb/connect').set('cookie', cookie)
                .expect('Content-Type', /json/)
                .expect(200) //Status code
                .end(function (err, res) {
                    assert(!err);
                    //console.log(res.body);
                    res.body.should.have.property("connected");
                    status(done);
                });
        });
    });
});