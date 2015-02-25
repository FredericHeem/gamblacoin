define(['backbone'], function (Backbone) {
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

    var PreferenceModel = Backbone.Model.extend({
        defaults: {
            clientSeed: ""
        },

        initialize: function (attrs, options) {
            this.options = options;
        },
        sync: function (method, model, options) {
            if (!window.localStorage) return;
            var item_name = this.options.key;
            console.log("PreferenceModel method: " + method);
            if (method == 'create' || method == 'update') {
                localStorage.setItem(item_name, JSON.stringify(model.toJSON()));
            } else if (method == 'read') {
                var prefs = localStorage.getItem(item_name);
                if (prefs) {
                    try {
                        prefs = JSON.parse(prefs);
                    } catch (e) { }
                    options.success(prefs);
                } else {
                    if (!this.get("clientSeed")) {
                        this.set("clientSeed", createClientSeed());
                        this.save();
                    }
                }
            } else {
                throw "not (yet) supported";
            }
        }
    });

    return PreferenceModel;
});
