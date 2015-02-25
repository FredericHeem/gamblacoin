define([
    'jquery',
    'underscore',//
    'backbone', //
    'marionette', //
    'vent',
    'moment', //
    'accounting',//
    'text!template/BetResult.html'],
function ($, _, Backbone, Marionette, vent, Moment, Accounting, TemplateBetResult) {
    "use strict";

    var BetResultView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateBetResult),
        initialize: function (options) {
            this.listenTo(this.model, "change", this.render);
        },
        events: {
            'click .bet-item-view': 'clickBetDetails'
        },
        clickBetDetails: function () {
            console.log("clickBetDetails");
            vent.trigger("bet:selected", this.model);
        },
        onRender: function () {
            console.log("BetResultView onRender");
            var error = this.model.get("error");
            if (error) {
                $("#bet-detail-error", this.$el).show();
                $("#bet-detail-error", this.$el).append(error.text);
                $("table", this.$el).hide();
            }
        },

        serializeData: function () {
            return {
                Moment: Moment,
                Accounting: Accounting,
                model: this.model.toJSON(),
            };
        }
    });

    return BetResultView;
});

