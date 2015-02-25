define([
    'underscore',//
    'backbone',//
    'marionette',//
    'moment',//
    'text!template/TransactionsView.html'
],
function (_, Backbone, Marionette, Moment, TemplateTransactions) {
    "use strict";
    var TransactionsView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateTransactions),
        initialize: function (options) {
            this.listenTo(this.model, "change", this.render);
        },
        onRender: function () {
            console.log("TransactionsView onRender");
        },
        serializeData: function () {
            return {
                Moment: Moment,
                model: this.model.toJSON()
            };
        }
    });

    return TransactionsView;
});

