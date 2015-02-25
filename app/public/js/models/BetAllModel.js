define(['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {
    "use strict";
    var BetAllModel = Backbone.Model.extend({
        url: function () {
            return '/bets/' + this.get("currency");
        },
        
        initialize: function (options) {
            this.options = options;
        }
    });

    return BetAllModel;
});
