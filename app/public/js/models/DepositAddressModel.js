define(['backbone'], function (Backbone) {
    "use strict";

    var DepositAddressModel = Backbone.Model.extend({
        url: function () {
            return '/account/me/depositAddress/' + this.get("currency");
        },
        defaults: {
            depositAddress: ""
        }
    });

    return DepositAddressModel;
});
