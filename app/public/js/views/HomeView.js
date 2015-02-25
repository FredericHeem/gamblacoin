define(['jquery', 'underscore', 'backbone', 'marionette',//
'text!template/Home.html'], //
function ($, _, Backbone, Marionette, TemplateHome) {
    "use strict";
    var HomeView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateHome),
    });

    return HomeView;
});

