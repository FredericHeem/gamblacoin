define(['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {
    "use strict";
    var GameInfoModel = Backbone.Model.extend({
        url: function () {
            return '/betInfo/' + this.get("currency");
        },
        // 100, 000, 000 Satoshi = 1 BTC, $1 = BTC0.01, $0.01 = BTC0.0001 = mBTC0.1 = 10ksat  
        defaults: {
            currency: "BTC",
            unit: "satoshi",
            bet_min: "",
            bet_current: "",
            bet_max: "",
            payout_min: "",
            payout_current: "",
            payout_max: "",
            win_max: "",
            house_edge: 1
        },
        initialize: function (options) {
            this.options = options;
        }
    });

    return GameInfoModel;
});
