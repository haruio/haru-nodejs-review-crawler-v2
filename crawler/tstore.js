/**
 * Created by syntaxfish on 14. 11. 7..
 */
var request = require('request');
var config = require('./tstore.json');
var _ = require('underscore');
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

exports.requestSuccessUrl = function(body) {
    request.get({
        url: util.format(config.successUrl),
        timeout: 500
    }, body.applicationId);
};

function _insertQuery(applicationId, datas, callback) {
    var bulk = [];
    for( var i = 0; i < datas.length; i++ ) {
        bulk.push(_.values(datas[i]));
    }

    store.get('mysql').query('insert into Reviews (commentid, imagesource, name, date, rating, title, body, applicationid, location, market, strdate) VALUES ?', [bulk], callback);
}


function _crawling(body, callback) {
    body = {
        packageName: "0000674114",
        page: 1,
        applicationId: 'appid',
        location: 'ko',
        market: 'tstore'
    };
    _request(config.url , {replyBest: "N", prodId: body.packageName, currentPage: body.page},function (error, res, json) {
        json = JSON.parse(json);

        var reviews = [];
        for( var i = 0; i < json.replyList.length; i++ ) {
            var review = json.replyList[i];


            // "2014-11-11 21:28",
            var _moment = moment(review.REG_DTS_DATE, 'YYYY-MM-DD HH:mm');
            var utc = _moment.valueOf();
            var strdate =  _moment.format('YYYY-MM-DD');

            reviews.push( {
                commentid: body.packageName + ':' + review.NOTI_NO,
                imagesource: '',
                name: review.REG_ID,
                date: utc,
                rating: parseInt(review.AVG_SCORE),
                title: review.NOTI_TITLE,
                body: review.NOTI_DSCR,
                applicationid: body.applicationId,
                location: body.location,
                market: body.market,
                strdate: strdate
            });


        }

        if(callback){ return callback(error, reviews); }
    });
}

_crawling();

function _request(url, body, callback){
    var  market360_options = {
        url: url,
        method: 'POST',
        form: body,
        headers: {
            'User-Agent': 'request',
            'Content-Type': 'application/json;charset=utf-8',
            'Accept-Language': 'ko-KR,ko;q=0.8,en-UxS;q=0.6,en;q=0.4'
        }
    };

    request(market360_options, callback);
};