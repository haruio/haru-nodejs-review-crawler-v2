/**
 * Created by syntaxfish on 15. 6. 1..
 */
var config = require('../config/config.default.json');


module.exports = slackBroker = (function() {
    "use strict";
    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var Slack = require('node-slackr');
    var util = require('util');


    function SlackBroker() {
        this.options = config.slack;
        this.initEventListener();
        this.slack = new Slack(this.options.url, this.options.config);
        EventEmitter.call(this);
    };

    inherits(SlackBroker, EventEmitter);


    SlackBroker.prototype.initEventListener = function() {
        var self = this;


        self.on('reviews', function (error, target, reviews) {
            //console.log(target, reviews);
            self.slack.notify(_buildMessage(target, reviews));
        });

        function _buildMessage(target, reviews){
            var message = util.format('[%s:%s] 새로운 리뷰 %d개 등록\n', target.market,target.location,reviews.length);
            var baseFormat = "[%d] %s: <<%s>> %s\n";

            for (var i = 0; i < reviews.length; i++) {
                var rawReview = reviews[i];
                message = message.concat(util.format(baseFormat, rawReview[4], rawReview[2], rawReview[5], rawReview[6]));
            }

            return {"text": message};

        }
    };

    return new SlackBroker();
})();
