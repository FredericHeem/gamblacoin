/*global window */
define(['jquery', 'underscore', 'backbone', 'marionette',//
'text!template/User.html'], //
function ($, _, Backbone, Marionette, TemplateUser) {
    "use strict";
    var UserView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateUser),
        events: {
            'click #userSaveEmailSubmitButton': 'clickSaveEmail',
            'click #userSavePasswordSubmitButton': 'clickSavePassword',
            'click #userSaveClientSeedSubmitButton': 'clickSaveClientSeed'
        },

        initialize: function () {
            console.log("Userview initialize");
            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.options.preference, "change", this.render);
        },

        clickSaveClientSeed: function () {
            console.log('clickClientSeed');
            var newClientSeed = $("#inputClientSeed", this.$el).val();
            if (newClientSeed) {
                this.options.preference.set("clientSeed", newClientSeed);
                this.options.preference.save();
            }
        },

        clickSaveEmail: function () {
            console.log('clickSaveEmail');
            this.errorHide();

            var url = '/account/me/updateEmail';
            if (!this.validateEmail(this)) {
                return;
            }

            var formValues = {
                email: $('#email').val()
            };

            var model = this.model;
            var me = this;
            $.ajax({
                url: url,
                type: 'POST',
                dataType: "json",
                data: formValues,
                timeout: 30000,
                beforeSend: function () {
                    console.log('clickSaveEmail beforeSend');
                    $("#userSaveEmailSubmitButton").button('loading');
                    $("#SaveEmailLoadingIndicator-indicator").show();
                },
                success: function (data) {
                    $("#userSaveEmailSubmitButton").button('reset');
                    $("#SaveEmailLoadingIndicator").hide();
                    
                    console.log(["Saved email details: ", data]);
                    var error = data.error;
                    if (error) {
                        var errorText = data.error.text;
                        if (errorText === "email-taken") {
                            $('#email-cg').addClass("error");
                            errorText = "Email already taken";
                        } else {
                            errorText = "Cannot update email, retry later";
                        }
                        me.errorShowEmail(errorText);
                    } else {
                        me.model.set("email", formValues.email);
                        $("#alert-success-email").show();
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    me.errorShowEmail("Cannot save email, retry later");
                }
            });
            return false;
        },
        clickSavePassword: function () {
            console.log('clickSavePassword');
            this.errorHide();

            var url = '/account/me/updatePassword';

            var formValues = {
                passwordOld: $('#passwordOld').val(),
                passwordNew: $('#passwordNew').val(),
                passwordNewCheck: $('#passwordNewCheck').val()
            };

            if (!this.validatePassword(formValues)) {
                return;
            }

            var model = this.model;
            var me = this;
            $.ajax({
                url: url,
                type: 'POST',
                dataType: "json",
                data: formValues,
                timeout: 30000,
                beforeSend: function () {
                    console.log('clickSavePassword beforeSend');
                    $("#userSavePasswordSubmitButton").button('loading');
                    $("#SavePasswordLoadingIndicator-indicator").show();
                },
                success: function (data) {
                    $("#userSavePasswordSubmitButton").button('reset');
                    $("#SavePasswordLoadingIndicator").hide();
                    $("#alert-success-password").show();
                    console.log(["Saved email details: ", data]);
                    var error = data.error;
                    if (error) {
                        var errorText = data.error;
                        me.errorShowPassword(errorText);
                    } else {
                        
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    me.errorShowPassword("Cannot save password, retry later");
                }
            });
            return false;
        },

        onRender: function () {
            console.log("UserView onRrender" + this.model.toJSON());
            return this;
        },
        serializeData: function () {
            return {
                model: this.model.toJSON(),
                preference: this.options.preference.toJSON()
            };
        },
        errorHide: function () {
            $('.alert-error').hide();
            $('.control-group').removeClass("error");
        },

        errorShowEmail: function (text) {
            $("#userSaveEmailSubmitButton").button('reset');
            $("#SaveEmailLoadingIndicator").hide();
            $('#alert-error-email').text(text).show();
        },

        errorShowPassword: function (text) {
            $("#userSavePasswordSubmitButton").button('reset');
            $("#SavePasswordLoadingIndicator").hide();
            $('#alert-error-password').text(text).show();
        },
        validateEmail: function () {
            var email = $('#email').val();
            if (email.length === 0) {
                $('#email-cg').addClass("error");
                this.errorShowEmail("Invalid email address");
                return false;
            }

            if (email === this.model.get("email")) {
                $('#email-cg').addClass("error");
                this.errorShowEmail("Same email address as currently set");
                return false;
            }

            return true;
        },

        validatePassword: function (passwordValues) {
            var passwordOld = passwordValues.passwordOld;
            var passwordNew = passwordValues.passwordNew;
            var passwordNewCheck = passwordValues.passwordNewCheck;

            if (passwordNew.length < 6) {
                $('.password-cg').addClass("error");
                this.errorShowPassword("Password must be at least 6 characters");
                return false;
            }

            if (passwordNew !== passwordNewCheck) {
                console.log("password mismatch");
                $('.password-cg').addClass("error");
                this.errorShowPassword("Passwords mismatch");
                return false;
            }

            return true;
        }
    });

    return UserView;
});

