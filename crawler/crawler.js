/**
 * Created by syntaxfish on 15. 5. 31..
 */
"use strict";

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

function Crawler(options) {
    this.options = options;
    this.initEventListener();
    EventEmitter.call(this);
};

inherits(Crawler, EventEmitter);

Crawler.prototype.crawling = function(store, target) {
    var self = this;

    store.crawling(target, function(error, reviews) {
        if( error ) { return self.emit('error', error); }

        self.emit('reviews', error, target, reviews);
    });
};

Crawler.prototype.initEventListener = function() {
    var self = this;

    self.on('reviews', _onReviews);
    self.on('nextPage', _onNextPage);
    self.on('error', _onError);

    function _onReviews(error, target, reviews){
        async.series([
            _insertQuery,
            _sendNextPageToMQ
        ], function done(error, results) {
            if(error) { return self.emit('error', error); }

        });
        
        function _insertQuery(callback){
            var marketCommentIdKey = keys.marketCommentIdKey(options.applicationId, options.market, options.location);

            var multi = store.get('public').multi();
            for( var i = 0; i < datas.length; i++ ) {
                multi.sadd(marketCommentIdKey, datas[i].commentid);
            }

            multi.exec(function(error, results) {
                var count = 0;
                var bulk = [];

                for(var i = 0; results && i < results.length; i++ ) {
                    if( results[i] ) { bulk.push(_.values(datas[i])); }
                    count += results[i];
                }


                if( count === 0 ) { return callback(new Error('ER_DUP_ENTRY'), []); }
                if( options.page === 1) { slack.emit('reviews', null, options, bulk); }


                store.get('mysql').query("insert into Reviews (commentid, imagesource, name, date, rating, title, body, applicationid, location, market, strdate) VALUES ?", [bulk], callback);
            });
        };

        function _sendNextPageToMQ(callback){
            target.page++;
            var randomTime = _.random(config.crawlerInterval.min, config.crawlerInterval.max);
            setTimeout(function(){
                rabbitmq.publish('crawler', JSON.stringify(target), callback);
            }, randomTime);
        };

    };
    
    function _onError(error){

    };
};



var crawler = new Crawler();

crawler.crawling(googlepaly, target, function (error) {
    if(error) { }

    rabbitmq.ack(msg);
});


// 1 queue에서 job을 꺼내온다.
// 2 crawling을 한다.
// 3 저장한다

