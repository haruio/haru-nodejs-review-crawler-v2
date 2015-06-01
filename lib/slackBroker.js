/**
 * Created by syntaxfish on 15. 6. 1..
 */
var config = require('../config/config.default.json');


module.exports  = Slack = slackBroker = (function() {
    "use strict";
    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var Slack = require('node-slackr');
    var util = require('util');


    function SlackBroker() {
        this.options = config.slack;
        this.initEventListener();
        this.slack = new Slack(this.options.url, this.options.config);
        this.colors = {
            appStore: '#A5A5A5',
            playGoogle: '#94C147'
        };
        EventEmitter.call(this);
    };

    inherits(SlackBroker, EventEmitter);


    SlackBroker.prototype.initEventListener = function() {
        var self = this;


        self.on('reviews', function (error, target, reviews) {
            if(target.applicationId.indexOf('mon') >= 0) {
                // moncast리뷰만 notify 한다.
                self.slack.notify(_buildMessage(target, reviews));
            }
        });



        function _buildMessage(target, reviews){
            var payload = {
                text: util.format('*[%s]* %s(%s) 스토어에 새로운 리뷰 *%d개* 등록되었습니다.\n', target.applicationId ,target.market,target.location,reviews.length),
                attachments: []
            };
            var color = self.colors[target.market];

            for (var i = 0; i < reviews.length; i++) {
                var rawReview = reviews[i];
                payload.attachments.push({
                    color: color,
                    title: util.format('[:star: x %d] %s\n',  rawReview[4], rawReview[5]),
                    pretext: util.format('%s commented %s', rawReview[2], rawReview[10]),
                    text: util.format('%s', rawReview[6]),
                    mrkdwn_in: ["text", "pretext"]
                });
            }

            return payload;
        }
    };
    
    SlackBroker.prototype.notify = function(text) {
        this.slack.notify(text)
    };

    return new SlackBroker();
})();