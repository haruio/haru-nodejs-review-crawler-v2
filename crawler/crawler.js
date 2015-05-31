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

Crawler.prototype.initEventListener = function() {
    var self = this;

    self.on('reviews', _onReviews);
    self.on('nextPange', _onNextPage);
    self.on('error', _onError);

    function _onReviews(error, reviews){

    };
    
    function _onNextPage(error, url){

    };

    function _onError(error){

    };

};

