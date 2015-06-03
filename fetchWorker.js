/**
 * Created by syntaxfish on 15. 6. 1..
 */

(function() {
    "use strict";

    var RabbitMq = require('./connectors/rabbitmq');
    var rabbitmq = new RabbitMq();
    var store = require('haru-nodejs-store');
    var config = require('./config/config.default.json');
    var _ = require('underscore');
    var async = require('async');
    var moment = require('moment');


    store.connect(config.store);

    store.get('public').hgetall('review:fetch', function(error, jobs) {
        var values = _.values(jobs);
        async.timesSeries(values.length, function(n, next) {
            rabbitmq.publish('crawler', values[n], {}, function() {
                next();
            });
        },function done(error, results) {
            store.get('public').set('review:last:fetch', moment.format('YYYY-MM-DD hh:mm:ss'), function() {
                process.exit(1);
            });
        });
    });
})();