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


function _crawling(body, callback) {
    var rs = {
        current: 0,
        sum: 0,
        data: []
    };

    _request({
            url: util.format(config.url, (body.page-1), body.packageName, config.countryId[body.location] ),
            countryId: config.countryId[body.location]
        } , function (error, res, xml) {
        var reviews = [];
        var parseString = require('xml2js').parseString;

        //console.log(xml);

        parseString(xml, function(err, result) {
            var app = {};
            var currentViewsNo = xml.match(/(\d+) Reviews For The Current Version/);

            if( currentViewsNo === null ) {
                return callback(err, []);
            }


            var ratingsNo = xml.match(/>(\d+) ratings</ig).map(function(one) {
                return one.replace('>', '').replace(' ratings<', '') - 0;
            });
            // console.log(ratingsNo[1],ratingsNo[2])

            var starsNo = xml.match(/star.*?, \d+ rating/ig);
            starsNo = starsNo.map(function(one) {
                return one.replace(' rating', '').replace('stars, ', '').replace('star, ', '') - 0;
            });

            var avgNo = xml.match(/rightInset="6" alt=".*?leftInset="6"/ig).slice(1, 3).map(function(one) {
                one = one.replace('rightInset="6" alt="', '')
                var int = one.slice(0, 1) - 0;
                if (/a half stars/.test(one)) {
                    int = int + 0.5;
                }
                return int;
            });

            var appData = result.Document.Path[0].PathElement;

            app.category = appData[0].$.displayName;
            app.categoryUrl = appData[0]._;
            app.seller = appData[1].$.displayName;
            app.sellerUrl = appData[1]._;
            app.name = appData[2].$.displayName;
            app.url = appData[2]._;
            // avatar
            var avatarData = result.Document.View[0].ScrollView[0].VBoxView[0].View[0].MatrixView[0].VBoxView[0].HBoxView[0].VBoxView[0].VBoxView[0].MatrixView;
            var avatar = avatarData[0].GotoURL[0].View[0].PictureView[0].$.url;
            app.avatar = avatar;

            var otherInfo = avatarData[0].VBoxView[0].TextView;
            app.updated_at = otherInfo[2].SetFontStyle[0]._.replace(/\n/g, '').replace(/^\s+|\s+$/g, '').replace('Updated  ', '');
            app.lates_version = otherInfo[3].SetFontStyle[0]._.replace(/\n/g, '').replace(/^\s+|\s+$/g, '').replace('Current Version: ', '');
            app.copyright = otherInfo[4].SetFontStyle[0]._.replace(/\n/g, '').replace(/^\s+|\s+$/g, '');
            app.size = otherInfo[5].SetFontStyle[0]._.replace(/\n/g, '').replace(/^\s+|\s+$/g, '');


            app.all_version_ratings = {
                sum: ratingsNo[1],
                avg: avgNo[0],
                '5 stars': starsNo[0],
                '4 stars': starsNo[1],
                '3 stars': starsNo[2],
                '2 stars': starsNo[3],
                '1 stars': starsNo[4],
            };

            app.current_version_reviews = currentViewsNo[1] - 0;
            app.current_version_ratings = {
                sum: ratingsNo[2],
                avg: avgNo[1],
                '5 stars': starsNo[5],
                '4 stars': starsNo[6],
                '3 stars': starsNo[7],
                '2 stars': starsNo[8],
                '1 stars': starsNo[9]
            };


            var list = result.Document.View[0].ScrollView[0].VBoxView[0].View[0].MatrixView[0].VBoxView[0].VBoxView[0].VBoxView;
            var page = result.Document.View[0].ScrollView[0].VBoxView[0].View[0].MatrixView[0].VBoxView[0].HBoxView[1].TextView[0].SetFontStyle[0].b;
            page = page[0].split('of').map(function(one) {
                return one.replace('Page', '').replace(/^\s+|\s+$/g, '');
            });
            rs.current = page[0] - 0;
            rs.sum = page[1] - 0;

            if (list && list.length) {
                list.forEach(function(one, index) {
                    var temp = {};
                    // @todo username
                    var infos = one.HBoxView[1].TextView[0].SetFontStyle[0]._.replace(/\n/g, '').replace(/by/g, '').replace(/^\s+|\s+$/g, '').split('-').slice(1, 3).map(function(one) {
                        return one.replace(/^\s+|\s+$/g, '');
                    });

                    var username = one.HBoxView[1].TextView[0].SetFontStyle[0].GotoURL[0].b[0].replace(/^\s+|\s+$/g, '').replace(/\n/g, '');
                    var uidtext = one.HBoxView[1].TextView[0].SetFontStyle[0].GotoURL[0].$.url;
                    var uidmatch = uidtext.match(/userProfileId=(\d+)$/);

                    temp.uid = uidmatch[1];
                    temp.username = username;
                    temp.version = infos[0].replace(/Version /g, '');
                    temp.date = moment(new Date(infos[1])).format('YYYY-MM-DD');
                    temp.rate = one.HBoxView[0].HBoxView[0].HBoxView[0].$.alt.replace(/stars/g, '').replace(/^\s+|\s+$/g, '');

                    var url = one.HBoxView[0].HBoxView[0].HBoxView[1].VBoxView[0].GotoURL[0].$.url;
                    var res = url.match(/userReviewId=(\d+)$/);

                    temp.id = res[1];
                    temp.title = one.HBoxView[0].TextView[0].SetFontStyle[0].b[0];
                    temp.text = one.TextView[0].SetFontStyle[0]._;

                    var _moment = moment(temp.date, 'YYYY-MM-DD');
                    var utc = _moment.valueOf();

                    reviews.push({
                        commentid: temp.uid+':'+temp.id,
                        imagesource: '',
                        name: temp.username,
                        date: utc,
                        rating: temp.rate,
                        title: temp.title ,
                        body: temp.text,
                        applicationid: body.applicationId,
                        location: body.location,
                        market: body.market,
                        strdate: temp.date
                    });
                });
            }
            callback(error, reviews);
        });
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
            'use-agent': 'iTunes/10.3.1 (Macintosh; Intel Mac OS X 10.6.8) AppleWebKit/533.21.1',
            'X-Apple-Store-Front': options.countryId
        }
    };

    request(appStore, callback);
};

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