/**
 * Created by syntaxfish on 14. 11. 1..
 */
var request = require('request');
var config = require('./amazon.json');
var _ = require('underscore');
var parser = require('whacko');
var util = require('util');
var async = require('async');
var moment = require('moment');
var store = require('haru-nodejs-store');

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
    _requestTotal(packageName, function(error, total) {
        // TODO 현재 100개 제한.

        console.log(error, total);

        callback(error, 100);
    });
};



function _insertQuery(applicationId, datas, callback) {
    async.times(datas.length, function(n, next) {
        var data = datas[n];
        store.get('mysql').query('insert into Reviews (applicationid, commentid, imagesource, name, date, rating, title, body, market) values (?,?,?,?,?,?,?,?,?)',
            [applicationId, data.id, data.image,data.name, data.date, data.rating, data.title, data.body, 'amazon'], next);

    },function done(error, results) {
        if(callback) { callback(error, results); }
    });
}


function _requestTotal( packageName, callback ) {
    _request(util.format(config.url, packageName, 1, 1), function (error, res, html) {
        var mainSelector = config.mainSelector;
        var $ = parser.load(html);

        var match = $(mainSelector);
        if( match.length === 0 ) {
            log.info('[%s:%d]: amazon fail', packageName, 1 );
            return _requestTotal(packageName, callback);
        }

        var total = $('div.a-row.a-spacing-medium.customerReviews').find('span.a-size-medium')[1].children[0].data.replace(/,/g, '');
        callback( error, parseInt(total) );
    });
};

function _crawling(packageName, pageNumber, callback) {
    var reviews = [];

    _request(util.format(config.url, packageName, pageNumber, pageNumber), function (error, res, html) {
        var mainSelector = config.mainSelector;
        var $ = parser.load(html);

        var match = $(mainSelector);

        if( match.length === 0 ) {
            log.info('[%s:%d]: amazon fail', packageName, pageNumber );
            return _crawling(packageName, pageNumber, callback);
        }

        for( var i = 0; i < match.length; i++ ){
            var id = match[i].attribs.id;
            var name = match.find('div.a-row span.review-byline a.a-link-normal.author')[i].children[0].data;
            var date = match.find('div.a-row span.a-color-secondary.review-date')[i].children[0].data;
            var rating_string =  match.find('div.a-row a.a-link-normal i')[i].attribs.class.split('a-icon-star')[1];
            var rating_number = Number(rating_string.match(/\d+/)[0]);
            var title = match.find('div.a-row a.a-link-normal.review-title.a-color-base.a-text-normal.a-text-bold')[i].children[0].data;
            var body = match.find('div.a-row.a-spacing-top-mini.review-data div.a-section.review-text')[i].children[0].data;

            reviews.push( {
                id: id,
                image: '',
                name: name,
                date: moment(date, 'YYYY년 MM월 DD일').valueOf(),
                rating: rating_number,
                title: title,
                body: body
            });
        }

        if(callback){ return callback(error, reviews); }
    });
}

function _request(url, callback){
    var  amazon_options = {
        url: url,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.8,en-UxS;q=0.6,en;q=0.4',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Host':'www.amazon.com'
        }
    };

    request(amazon_options, callback);
};