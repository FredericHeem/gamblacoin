define([
    'jquery',
    'underscore',//
    'backbone', //
    'marionette',
    'vent',
    'moment',
    'backgrid',//
    'paginator',//
    'accounting',//
    'text!template/MyBets.html'],
function ($, _, Backbone, Marionette, vent, moment, Backgrid, Paginator, Accounting, TemplateMyBets) {
    "use strict";

    var RedRow = Backgrid.Row.extend({
        events: {
            'click': 'onClick'
        },
        render: function () {
            Backgrid.Row.prototype.render.call(this);
            this.$el.css("cursor", "pointer");
            return this;
        },
        onClick: function () {
            console.log("row onClick " + this.model.get('betId'));
            vent.trigger("bet:selected", this.model);
        }
    });

    var MyBetsView = Backbone.Marionette.Layout.extend({
        template: _.template(TemplateMyBets),
        initialize: function (options) {
            this.listenTo(this.model, "change", this.render);

            this.myBetsModel = options.myBetsModel;
            this.listenTo(this.myBetsModel, "add", this.render);


            this.columns = [
                {
                    name: "betId",
                    label: "Bet Id",
                    editable: false,
                    cell: "string"
                },
                {
                    name: "win",
                    label: "Win",
                    editable: false,
                    cell: "string"
                },
                {
                    name: "bet",
                    label: "Bet ",
                    editable: false,
                    cell: Backgrid.StringCell.extend({
                        className: "amount-cell",
                        formatter: {
                            fromRaw: function (rawValue) {
                                return Accounting.formatUBTC(rawValue);
                            }
                        }
                    })
                },
                {
                    name: "payout",
                    label: "Payout",
                    editable: false,
                    cell: "string"
                },
                {
                    name: "roll",
                    label: "Roll",
                    editable: false,
                    cell: Backgrid.StringCell.extend({
                        className: function () {
                            var classNameWin = this.model.get("win") ? 'cellwin' : 'cellloose';
                            return classNameWin;
                        }
                    })
                },
                {
                    name: "targetNumber",
                    label: "Target",
                    editable: false,
                    cell: "string"
                },
                {
                    name: "profitLoss",
                    label: "Profit Loss",
                    editable: false,
                    cell: Backgrid.StringCell.extend({
                        className: function () {
                            var classNameWin = this.model.get("win") ?  'cellwin' :  'cellloose';
                            return classNameWin + " amount-cell";
                        },
                        formatter: {
                            fromRaw: function (rawValue) {
                                return Accounting.formatUBTC(rawValue);
                            }
                        }
                    })
                },
                {
                    name: "date",
                    label: "Date",
                    editable: false,
                    cell: Backgrid.StringCell.extend({
                        formatter: {
                            fromRaw: function (rawValue) {
                                return moment(rawValue).format('h:mm:ss A D MMM YYYY');
                            }
                        }
                    })
                },
            ];
        },
        
        onRender: function () {
            console.log("MyBetsView render");

            var betNumber = this.model.get("betNumber");
            console.log("myBets number " + betNumber);
            if (betNumber) {
                this.myBetsModel.state.totalRecords = betNumber;
                this.myBetsModel.state.totalPages = Math.floor(betNumber / 10) + 1;
                this.myBetsModel.state.lastPage = Math.floor(betNumber / 10) + 1;
                this.grid = new Backgrid.Grid({
                    className: "table table-hover",
                    row: RedRow,
                    columns: this.columns,
                    collection: this.myBetsModel,
                });

                $("#myBetsGrid", this.$el).append(this.grid.render().$el);

                this.paginator = new Backgrid.Extension.Paginator({
                    collection: this.myBetsModel
                });

                // Render the paginator
                $(".backgrid-paginator", this.$el).remove();
                $("#myBetsGridPaginator", this.$el).append(this.paginator.render().$el);
            }

            return this;
        },
        serializeData: function () {
            return {
                model: this.model.toJSON(),
                Accounting: Accounting,
            };
        }
    });

    return MyBetsView;
});

