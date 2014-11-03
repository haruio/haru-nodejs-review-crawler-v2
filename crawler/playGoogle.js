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


exports.crawling = function(applicationId, packageName, reviewCount, callback) {
    var pageCount = parseInt( (reviewCount/config.numberOfReview) + 1);

    async.times(pageCount, function(n, next) {
        var pageNumber = n+1;
        _crawling(packageName, pageNumber, function(error, results) {
            _insertQuery(applicationId, results);
            next(error, results);
        });
    },function done(error, results) {
        // TODO send complete message
        request.get(util.format(config.successUrl,applicationId));
        if(callback){ return callback(error, results); }
    });
};

exports.requestTotal = function(applicationId, packageName, callback) {
    request(util.format(config.marketUrl, packageName, 'ko'), function(error, res, body) {
        // TODO 현재 100개 제한.

        var $ = parser.load(body);

        var total = $('meta[itemprop=ratingCount]').attr('content');
        console.log(error, parseInt(total));

        callback(error, 100);
    });
};


function _crawling(packageName, pageNumber, callback) {
    _request(config.url, {id: packageName,
        reviewSortOrder: 0,
        reviewType: 0,
        pageNum: pageNumber,
        xhr: 1}, function(error, res, body) {

        body = body.replace('\" ', '').replace(' \"', '').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u003d\\/g, '=').replace(/\\\"/g, '"');

        var mainSelector = config.mainSelector;
        var reviews = [];

        var $ = parser.load(body);

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
                id: id,
                image: auth_image,
                name: name,
                date: moment(date, 'YYYY년 MM월 DD일', 'ko').valueOf(),
                rating: rating_number,
                title: title.data,
                body: title.parent.next.data
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
    async.times(datas.length, function(n, next) {
        var data = datas[n];
        store.get('mysql').query('insert into Reviews (applicationid, commentid, imagesource, name, date, rating, title, body, market) values (?,?,?,?,?,?,?,?,?)',
            [applicationId, data.id, data.image,data.name, data.date, data.rating, data.title, data.body, 'playGoogle'], next);
    },function done(error, results) {
        if(callback) { callback(error, results); }
    });
}