require.config({
    deps: ["app"],

    paths: {
        jquery: 'vendor/jquery-1.10.1.min',
        underscore: 'vendor/underscore-min',
        backbone: 'vendor/backbone-min',
        jqueryui: 'vendor/jquery-ui-1.8.11.custom.min',
        bootstrap: 'vendor/bootstrap.min',
        moment: 'vendor/moment.min',
        text: 'vendor/text',
        accounting: 'vendor/accounting.min',
        backbonepoller: 'vendor/backbone.poller.min',
        backgrid: 'vendor/backgrid.min',
        "backbone-pageable": 'vendor/backbone-pageable',
        paginator: 'vendor/backgrid-paginator.min',
        marionette: 'vendor/backbone.marionette.min',
        "backbone.wreqr": 'vendor/backbone.wreqr.min'
    },
    shim: {
        'jqueryui': {
            deps: ['jquery'],
        },
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'bootstrap': {
            deps: ['jquery']
        },
        'underscore': {
            exports: '_'
        },
        'backbone-pageable': {
            deps: ['underscore', 'backbone'],
        },
        'backgrid': {
            deps: ['jquery', 'underscore', 'backbone'],
            exports: 'Backgrid'
        },
        'paginator': {
            deps: ['backgrid']
        },
        'marionette': {
            deps: ['jquery', 'underscore', 'backbone'],
            exports: 'Marionette'
        }
    }
});

