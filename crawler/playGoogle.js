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

exports.calcPageCount = function(reviewCount) {
    return parseInt( (reviewCount/config.numberOfReview) + 1);
};


function _insertQuery(applicationId, datas, callback) {
    var bulk = [];
    for( var i = 0; i < datas.length; i++ ) {
        bulk.push(_.values(datas[i]));
    }

    store.get('mysql').query('insert into Reviews (commentid, imagesource, name, date, rating, title, body, applicationid, location, market) VALUES ?', [bulk], callback);
}


function _crawling(body, callback) {
    _request(config.url, {id: body.packageName,
        reviewSortOrder: 0,
        reviewType: 0,
        pageNum: body.page,
        xhr: 1,
        hl: body.location}, function(error, res, html) {

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
            var title = $(mainSelector).find('.review-body span.review-title')[i].children[0] || {data: '', parent:{next: {data: ''}}};
            var rating_number = 0;
            var utc = 0;

            if( body.location === 'ko' ) {
                // 2014년 11월 3일
                utc = moment(date, 'YYYY년 MM월 DD일').valueOf();
                // 별표 5개 만점에 5개로 평가했습니다.
                rating_number = Number(rating_string.split('만점에 ')[1].match(/\d+/)[0]);
            } else if( body.location == 'en') {
                // October 16, 2014
                utc = moment(date, 'MMM DD, YYYY', 'en').valueOf();
                // Rated 5 stars out of five stars
                rating_number = Number(rating_string.match(/\d+/)[0]);
            } else if( body.location == 'ja') {
                // 2014年7月9日
                utc = moment(date, 'YYYY年MM月DD日', 'ja').valueOf();
                // 5つ星のうち5つ星で評価しました
                rating_number = Number(rating_string.split('つ星のうち')[1].match(/\d+/)[0]);
            } else if( body.location == 'de') {
                // 11. Februar 2013
                utc = moment(date, 'DD. MMM YYYY', 'de').valueOf();
                // Mit 3 von fünf Sternen bewertet
                rating_number = Number(rating_string.match(/\d+/)[0]);

            } else if( body.location == 'fr') {
                // 17 novembre 2012
                utc = moment(date, 'DD MMM YYYY', 'fr').valueOf();
                // 5 étoiles sur cinq
                rating_number = Number(rating_string.match(/\d+/)[0]);
            }

            reviews.push( {
                commentid: id,
                imagesource: auth_image,
                name: name,
                date: utc,
                rating: rating_number,
                title: title.data,
                body: title.parent.next.data,
                applicationid: body.applicationId,
                location: body.location,
                market: 'playGoogle'
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
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Accept-Language': 'ko-KR,ko;q=0.8,en-UxS;q=0.6,en;q=0.4'
        },
        formData: body
    };

    request(google_store_options, callback);
};
