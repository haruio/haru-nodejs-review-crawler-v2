/**
 * Created by syntaxfish on 14. 11. 6..
 */
var crawlers = require('./crawler');
var store = require('haru-nodejs-store');

var keys = require('haru-nodejs-util').keys;

var _ = require('underscore');

var RabbitMQ = require('./connectors/rabbitmq.js');
var rabbitmq = new RabbitMQ();

store.connect(config.store);

rabbitmq.consume('crawler', {}, function(err, target, ack) {
    if(err) {
        console.log(err.stack);
        process.exit(1);
    }

    var crawler = crawlers[target.market];
    if(crawler) {
        console.log(target);
        crawler.crawling(target, function(error, result) {
            if(error && error.message === 'ER_DUP_ENTRY') {
                // TODO error handling
                //log.info('[%s] complete crawling market: %s, page: %d, location: %s', process.pid, body.market, body.page, body.location);
                console.log(error.message);
            } else {
                // 다음 페이지 crawling 진행
                _publishNextPage(target, function() {
                    _markCrawlingJob(target);
                    ack();
                });
            }


        });
    }
});

process.once('SIGINT', function() {
    rabbitmq.emit('SIGINT');
});

function _markCrawlingJob(target) {
    if( target.page === 1) {
        target.timestamp = Date.now();
        store.get('public').zadd(keys.crawlingTimeZsetKey(), Date.now(), JSON.stringify(target) );
    }
};

function _publishNextPage(target, callback) {
    target.page++;
    var randomTime = _.random(config.crawlerInterval.min, config.crawlerInterval.max);
    setTimeout(function(){
        rabbitmq.publish('crawler', JSON.stringify(target), callback);
    }, randomTime);
}