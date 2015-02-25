define(['backbone'], function (Backbone) {
    "use strict";

    var UserModel = Backbone.Model.extend({
        url: '/accountInfo',
        defaults: {
            currentCurrency: "",
            accounts: [],
            serverSeedHash: "",
        },
        initialize: function (options) {
            console.log("UserModel initialize");
        },
        parse: function (user, xhr) {
            this.set(user);
            //console.log("UserModelParse: " + JSON.stringify(user, null, 4));
            return user;
        }
    });

    return UserModel;
});
