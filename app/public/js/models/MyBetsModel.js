define(['jquery', 'underscore', 'backbone', 'backbone-pageable'//
], function ($, _, Backbone, PageableCollection) {
    "use strict";
    Backbone.PageableCollection = PageableCollection;
    var MyBet = Backbone.Model.extend({});

    var MyBets = Backbone.PageableCollection.extend({
        model: MyBet,
        url: function () {
            //return '/account/me/bets/' + this.get("currency");
            return '/account/me/bets/BTC';
        },
        state: {
            pageSize: 10,
            totalRecords: 10,
        },
        queryParams: {
            currentPage: "current_page",
            pageSize: "page_size"
        }
    });

    return MyBets;
});
