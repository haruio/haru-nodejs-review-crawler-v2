/**
 * Created by syntaxfish on 14. 11. 6..
 */
var amqp = require('amqplib/callback_api');
var queue = require('./config').mqueue.crawler;
var crawler = require('./crawler');
var config = require('./config');
var store = require('haru-nodejs-store');

var RabbitMq = require('./connectors/rabbitmq');
var rabbitmq = new RabbitMq({crawler: config.mqueue.crawler});

var _ = require('underscore');


store.connect(config.store);

function bail(err, conn) {
    console.error(err);
    if (conn) conn.close(function() { process.exit(1); });
}

function on_connect(err, conn) {
    if (err !== null) return bail(err);
    process.once('SIGINT', function() { conn.close(); });

    var q = 'crawler';

    conn.createChannel(function(err, ch) {
        if (err !== null) return bail(err, conn);
        ch.assertQueue(q, {durable: true}, function(err, _ok) {
            ch.consume(q, doWork, {noAck: false});
            ch.prefetch(1, true);
            console.log(" [*] Waiting for messages. To exit press CTRL+C");
        });

        function doWork(msg) {
            var body = JSON.parse(msg.content);
            //console.log(" [%s] Received %s : %d",process.pid, body.market, body.page);
            crawler[body.market].crawling( body ,function(error, results) {
                //console.log(" [%s] Done %s : %d",process.pid, body.market, body.page);
                ch.ack(msg);

                console.log('[%s] p: %d %s', body.market, body.page, body.location);
                //console.log(error);

                if( error && error.message === 'ER_DUP_ENTRY' ) {
                    // MySql 중복시 crawling 완료
                    log.info('[%s] complete crawling market: %s, page: %d, location: %s', process.pid, body.market, body.page, body.location);
                    crawler[body.market].requestSuccessUrl(body);
                } else if( error && body.page === 1 ) {
                    // page === 1에서 오류 발생시 마켓 정보 오류
                } else if ( error ) {
                    // 첫 crawling 완료
                    //crawler[body.market].requestSuccessUrl(body);
                } else {
                    // 다음 페이지 crawling 진행
                    body.page++;

                    (function(body) {
                        var randomTime = _.random(config.crawlerInterval.min, config.crawlerInterval.max);
                        setTimeout(function(){
                            rabbitmq.publish('crawler', body);
                        }, randomTime);

                    })(body);
                }
            });
        }
    });

    conn.on('close', function(error) {
        //console.log('[close] : ', error);
    });

    conn.on('error', function(error) {
        //console.log('[error] : ',error);
        setTimeout(function(){
            //console.log('try reconnect...');
            amqp.connect(queue.url, on_connect);
        }, 1000);
    });


}

amqp.connect(queue.url, on_connect);