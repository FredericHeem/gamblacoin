define([
    'underscore',//
    'backbone', //
    'marionette', //
    'views/TransactionsView',//
    'text!template/Deposit.html'],
function (_, Backbone, Marionette, TransactionsView, TemplateDeposit) {
    "use strict";
    var DepositView = Backbone.Marionette.Layout.extend({
        template: _.template(TemplateDeposit),
        regions: {
            transactions: ".transactions"
        },
        initialize: function (options) {
            this.listenTo(this.model, "change", this.render);

            this.transactionsModel = options.transactionsModel;
            this.listenTo(this.transactionsModel, "change", this.render);
            this.transactionsView = new TransactionsView({ model: this.transactionsModel });
        },
        onRender: function () {
            console.log("DepositView onRender");
            this.transactions.show(this.transactionsView);
        },
        serializeData: function () {
            return {
                model: this.model.toJSON()
            };
        }
    });

    return DepositView;
});

