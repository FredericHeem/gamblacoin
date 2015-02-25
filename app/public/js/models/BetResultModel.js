define(['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {
    "use strict";
    var BetResultModel = Backbone.Model.extend({
        url: function () {
            return '/bet/' + this.get("currency") + "/" + this.get("betId");
        },
        defaults: {
            currency: "BTC"
        },
        initialize: function (options) {
            this.options = options;
        }
    });

    return BetResultModel;
});
