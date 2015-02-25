define(['jquery', 'underscore', 'backbone', 'marionette', 'accounting', 'moment',//
'text!template/Main.html',//
'views/PlayView',
'views/BetLiveView'], //
function ($, _, Backbone, Marionette, Accounting, moment, TemplateMain, PlayView, BetLiveView) {
    "use strict";

    var MainView = Backbone.Marionette.Layout.extend({
        template: _.template(TemplateMain),
        regions: {
            play: "#play-container",
            betAll: '#betsall-view',
            betMy: '#mybet-view'
        },
        initialize: function (options) {
            console.log("MainView initialize");
            var gameInfoModel = options.gameInfoModel;
            var preferenceModel = options.preferenceModel;
            var betResultAllCollection = options.betResultAllCollection;
            var betResultMyCollection = options.betResultMyCollection;

            this.playView = new PlayView({
                model: this.model,
                gameInfoModel: gameInfoModel,
                preferenceModel: preferenceModel
            });

            this.betLiveAllView = new BetLiveView({
                model: this.model,
                collection: betResultAllCollection,
                displayUser: true
            });

            this.betLiveMyView = new BetLiveView({
                model: this.model,
                collection: betResultMyCollection,
                displayUser: false
            });
        },
    
        onRender: function () {
            console.log("MainView render");
            this.play.show(this.playView);
            this.betAll.show(this.betLiveAllView);
            this.betMy.show(this.betLiveMyView);
            return this;
        },
        showMyBetsTab: function () {
            $('a[href=#mybet-view]', this.$el).tab('show');
        },
        setBetAllCount : function(betCount){
            $('#bet-all-count', this.$el).text(betCount);
        }
    });

    return MainView;
});

