/*global require*/
define(['jquery', 'underscore', 'backbone', 'backbonepoller', 'vent',//
'models/UserModel',//
'models/PreferenceModel',//
'models/GameInfoModel',//
'models/AccountModel',//
'models/DepositAddressModel',//
'models/TransactionsModel',//
'models/MyBetsModel',//
'models/BetResultModel',//
'models/BetResultCollection',//
'views/UserView',//
'views/UserNavView',//
"views/LoginView",//
"views/HomeView",//
"views/RegisterView",//
"views/DepositView",//
"views/MainView", //
"views/MyBetsView", //
"views/BetResultView", //
"views/WithdrawView", //
"socketioClient"//
], function ($, _, Backbone, BackbonePoller, vent,//
    UserModel, PreferenceModel, GameInfoModel, AccountModel, DepositAddressModel, TransactionsModel, MyBetsModel, BetResultModel, BetResultCollection,//
    UserView, UserNavView, LoginView, HomeView, RegisterView, DepositView, MainView, MyBetsView, BetResultView, WithdrawView,//
    socketioClient) {
    "use strict";
    console.log("router.js");
    var App;
    _.extend(Backbone.View.prototype, {
        keyEnterBind: function (action) {
            var me = this;
            this.$el.bind('keyup', function (evt) {
                if (evt.keyCode === 13) {
                    evt.stopPropagation();
                    me[action]();
                }
            });
        },
        keyEnterUnBind: function () {
            this.$el.unbind('keyup');
        }
    });

    var AppRouter = Backbone.Router.extend({
        initialize: function (options) {

            this.pollingDelay = 10000;
            var me = this;

            this.collections = {
                betResultAll: new BetResultCollection(),
                betResultMy: new BetResultCollection()
            };

            this.models = {
                gameInfo: new GameInfoModel(),
                preference: new PreferenceModel({}, { key: 'prefs' }),
                btcDepositAddress: new DepositAddressModel({ currency: "BTC" }),
                transactions: new TransactionsModel({ currency: "BTC" }),
                myBets: new MyBetsModel({ currency: "BTC" }),
                user: new UserModel(),
                account: new AccountModel(),
                betResult: new BetResultModel()
            };

            this.views = {
                login: new LoginView({ model: this.models.user, router: this }),
                register: new RegisterView({ model: this.models.user }),
                home: new HomeView({ model: this.models.user }),
                usernav: new UserNavView({
                    el: $('#usernav').get(0),
                    model: this.models.user,
                    accountModel: this.models.account
                }),
                myBets: new MyBetsView({
                    model: this.models.user,
                    myBetsModel: this.models.myBets
                }),
                betResult: new BetResultView({ model: this.models.betResult })
            };

            this.btcDepositAddressPoller = BackbonePoller.get(this.models.btcDepositAddress, { delay: this.pollingDelay });
            this.transactionsPoller = BackbonePoller.get(this.models.transactions, { delay: this.pollingDelay });
            var poller = BackbonePoller.get(this.models.user, { delay: this.pollingDelay }).start();

            this.models.preference.fetch();

            this.models.user.on('change', function () {
                var username = me.models.user.get("username");
                var currentCurrency = me.models.user.get("currentCurrency");
                console.log("username " + username + ", currentCurrency " + currentCurrency);

                me.models.btcDepositAddress.set("username", username);
                me.models.transactions.set("username", username);
            });

            this.models.user.on('change:currentCurrency', function () {
                var currentCurrency = me.models.user.get("currentCurrency");
                console.log("change:currentCurrency: " + currentCurrency);

                me.models.gameInfo.set("currency", currentCurrency);
                me.models.gameInfo.fetch().done(function () {
                    console.log("bet model ok");
                }).fail(function (xhr) {
                    console.log("bet model ko");
                });

            });
            vent.on("bet:selected", function (betResult) {
                console.log("bet:selected" + JSON.stringify(betResult));
                var currency = betResult.get("currency");
                if (!currency) {
                    currency = "BTC";
                }

                me.navigate("betResult/" + currency + "/" + betResult.get("betId"));
                me.betResult(currency, betResult.get("betId"));
            });

            vent.on("ajaxError", function (code) {
                console.error("ajaxError: " + code);
                if (code === 401) {
                    me.navigate("login");
                    me.login();
                }
            });

            vent.on("betResult", function (betResult, currency) {
                console.log("vent betResult" + JSON.stringify(betResult));
                if (currency === "BTC") {
                    me.views.main.setBetAllCount(betResult.betId);
                    me.addBetResult(me.collections.betResultAll, betResult, currency);
                } else {
                    me.views.main.showMyBetsTab();
                }
                me.addBetResult(me.collections.betResultMy, betResult, currency);
            });

            socketioClient.start();
            socketioClient.socket.on('betsAll', function (bets) {
                if (bets.length === 0) {
                    //console.error("no bets");
                } else {
                    var betCount = bets[bets.length - 1].betId;
                    console.log("socketioClient betsAll: #new bets " + bets.length + ", bet count " + betCount);
                    
                    for (var i = bets.length - 1; i >= 0 ; i--) {
                        var bet = bets[i];
                        me.addBetResult(me.collections.betResultAll, bet);
                    }

                    if (me.views.main) {
                        var betAllCount = me.collections.betResultAll.last().get("betId");
                        me.views.main.setBetAllCount(betAllCount);
                    }
                }
            });
        },

        addBetResult: function (betResultCollection, bet) {
            //console.log("addBetResult id: " + bet.betId);
            if (!bet.betId) {
                bet.betId = bet.betNumberPlayer;
            }
            if (bet.betId) {
                var bets = betResultCollection.where({ betId: bet.betId });
                if (bets.length === 0) {
                    //console.log("addBetResult adding new bet ");
                    var betItemModel = new BetResultModel(bet);
                    betResultCollection.add(betItemModel);
                    if (betResultCollection.length > 12) {
                        //console.log("addBetResult remove first");
                        betResultCollection.remove(betResultCollection.at(0));
                    }
                } else {
                    //console.log("addBetResult bet already in");
                }
            } 
        },
        routes: {
            "": "play",
            "home": "home",
            "play": "play",
            "login": "login",
            "register": "register",
            "withdraw": "withdraw",
            "deposit": "deposit",
            "myBets": "myBets",
            "betResult/:currency/:betId": "betResult",
            "account": "account"
        },
        showView: function (view) {
            console.log("showView");
            $(".collapse").collapse('hide');
            this.btcDepositAddressPoller.stop();
            this.transactionsPoller.stop();
            App.mainRegion.show(view);
        },
        home: function () {
            console.log("Home");
            this.showView(this.views.home);
        },
        account: function () {
            console.log("Account");
            this.views.user = new UserView({
                model: this.models.user,
                preference: this.models.preference
            });
            this.showView(this.views.user);
        },
        play: function () {
            console.log("Play");
            this.views.main = new MainView({
                model: this.models.user,
                gameInfoModel: this.models.gameInfo,
                preferenceModel: this.models.preference,
                betResultAllCollection: this.collections.betResultAll,
                betResultMyCollection: this.collections.betResultMy
            });
            this.showView(this.views.main);
            socketioClient.socket.emit("getBetsLast");
        },
        login: function () {
            console.log("login");
            this.showView(this.views.login);
        },
        register: function () {
            console.log("register");
            this.showView(this.views.register);
        },
        withdraw: function () {
            console.log("withdraw");
            this.views.withdraw = new WithdrawView({ model: this.models.user });
            this.showView(this.views.withdraw);
        },

        deposit: function () {
            console.log("deposit");
            this.views.deposit = new DepositView({
                model: this.models.btcDepositAddress,
                transactionsModel: this.models.transactions
            });
            this.showView(this.views.deposit);
            this.btcDepositAddressPoller.start();
            this.transactionsPoller.start();
        },
        myBets: function () {
            this.showView(this.views.myBets);
            this.models.myBets.fetch({ reset: true });
        },
        betResult: function (currency, betId) {
            console.log("router betResult id: " + betId + ", currency: " + currency);
            this.models.betResult.set({ currency: currency, betId: betId });
            this.models.betResult.fetch({ reset: true });
            this.showView(this.views.betResult);
        }
    });

    var initialize = function (options) {
        App = require('app');
        console.log("Router initialize: " + JSON.stringify(options));
        var appRouter = new AppRouter(options);
        Backbone.history.start();
    };

    return {
        initialize: initialize
    };
});