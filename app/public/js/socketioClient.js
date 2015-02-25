define(['jquery', 'underscore', 'backbone', 'accounting', 'moment'//
], //
function ($, _, Backbone, Accounting, Moment) {
    "use strict";
    console.log("socketioClient");

    var client = {
        socket: 0,
        start: function () {
            this.socket = io.connect();
            this.socket.on('connecting', function () {
                console.log("socketioClient connecting ");
            });

            this.socket.on('connect', function () {
                console.log("socketioClient connect ");
                this.socket.emit("getBetsLast");
            });

            this.socket.on('error', function () {
                console.log("socketioClient error: ");
            });

        }
    };
    
    //var socket = io.connect('http://localhost');

    return client;
});