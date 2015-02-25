/*global window*/
define(['jquery', 'underscore', 'backbone', 'marionette', 'accounting',//
    'text!template/UserNav.html'], //
function ($, _, Backbone, Marionette, Accounting, TemplateUserNav) {
    "use strict";

    var UserNavView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateUserNav),
        events: {
            'click #logout': 'logout'
        },
        initialize: function (options) {
            console.log("UserNavView initialize");
            this.listenTo(this.model, "change:username", this.render);
            this.listenTo(this.model, "change:balance", this.updateBalance);
        },
        logout: function (e) {
            console.log("logout");
            e.preventDefault();
            var model = this.model;
            $.ajax(
                {
                    type: 'DELETE',
                    url: '/logout',
                    success: function () {
                        window.location.replace('/');
                    }
                });
        },
        onRender: function () {
            console.log("UserNavView " + this.model.get("betNumber"));
            return this;
        },
        serializeData: function () {
            return {
                model: this.model.toJSON(),
                Accounting: Accounting,
            };
        },
        updateBalance : function(balance){
        	$("#balance", this.$el).text(Accounting.formatUBTC(this.model.get("balance")));
        }
    });

    return UserNavView;
});

