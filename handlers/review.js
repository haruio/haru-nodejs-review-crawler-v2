var _ = require('underscore');
var async = require('async');

var crawler = require('../crawler');

var store = require('haru-nodejs-store');

exports.fetch = function(input, callback) {
    var options = input.options;

    var markets = Object.keys(options);

    async.times(markets.length, function(n, next) {
        var market = markets[n];
        var option = options[market];

        option['market'] = market;
        
        var output = {};

        if( typeof crawler[market] === 'object'){
            _reviewCount(input.applicationId, option, function(error, results) {
                crawler[market].crawling(input.applicationId, option.packageName, results);
                output[market] = results;
                next(error, output);
            });
        } else {
            next(null, null);
        }

    },function done(error, results) {
        var json = {};

        results.forEach(function(market) {
            _.extend(json, market);
        });

        callback(error, json);
    });

};


function _reviewCount(applicationId, option, callback) {
    async.waterfall([
        function requestCount(callback) {
            // Reqeust Web
            crawler[option.market].requestTotal(applicationId, option.packageName, callback);
        }, function selectCount(reviewCount, callback) {
            // DB select
            var key = applicationId+':'+option.market+':'+'reviewCount';
            store.get('public').multi().get(key)
                .set(key, reviewCount)
                .exec(function(error, results) {
                    var oldCount = results[0] || 0;

                    callback(null, reviewCount - oldCount);
                });
        }
    ], function done(error, result) {
        callback(error, result);
    });
};


