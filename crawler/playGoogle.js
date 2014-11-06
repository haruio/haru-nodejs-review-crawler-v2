/**
 * Created by syntaxfish on 14. 11. 1..
 */
var request = require('request');
var config = require('./playGoogle.json');
var _ = require('underscore');
var parser = require('whacko');
var async = require('async');
var moment = require('moment');
var store = require('haru-nodejs-store');
var util = require('util');


exports.crawling = function(option, callback) {
    async.waterfall([
        function crawling(callback) {
            _crawling(option, function(error, results) {
                callback(error, results);
            });
        },
        function insertQuery(results, callback) {
            _insertQuery(option.applicationId, results, function(error, results) {
                callback(error, results);
            });
        }
    ], function done(error, results) {
        //request.get(util.format(config.successUrl, body.applicationId));

        if(callback){ return callback(error, results); }
    });
};

exports.requestTotal = function(applicationId, packageName, callback) {
    request(util.format(config.marketUrl, packageName, 'ko'), function(error, res, body) {
        // TODO 현재 100개 제한.

        var $ = parser.load(body);

        var total = $('meta[itemprop=ratingCount]').attr('content');
        console.log(total);

        callback(error, total);
    });
};

exports.calcPageCount = function(reviewCount) {
    return parseInt( (reviewCount/config.numberOfReview) + 1);
};


function _crawling(body, callback) {
    _request(config.url, {id: body.packageName,
        reviewSortOrder: 0,
        reviewType: 0,
        pageNum: body.page,
        xhr: 1}, function(error, res, html) {

        html = html.replace('\" ', '').replace(' \"', '').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u003d\\/g, '=').replace(/\\\"/g, '"');

        var mainSelector = config.mainSelector;
        var reviews = [];

        var $ = parser.load(html);

        var el = mainSelector;// + ' ' + selector.selector;
        var match = $(el);

        for( var i = 0; i < match.length; i++ ){
            var id = $(mainSelector).find('div.review-header')[i].attribs['data-reviewid'];
            var auth_image = $(mainSelector).find('a img.author-image')[i] ? $(mainSelector).find('a img.author-image')[i].attribs.src : '';
            var name = $(mainSelector).find('.review-header .review-info .author-name a')[i] ? $(mainSelector).find('.review-header .review-info .author-name a')[i].children[0].data : '';
            var date = $(mainSelector).find('.review-header .review-info .review-date')[i] ? $(mainSelector).find('.review-header .review-info .review-date')[i].children[0].data : '';
            var rating_string = $(mainSelector).find('.review-header .review-info .review-info-star-rating .tiny-star.star-rating-non-editable-container')[i] ? $(mainSelector).find('.review-header .review-info .review-info-star-rating .tiny-star.star-rating-non-editable-container')[i].attribs['aria-label'] : '';
            var rating_number = Number(rating_string.split('만점에 ')[1].match(/\d+/)[0]);
            var title = $(mainSelector).find('.review-body span.review-title')[i].children[0] || {data: '', parent:{next: {data: ''}}};

            reviews.push( {
                commentid: id,
                imagesource: '',
                name: name,
                date: moment(date, 'YYYY년 MM월 DD일').valueOf(),
                rating: rating_number,
                title: title.data,
                body: title.parent.next.data,
                applicationid: body.applicationId,
                location: body.location,
                market: 'amazon'
            });
        }

        if(callback){ return callback(error, reviews); }

    });
};

function _request(url, body, callback){
    var  google_store_options = {
        url: url,
        method: 'POST',
        headers: {
            'User-Agent': 'request',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        formData: body
    };

    request(google_store_options, callback);
};

function _insertQuery(applicationId, datas, callback) {
    var bulk = [];
    for( var i = 0; i < datas.length; i++ ) {
        bulk.push(_.values(datas[i]));
    }

    store.get('mysql').query('insert into Reviews (commentid, imagesource, name, date, rating, title, body, applicationid, location, market) VALUES ?', [bulk], callback);
}