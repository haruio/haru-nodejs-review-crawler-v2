/**
 * Created by syntaxfish on 14. 11. 7..
 */
var request = require('request');
var config = require('./market360.json');
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

function _insertQuery(applicationId, datas, callback) {
    var bulk = [];
    for( var i = 0; i < datas.length; i++ ) {
        bulk.push(_.values(datas[i]));
    }

    store.get('mysql').query('insert into Reviews (commentid, imagesource, name, date, rating, title, body, applicationid, location, market) VALUES ?', [bulk], callback);
}


function _crawling(body, callback) {
    var uri = util.format(config.url, encodeURIComponent(body.packageName),((body.page-1)*config.numberOfReview));
    _request(uri , function (error, res, json) {
        json = JSON.parse(json);

        var reviews = [];
        for( var i = 0; i < json.data.messages.length; i++ ) {
            var message = json.data.messages[i];

            var rating = 0;
            if( message.type === 'best' ) {
                rating = 5;
            } else if( message.type === 'good') {
                rating = 3;
            }  else if( message.type === 'bad') {
                rating = 1;
            }

            // "2014-11-06 00:30:58",
            var utc = moment(message.create_time, 'YYYY-MM-DD HH:mm:ss').valueOf();


            reviews.push( {
                commentid: message.qid +":" + message.msgid,
                imagesource: message.image_url,
                name: message.username,
                date: utc,
                rating: rating,
                title: '',
                body: message.content,
                applicationid: body.applicationId,
                location: body.location,
                market: body.market
            });
        }
        if(callback){ return callback(error, reviews); }
    });
}


function _request(url, callback){
    var  market360_options = {
        url: url,
        method: 'GET'
    };

    request(market360_options, callback);
};

