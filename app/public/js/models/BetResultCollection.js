define(['jquery', 'underscore', 'backbone', 'models/BetResultModel'], function ($, _, Backbone, BetResultModel) {
    "use strict";
    var BetResultCollection = Backbone.Collection.extend({
        model: BetResultModel
    });

    return BetResultCollection;
});
