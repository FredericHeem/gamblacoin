define(['jquery', 'underscore', 'backbone', 'marionette', 'accounting', //
'text!template/Withdraw.html'], //
function ($, _, Backbone, Marionette, Accounting, TemplateWithdraw) {
    "use strict";

    var WithdrawView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateWithdraw),
        events: {
            'click #withdrawSubmitButton': 'clickWithdraw'
        },

        initialize: function () {
            console.log("withdrawview initialize");
            this.listenTo(this.model, "change", this.render);
            this.ok = false;
        },

        clickWithdraw: function (event) {
            console.log('clickWithdraw');

            this.errorHide();

            var url = '/account/me/withdraw/BTC';

            var formValues = {
                address: $('#address', this.$el).val(),
                amount: $('#amount', this.$el).val()
            };

            
            var model = this.model;
            var me = this;

            if (!this.validateFormInput(formValues)) {
                return;
            }

            this.withdrawToggleUi(true);

            $.ajax({
                url: url,
                type: 'POST',
                dataType: "json",
                timeout: 30000,
                data: formValues,
                
                success: function (data) {
                    console.log("clickWithdraw ok");
                    me.withdrawToggleUi(false);
                    if (!data.error) {
                        console.log("Withdraw OK");
                        me.successShow(data);
                        
                        //TODO set model content from data
                        model.fetch();
                    } else {
                        console.log("Withdraw KO");
                        me.errorShow(data.error.text);
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    me.withdrawToggleUi(false);
                    me.errorShow("Cannot withdraw, retry later, error " + textStatus);
                }
            });
            return false;
        },

        onRender: function () {
            console.log("WithdrawView onRender");
            var me = this;
            _.defer(function () { $("#address", me.$el).trigger('focus'); });

            if (this.ok) {
                $("#alert-success-withdraw", this.$el).show();
            }
            this.keyEnterBind("clickWithdraw");

            var balance = this.model.get("balance");
            var balanceFormatted = Accounting.formatUBTC(balance, 5);
            $("#amount", this.$el).val(balanceFormatted);
            return this;
        },
        errorHide: function () {
            $('.alert').hide();
            $('.control-group').removeClass("error");
        },

        successShow: function (data) {
            $("#alert-success-withdraw", this.$el).show();
            //$("#alert-success-withdraw", this.$el).append(error.text);
            this.ok = true;
        },
        withdrawToggleUi: function (loading){
            if (loading) {
                $("#withdrawSubmitButton").button('loading');
                $("#loading-indicator").show();
                this.keyEnterUnBind();
            } else {
                $("#withdrawSubmitButton").button('reset');
                $("#loading-indicator").hide();
                this.keyEnterBind("clickWithdraw");
            }
        },
        errorShow: function (text) {
            $('.alert-error').text(text).show();
        },
        validateFormInput: function (formValue) {
            var amount = formValue.amount = Accounting.unformat(formValue.amount) * 100000;
            if (!amount) {
                this.errorShow("Invalid amount");
                return false;
            }
            var address = formValue.address;
            if (!address) {
                this.errorShow("Invalid address");
                return false;
            }

            return true;
        }
    });

    return WithdrawView;
});

