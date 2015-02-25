define(['jquery', 'underscore', 'backbone', //
'text!template/Home.html'], //
function ($, _, Backbone, TemplateHome) {
    "use strict";
    var HomeView = Backbone.View.extend({
        events: {
        },
        initialize: function () {
        },
        render: function () {
            console.log("HomeView");
            var data = {};
            var compiledTemplate = _.template(TemplateHome, data);
            this.$el.html(compiledTemplate);
            return this;
        }
    });

    return HomeView;
});

