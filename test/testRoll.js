/*global describe, it, before, after, beforeEach, afterEach */
/* jslint node: true */
var winston = require('winston');
var should = require('should');
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var crypto = require('crypto');
var bigdecimal = require("bigdecimal");
var config = require('./../app/server/Config')();
var configTest = require('./ConfigTest.js')();
var dice = require("./../app/server/modules/Dice")();

describe('Dice', function () {
    "use strict";
    var timeout = 100000;
    var clientSeed = configTest.clientSeed;
    var betNumber = 0;

    describe('Roll', function () {
        this.timeout(timeout);
        it('RollMain', function (done) {
            var clientSeed = "01234567";
            var maxRoll = 10100;
            //Increase for more precision
            var getRollMax = maxRoll * 2;
            var rollArray = [];
            for (var i = 0; i <= maxRoll; i++) {
                rollArray[i] = 0;
            }

            for (var betNumber = 1; betNumber <= getRollMax; betNumber++) {
                var serverSeed = dice.createServerSeed();
                var roll = dice.getRoll(serverSeed, clientSeed, betNumber, maxRoll);
                rollArray[roll - 1] = rollArray[roll - 1] + 1;
                //console.log(roll + " " + rollArray[roll]);
            }

            var fs = require('fs');

            var rollResultFile = fs.openSync("rollArray.csv", "w");
            var written = 0;
            for(var j = 0; i < maxRoll; i++){
                written = fs.writeSync(rollResultFile, rollArray[j] + "\n", null);
            }
            fs.closeSync(rollResultFile);
            console.log("RollMain done");
            done();
        });
       
    });   
});
