/**
 * Created by syntaxfish on 14. 11. 6..
 */
var amqp = require('amqplib/callback_api');
var queue = require('./config').mqueue.crawler;
var crawler = require('./crawler');
var config = require('./config');
var store = require('haru-nodejs-store');


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
            console.log(" [*] Waiting for messages. To exit press CTRL+C");
        });

        function doWork(msg) {
            var body = JSON.parse(msg.content);
            console.log(" [%s] Received %s : %d",process.pid, body.market, body.page);
            crawler[body.market].crawling( body ,function(error, results) {
                console.log(" [%s] Done %s : %d",process.pid, body.market, body.page);
                ch.ack(msg);
            });
        }
    });
}

amqp.connect(queue.url, on_connect);