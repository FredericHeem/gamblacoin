/*global describe, it, before, after, beforeEach, afterEach */
/* jslint node: true */
var log = require('winston');
var should = require('should');
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var expressApp = require('./../app/server/ExpressApp.js')(__dirname + "/../");
var config = require('./../app/server/Config')();
var configTest = require('./ConfigTest.js')();

describe('BitcoinRest', function () {
    "use strict";
    var timeout = 10000;
    var account = "TestUserToRegister";
    var url = config.url;
    var user = configTest.user1;
    var username = user.username;
    var email = user.email;
    var password = user.password;

    var profile = {
        username: username,
        email: email,
        password: password
    };

    before(function (done) {
        this.timeout(timeout);
        expressApp.start(done);
    });

    after(function (done) {
        this.timeout(timeout);
        expressApp.stop(done);
    });

    describe('BitcoinRest', function () {
        it('BitcoinRestGetInfo', function (done) {
            request(url).get('/bitcoin/getInfo').expect(200).end(function (err, res) {
                assert(!err);
                var response = res.body;
                assert(response.version);
                assert(response.connections);
                log.info(response);
                done();
            });
        });
        it('BitcoinRestListAccounts', function (done) {
            request(url).get('/bitcoin/listAccounts').expect(200).end(function (err, res) {
                assert(!err);
                var response = res.body;
                assert(response);
                log.info(response);
                done();
            });
        });

    });
});