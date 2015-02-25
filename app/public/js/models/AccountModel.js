define(['backbone'], function (Backbone) {
    "use strict";

    var AccountModel = Backbone.Model.extend({
        url: function () {
            return '/account/me/balance/' + this.get("currency");
        },
        defaults: {
            username: "",
            balance: "0",
            currency: "",
            betNumber:0
        },
        initialize: function () {
        
        },
        
    });

    return AccountModel;
});
