/*global window */
define(['jquery', 'underscore', 'backbone', 'marionette', //
'text!template/Register.html'], //
function ($, _, Backbone, Marionette, TemplateRegister) {
    "use strict";

    var RegisterView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateRegister),
        events: {
            'click #registerSubmitButton': 'clickRegister'
        },

        initialize: function () {
            console.log("Registerview initialize");
        },

        clickRegister: function () {
            console.log('clickRegister');
            this.errorHide();

            var url = '/register';
            if (!this.validate()) {
                return;
            }

            var formValues = {
                username: $('#username').val(),
                password: $('#password').val(),
                email: $('#email').val()
            };
            var model = this.model;
            var me = this;
            console.log('clickRegister send request');
            $.ajax({
                url: url,
                type: 'POST',
                dataType: "json",
                data: formValues,
                timeout: 30000,
                beforeSend: function () {
                    console.log('clickRegister beforeSend');
                    $("#registerSubmitButton").button('loading');
                    $("#loading-indicator").show();
                    me.keyEnterUnBind();
                },
                success: function (data) {
                    console.log("Register response: " +  JSON.stringify(data, null, 4));
                    if (!data.error) {
                        model.clear().set(data);
                        window.location.replace('#');
                    } else {
                        console.log("Registration KO");
                        var error = data.error.text;
                        if (data.error.text === "username-taken") {
                            $('#username-cg').addClass("error");
                            error = "Username already taken";
                        } else if (data.error.text === "email-taken") {
                            $('#email-cg').addClass("error");
                            error = "Email already taken";
                        }
                        me.errorShow(error);
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    me.errorShow("Cannot register, retry later");
                }
            });
            return false;
        },

        onRender: function () {
            console.log("RegisterView onRender");
            var me = this;
            _.defer(function () { $("#username", me.$el).trigger('focus'); });
            this.keyEnterBind("clickRegister");
            return this;
        },
        errorHide: function () {
            $('.alert-error').hide();
            $('.control-group').removeClass("error");
        },

        errorShow: function (text) {
            $("#registerSubmitButton").button('reset');
            $("#loading-indicator").hide();
            this.keyEnterBind("clickRegister");
            $('.alert-error').text(text).show();
        },

        validate: function () {
            var username = $('#username').val();
            if (username.length < 4) {
                $('#username-cg').addClass("error");
                this.errorShow("Username must be at least 4 characters");
                return false;
            }

            var email = $('#email').val();
            if (email) {
                var emailRegex = /\S+@\S+\.\S+/;
                if (!(email.length >= 4 && email.length <= 32 && email.match(emailRegex))) {
                    this.errorShow("Invalid email");
                    return false;
                }
            }

            var password = $('#password').val();

            if (password.length < 6) {
                $('.password-cg').addClass("error");
                this.errorShow("Password must be at least 6 characters");
                return false;
            }

            var password_check = $('#password_check').val();
            if (password !== password_check) {
                console.log("password mismatch");
                $('.password-cg').addClass("error");
                this.errorShow("Passwords mismatch");
                return false;
            }

            return true;
        }

    });

    return RegisterView;
});

