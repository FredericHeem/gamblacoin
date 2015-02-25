define(['backbone'], function (Backbone) {
    "use strict";

    var TransactionsModel = Backbone.Model.extend({
        url: function () {
            return '/account/me/transactions/' + this.get("currency");
        },
    });

    return TransactionsModel;
});
