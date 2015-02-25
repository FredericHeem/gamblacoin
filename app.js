/*global require, process, __dirname */
console.log("NODE_ENV: " + process.env.NODE_ENV);
var expressApp = require('./app/server/ExpressApp.js')(__dirname);
expressApp.start();
