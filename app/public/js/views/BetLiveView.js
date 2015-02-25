define(['jquery', 'underscore', 'backbone', 'marionette', 'vent', 'accounting', 'moment',//
'models/BetResultModel',
'text!template/BetLive.html',
'text!template/BetItem.html'], //
function ($, _, Backbone, Marionette, vent, Accounting, moment, BetResultModel, TemplateBetLive, TemplateBetItem) {
    "use strict";

    var BetItemView = Backbone.Marionette.ItemView.extend({
        template: _.template(TemplateBetItem),
        events : {
            'click .bet-item-view': 'clickBetDetails'
        },
        clickBetDetails : function(){
            console.log("clickBetDetails");
            vent.trigger("bet:selected", this.model);
        },
        initialize: function (options) {
            this.displayUser = options.displayUser;
        },
        
        serializeData: function () {
            return {
                model: this.model.toJSON(),
                profitColor: this.model.get("win") ? "cellwin" : "cellloose",
                displayUser: this.displayUser,
                Accounting: Accounting,
                Moment: moment
            };
        }
    });

    var BetLiveView = Backbone.View.extend({

        initialize: function (options) {
            console.log("BetLiveView initialize displayUser " + options.displayUser);
            this.displayUser = options.displayUser;
            _(this).bindAll('add', 'remove');

            this._betItemViews = [];
            
            this.collection.bind('add', this.add);
            this.collection.bind('remove', this.remove);
        },

        render: function () {
            console.log("BetLiveView render #items " + this.collection.length);
            
            this.$el.html(_.template(TemplateBetLive, { displayUser: this.displayUser, }));
            this.collection.each(this.add);
            return this;
        },

        add: function (betItemModel) {
            //console.log("BetLive view add");
            
            var $row = this.creatBetRow(betItemModel);
            var $result = $row.css('display', 'none').insertAfter($(".betsview-header", this.$el));
            $result.slideDown(1000);
        },
        remove: function (betItemModel) {
            //console.log("BetLive view remove");
            if (this._betItemViews.length > 0) {
                this._betItemViews[0].remove();
                this._betItemViews.splice(0, 1);
            }
        },
        creatBetRow: function (betItemModel) {
            //console.log("creatBetRow");
            var betItemView = new BetItemView({ model: betItemModel, displayUser: this.displayUser });
            this._betItemViews.push(betItemView);
            var $row = betItemView.render().$el;
            var betId = betItemModel.get("betId");
            var currency = betItemModel.get("currency");
            if (betId) {
                $row.css("cursor", "pointer");
                $row.attr("href", "#/betResult/" + currency + "/" + betId);
            }

            return $row;
        }
    });

    return BetLiveView;
});

