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
    _requestTotal(packageName, function(error, total) {
        // TODO 현재 100개 제한.
        console.log(total);

        callback(error, total);
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
    var reviews = [];

    _request(util.format(config.url, body.packageName, body.page, body.page), function (error, res, html) {
        var mainSelector = config.mainSelector;
        var $ = parser.load(html);

        var match = $(mainSelector);

        if( match.length === 0 ) {
            log.info('[%s:%d]: amazon fail', body.packageName, body.page );
            return _crawling(body, callback);
        }

        for( var i = 0; i < match.length; i++ ){
            var id = match[i].attribs.id;
            var name = match.find('div.a-row span.review-byline a.a-link-normal.author')[i].children[0].data;
            var date = match.find('div.a-row span.a-color-secondary.review-date')[i].children[0].data;
            var rating_string =  match.find('div.a-row a.a-link-normal i')[i].attribs.class.split('a-icon-star')[1];
            var rating_number = Number(rating_string.match(/\d+/)[0]);
            var title = match.find('div.a-row a.a-link-normal.review-title.a-color-base.a-text-normal.a-text-bold')[i].children[0].data;
            var _body = match.find('div.a-row.a-spacing-top-mini.review-data div.a-section.review-text')[i].children[0].data;

            reviews.push( {
                commentid: id,
                imagesource: '',
                name: name,
                date: moment(date, 'YYYY년 MM월 DD일').valueOf(),
                rating: rating_number,
                title: title,
                body: _body,
                applicationid: body.applicationId,
                location: body.location,
                market: 'amazon'
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