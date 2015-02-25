define(['jquery', 'underscore', 'backbone', 'marionette', 'vent', 'accounting', 'moment',//
'text!template/Play.html'], //
function ($, _, Backbone, Marionette, vent, Accounting, moment, TemplatePlay) {
    "use strict";

    function createClientSeed() {
        var text = "";
        var possible = "0123456789";
        var seedSize = 8;
        for (var i = 0; i < seedSize; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        console.log("createClientSeed: " + text);
        return text;
    }

    function findNearestIndex(array, valueCurrent) {
        var index = 0;
        array.forEach(function (value) {
            if (+valueCurrent > +value) {
                index = index + 1;
            } else {
                return;
            }
        });
        return index;
    }

    var PlayView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplatePlay),
        events: {
            'click .btn-play': 'clickPlay',
            'click .btn-setbet': 'clickSetBet',
            'click .btn-min-payout': 'setMinPayout',
            'click .btn-increment-payout': 'setIncrementPayout',
            'click .btn-decrement-payout': 'setDecrementPayout',
            'click .btn-max-payout': 'setMaxPayout',
            'click .btn-min-bet': 'setMinBet',
            'click .btn-increment-bet': 'setIncrementBet',
            'click .btn-decrement-bet': 'setDecrementBet',
            'click .btn-max-bet': 'setMaxBet'
        },

        initialize: function (options) {
            console.log("PlayView initialize");
            this.gameInfoModel = options.gameInfoModel;
            this.preferenceModel = options.preferenceModel;
            this.listenTo(this.gameInfoModel, "change", this.render);
        },

        serializeData: function () {
            return {
                model: this.model.toJSON()
            };
        },
        showError: function (error) {
            console.log("showError");
            $(".alert", this.$el).text(error.text);
            $(".alert", this.$el).show();
        },

        hideError: function () {
            console.log("hideError");
            $(".alert", this.$el).hide();
        },

        showBet: function (betResult, currency) {
            console.log("showBet");
            vent.trigger("betResult", betResult, currency);
        },
        
        updateBalance: function (data) {
            console.log("updateBalance");
            if (!data.currency) {
                return;
            }
            
            console.log("updateBalance: " + this.model.get("balance") + " to " + data.userBalance + ", bn " + data.betNumberPlayer);
            this.model.set("balance", data.userBalance);
            this.model.set("betNumberPlayer", data.betNumberPlayer);
        },
        updateGain: function () {
            var gain = this.betCurrent * this.payoutCurrent;
            console.log("updateGain " + gain);
            if (gain) {
                var gain_formatted = Accounting.formatUBTC(gain);
                var unit = this.model.get("unit");
                $(".btn-play", this.$el).text("Play for " + gain_formatted + " " + unit);
            }
        },
        displayBetAndPayout: function () {
            var bet_formatted = Accounting.formatUBTC(this.betCurrent);
            $("#bet-amount", this.$el).text(bet_formatted);
            $("#payout-amount", this.$el).text(this.payoutCurrent);

            this.gameInfoModel.set("bet_current", this.betCurrent);
            this.gameInfoModel.set("payout_current", this.payoutCurrent);
            this.updateGain();
        },
        clickSetBet: function (event) {
        },

        setMinPayout: function (event) {
            this.payoutCurrent = this.gameInfoModel.get("payout_min");
            this.displayBetAndPayout();
        },
        setIncrementPayout: function (event) {
            var payoutStep = this.gameInfoModel.get("payout_step");
            var payoutIndex = findNearestIndex(payoutStep, this.payoutCurrent);
            var winMax = this.gameInfoModel.get("win_max");
            payoutIndex = payoutIndex + 1;
            if (payoutStep.length > payoutIndex) {
                var nextPayout = payoutStep[payoutIndex];
                this.payoutCurrent = nextPayout;
                if (nextPayout * this.betCurrent > winMax) {
                    var nextBet = Math.floor(winMax / nextPayout);
                    this.betCurrent = nextBet;
                }
                this.displayBetAndPayout();
            } else {
                this.setMaxPayout();
            }
        },
        setDecrementPayout: function (event) {
            var payoutStep = this.gameInfoModel.get("payout_step");
            var payoutIndex = findNearestIndex(payoutStep, this.payoutCurrent);
            payoutIndex = payoutIndex - 1;
            if (payoutIndex >= 0) {
                var nextPayout = payoutStep[payoutIndex];
                this.payoutCurrent = nextPayout;
                this.displayBetAndPayout();
            }
        },
        setMaxPayout: function (event) {
            var payoutMax = this.gameInfoModel.get("payout_max");
            var winMax = this.gameInfoModel.get("win_max");
            this.payoutCurrent = payoutMax;
            if (this.betCurrent * payoutMax > winMax) {
                this.betCurrent = winMax / payoutMax;
                
            }
            this.displayBetAndPayout();
        },
        setMinBet: function (event) {
            this.betCurrent = this.gameInfoModel.get("bet_min");
            this.displayBetAndPayout();
        },
        setIncrementBet: function (event) {
            var betStep = this.gameInfoModel.get("bet_step");
            var winMax = this.gameInfoModel.get("win_max");
            var betIndex = findNearestIndex(betStep, this.betCurrent);
            betIndex = betIndex + 1;
            if (betStep.length > betIndex) {
                var betNext = betStep[betIndex];
                this.betCurrent = betNext;
                if (betNext * this.payoutCurrent > winMax) {
                    var payout = Math.floor(winMax / betNext);
                    this.payoutCurrent = payout;
                }
                this.displayBetAndPayout();
            } else {
                this.setMaxBet(event);
            }
        },
        setDecrementBet: function (event) {
            var betStep = this.gameInfoModel.get("bet_step");
            var betIndex = findNearestIndex(betStep, this.betCurrent);
            betIndex = betIndex - 1;
            if (betIndex >= 0) {
                this.betCurrent = betStep[betIndex];
                this.displayBetAndPayout();
            }
        },
        setMaxBet: function (event) {
            var betMax = this.gameInfoModel.get("bet_max");
            var winMax = this.gameInfoModel.get("win_max");
            var payoutMin = this.gameInfoModel.get("payout_min");
            this.betCurrent = Math.floor(winMax / payoutMin);
            this.payoutCurrent = payoutMin;
            this.displayBetAndPayout();
        },
        
        clickPlay: function (event) {
            console.log("clickPlay");
            event.preventDefault();

            this.hideError();
            var url = '/play';
            var bet = $('#bet-amount', this.$el).text();
            var payout = $("#payout-amount", this.$el).text();
            var currentCurrency = "BTC";
            var clientSeed = this.options.preferenceModel.get("clientSeed");
            console.log('clickPlay bet ' + bet + ", amount " + payout + ", client seed " + clientSeed);
            var currency = this.model.get("currentCurrency");
            var formValues = {
                bet: this.betCurrent,
                payout: this.payoutCurrent,
                currency: currency,
                clientSeed: clientSeed
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
                    //$("#loginSubmitButton").button('loading');
                    //$("#loading-indicator").show()
                    me.keyEnterUnBind();
                },
                success: function (data) {
                    console.log(["Play request details: ", data]);
                    //me.keyEnterBind("clickPlay");
                    //$("#loginSubmitButton").button('reset');
                    //$("#loading-indicator").hide()
                    if (data.error) {
                        me.showError(data.error);
                    } else {
                        me.showBet(data, currency);
                    } 
                    me.updateBalance(data);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    //me.keyEnterBind("clickPlay");
                    me.showError("Cannot play, retry later");
                }
            });
            return false;
        },

        onRender: function () {
            console.log("PlayView onRender");
            this.betCurrent = this.gameInfoModel.get("bet_current");
            this.payoutCurrent = this.gameInfoModel.get("payout_current");
            this.displayBetAndPayout();

            return this;
        }
    });

    return PlayView;
});

