define(['jquery', 'underscore', 'backbone', 'marionette',//
'text!template/Login.html'], //
function ($, _, Backbone, Marionette, TemplateLogin) {
    "use strict";

    var LoginView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateLogin),
        events: {
            'click #loginSubmitButton': 'clickLogin'
        },

        initialize: function (options) {
            this.router = options.router;
            console.log("loginview initialize");
        },

        clickLogin: function (event) {
            console.log('clickLogin');

            this.errorHide();

            var url = '/login';

            var formValues = {
                username: $('#username').val(),
                password: $('#password').val()
            };
            var model = this.model;
            var me = this;

            $.ajax({
                url: url,
                type: 'POST',
                dataType: "json",
                timeout: 30000,
                data: formValues,
                beforeSend: function () {
                    $("#loginSubmitButton").button('loading');
                    $("#loading-indicator").show();
                    me.keyEnterUnBind();
                },
                success: function (data) {
                    console.log("clickLogin ok");

                    if (!data.error) {
                        console.log("Authenticated OK");
                        model.clear().set(data);
                        me.router.navigate('/', { trigger: true });
                    } else {
                        console.log("Authenticated KO");
                        me.errorShow(data.error.text);
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    me.errorShow("Cannot login, retry later");
                }
            });
            return false;
        },

        onRender: function () {
            var me = this;
            _.defer(function () { $("#username", me.$el).trigger('focus'); });
            this.keyEnterBind("clickLogin");
            return this;
        },
        errorShow: function (text) {
            $('.alert-error').text(text.toString()).show();
            $("#loginSubmitButton").button('reset');
            this.keyEnterBind("clickLogin");
            $("#loading-indicator").hide();
        },
        errorHide: function () {
            $('.alert-error').hide();
            $('.control-group').removeClass("error");
        }

    });

    return LoginView;
});

