/**
 * Created by syntaxfish on 14. 11. 16..
 */

var request = require('request');
var config = require('./appStore.json');
var _ = require('underscore');
var async = require('async');
var moment = require('moment');
var util = require('util');

var keys = require('haru-nodejs-util').keys;
var store = require('haru-nodejs-store');
var AppStore = require('app-store-reviews');
var appStore = new AppStore();

exports.crawling = function(option, callback) {
    async.waterfall([
        function crawling(callback) {
            _crawling(option, function(error, results) {
                callback(error, results);
            });
        },
        function insertQuery(results, callback) {
            _insertQuery(option, results, function(error, results) {
                callback(error, results);
            });
        }
    ], function done(error, results) {
        if(callback){ return callback(error, results); }
    });
};

exports.requestSuccessUrl = function(body) {
    request.get({
        url: util.format(config.successUrl, body.applicationId),
        timeout: 500
    }, body.applicationId);
};


function _crawling(target, callback) {
    _request({
            url: util.format(config.url, target.page, target.packageName, 'kr')
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                var entry = data['feed']['entry'];
                var links = data['feed']['link'];
                var reviews = [];
                var now = moment();
                if (entry && links) {

                    for (var i = 0; i < entry.length; i++) {
                        var rawReview = entry[i];
                        if ('content' in rawReview) {
                            try {
                                reviews.push({
                                    commentid: rawReview['id']['label'],
                                    imagesource: '',
                                    name: rawReview['author']['name']['label'],
                                    date: now.valueOf(),
                                    rating: Number(rawReview['im:rating']['label']),
                                    title: rawReview['title']['label'],
                                    body: rawReview['content']['label'],
                                    applicationid: target.applicationId,
                                    location: target.location,
                                    market: target.market,
                                    strdate: now.format('YYYY-MM-DD')
                                });

                            }
                            catch (err) {
                                //console.log(err);
                            }
                        }
                    }
                } else {
                    if(callback) { return callback(new Error('ER_END_PAGE')); }
                    else { return new Error('ER_END_PAGE'); }
                }


                if(callback){ return callback(error, reviews); }
            }
        });
}

function _insertQuery(options, datas, callback) {
    var marketCommentIdKey = keys.marketCommentIdKey(options.applicationId, options.market, options.location);

    var multi = store.get('public').multi();
    for( var i = 0; i < datas.length; i++ ) {
        multi.sadd(marketCommentIdKey, datas[i].commentid);
    }
    multi.exec(function(error, results) {
        var count = 0;
        var bulk = [];

        for(var i = 0; results && i < results.length; i++ ) {
            if( results[i] ) { bulk.push(_.values(datas[i])); }
            count += results[i];
        }

        //if( count === 0 ) { return callback(new Error('ER_DUP_ENTRY'), []); }

        store.get('mysql').query('insert into Reviews (commentid, imagesource, name, date, rating, title, body, applicationid, location, market, strdate) VALUES ?', [bulk], callback);
    });
}

function _request(options, callback){
    var  appStore = {
        url: options.url,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.8,en-UxS;q=0.6,en;q=0.4',
            'Accept-Encoding': 'utf-8',
            'Accept-Charset': 'utf-8',
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
    };

    request(appStore, callback);
}

//this.crawling({applicationId: 'appid',location: 'fr',market: 'appStore',packageName: 529141346, page: 1}, function(error, results) {
//
//});



//United States 143441
//Argentina 143505
//Australia 143460
//Belgium 143446
//Brazil 143503
//Canada 143455
//Chile 143483
//China 143465
//Colombia 143501
//Costa Rica 143495
//Croatia 143494
//Czech Republic 143489
//Denmark 143458
//Deutschland 143443
//El Salvador 143506
//Espana 143454
//Finland 143447
//France 143442
//Greece 143448
//Guatemala 143504
//Hong Kong 143463
//Hungary 143482
//India 143467
//Indonesia 143476
//Ireland 143449
//Israel 143491
//Italia 143450
//Korea 143466
//Kuwait 143493
//Lebanon 143497
//Luxembourg 143451
//Malaysia 143473
//Mexico 143468
//Nederland 143452
//New Zealand 143461
//Norway 143457
//Osterreich 143445
//Pakistan 143477
//Panama 143485
//Peru 143507
//Phillipines 143474
//Poland 143478
//Portugal 143453
//Qatar 143498
//Romania 143487
//Russia 143469
//Saudi Arabia 143479
//Schweitz/Suisse 143459
//Singapore 143464
//Slovakia 143496
//Slovenia 143499
//South Africa 143472
//Sri Lanka 143486
//Sweden 143456
//Taiwan 143470
//Thailand 143475
//Turkey 143480
//United Arab Emirates 143481
//United Kingdom 143444
//Venezuela 143502
//Vietnam 143471
//Japan 143462