/**
 * 双色球历史开奖信息采集
 * Created by MoXiao on 2017/3/25.
 */
'use strict';
const async = require('async');

const superagent = require('superagent');
const cheerio = require('cheerio');
const url = require('url');

const config = require('../../config');
const mongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const drawConsts = require('../../consts/DrawConsts');
const dbConsts = require('../../consts/DbConsts');

var draw = function (ssqurl, callback) {
    var resultItem = [];
    superagent.get(ssqurl).end(function (err, result) {
        if (err) {
            console.log("数据采集失败" + err.message);
            res.send('数据采集失败' + err.message);
        }

        let $ = cheerio.load(result.text);

        console.log("数据采集开始");
        $('table.historylist tbody').each(function (idx, element) {
            let $element = $(element).children();
            for (let i = 0, ilen = $element.length; i < ilen; i++) {
                let $tr = $element.eq(i).children();
                let dtlUrl = $tr.eq(0).find('a').attr('href');
                let cpIssue = $tr.eq(0).find('a').html();
                let cpDate = $tr.eq(1).html();
                let $redBalls = $tr.eq(2).find('td.redBalls').children();
                let $blueBalls = $tr.eq(2).find('td.blueBalls').children();
                resultItem.push({
                    typeEn: drawConsts.LOTTERY_TYPEEN_DLT,
                    cpType: '大乐透',
                    cpIssue: cpIssue,
                    redBall: $redBalls.eq(0).html() + ',' + $redBalls.eq(1).html() + ',' + $redBalls.eq(2).html() + ',' + $redBalls.eq(3).html() + ',' + $redBalls.eq(4).html() + ',' + $redBalls.eq(5).html(),
                    blueBall: $blueBalls.eq(0).html()+ ',' + $redBalls.eq(1).html(),
                    cpDate: cpDate.substring(0, 10),
                    detailUrl: config.url.drawDlt + "&phase=" + cpIssue
                });
                //console.log(i + '===', dtlUrl, cpIssue, cpDate.substring(0, 10), $redBalls.eq(0).html())
            }

        });
        console.log(resultItem)
        callback(resultItem);
    });
};

var drawDetail = function (item, callback) {
    var resultItem = [];
    superagent.get(item.detailUrl).end(function (err, res) {
        if (err) {
            console.log("数据采集失败" + err.message)
            res.send('数据采集失败' + err.message);
        }

        let result = JSON.parse(res.text);
        let data = result.data;
        if (data != '') {
            let status = data.status;
            console.log('大乐透开奖状态：' + status);
            if (status == drawConsts.DRAW_STATUS_OPEN ||status == drawConsts.DRAW_STATUS_OPEN2) {
                let items = '';
                let windetail = [];
                console.log('大乐透已经开奖，开始处理开奖结果数据');
                let phase = data.phase;//开奖期号
                // console.log('双色球开奖phase：' + phase);
                let time_draw = data.time_draw;//开奖时间
                let result = data.result.result;//开奖号码数组
                let result_detail = data.result_detail.resultDetail;//中奖情况数组
                if (result_detail.length == 11) {
                    windetail.push({//一等奖
                        award:1,
                        awardcn:'一等奖(5+2)',
                        condition:'52',//中奖条件
                        winnum:result_detail[0].bet,//中奖数量
                        singlebonus:result_detail[0].prize//中奖金额
                    },{//二等奖
                        award:2,
                        awardcn:'二等奖(5+1)',
                        condition:'51',//中奖条件
                        winnum:result_detail[2].bet,//中奖数量
                        singlebonus:result_detail[2].prize//中奖金额
                    },{//三等奖
                        award:3,
                        awardcn:'三等奖(5+0/4+2)',
                        condition:'50/42',//中奖条件
                        winnum:result_detail[4].bet,//中奖数量
                        singlebonus:result_detail[4].prize//中奖金额
                    },{//四等奖
                        award:4,
                        awardcn:'四等奖(4+1/3+2)',
                        condition:'41/32',//中奖条件
                        winnum:result_detail[6].bet,//中奖数量
                        singlebonus:result_detail[6].prize//中奖金额
                    },{//五等奖
                        award:5,
                        awardcn:'五等奖(4+0/3+1/2+2)',
                        condition:'40/31/22',//中奖条件
                        winnum:result_detail[8].bet,//中奖数量
                        singlebonus:result_detail[8].prize//中奖金额
                    },{//六等奖
                        award:6,
                        awardcn:'六等奖(3+0/2+1/1+2/0+2)',
                        condition:'30/21/12/02',//中奖条件
                        winnum:result_detail[10].bet,//中奖数量
                        singlebonus:result_detail[10].prize//中奖金额
                    });
                } else {
                    windetail.push({//一等奖
                        award:1,
                        awardcn:'一等奖(5+2)',
                        condition:'52',//中奖条件
                        winnum:0,//中奖数量
                        singlebonus:0//中奖金额
                    },{//二等奖
                        award:2,
                        awardcn:'二等奖(5+1)',
                        condition:'51',//中奖条件
                        winnum:0,//中奖数量
                        singlebonus:0//中奖金额
                    },{//三等奖
                        award:3,
                        awardcn:'三等奖(5+0/4+2)',
                        condition:'50/42',//中奖条件
                        winnum:0,//中奖数量
                        singlebonus:0//中奖金额
                    },{//四等奖
                        award:4,
                        awardcn:'四等奖(4+1/3+2)',
                        condition:'41/32',//中奖条件
                        winnum:0,//中奖数量
                        singlebonus:0//中奖金额
                    },{//五等奖
                        award:5,
                        awardcn:'五等奖(4+0/3+1/2+2)',
                        condition:'40/31/22',//中奖条件
                        winnum:0,//中奖数量
                        singlebonus:0//中奖金额
                    },{//六等奖
                        award:6,
                        awardcn:'六等奖(3+0/2+1/1+2/0+2)',
                        condition:'30/21/12/02',//中奖条件
                        winnum:0,//中奖数量
                        singlebonus:0//中奖金额
                    });
                }
                resultItem = {
                    typeEn: drawConsts.LOTTERY_TYPEEN_DLT,
                    cpType: '大乐透',
                    cpIssue: phase,
                    redBall: result[0].data,
                    blueBall: result[1].data,
                    cpDate: time_draw,
                    windetail: windetail
                };
            }
        }
        callback(null, resultItem);
    });
};

module.exports = (req, res) => {
    //http://baidu.lecai.com/lottery/draw/list/1?type=range_date&start=2014-01-01&end=2017-03-26
    //http://baidu.lecai.com/lottery/draw/list/1?type=range_date&start=2011-01-01&end=2013-12-31
    //http://baidu.lecai.com/lottery/draw/list/1?type=range_date&start=2008-01-01&end=2010-12-31
    //http://baidu.lecai.com/lottery/draw/list/1?type=range_date&start=2005-01-01&end=2007-12-31
    let start = req.query.start;
    let end = req.query.end;
    let url = config.url.dlt+'&start='+start+'&end='+end;
    draw(url, function (items) {
        async.mapLimit(items, 20, function (item, callback) {
            drawDetail(item, callback);
        }, function (err, itemsNew) {
            //存储到mongoDB
            console.log('采集完成,存储到mongoDB', itemsNew);
            //存储到mongoDB
            mongoClient.connect(config.mongodb.url, function (err, db) {
                assert.equal(null, err);
                console.log("Connected correctly to server");
                var collection = db.collection(dbConsts.MONGODB_COLLECTION_DLT);
                collection.insertMany(Array.from(itemsNew), function (err, result) {
                    assert.equal(err, null);
                    assert.equal(Array.from(itemsNew).length, result.result.n);
                    console.log("Inserted " + result.result.n + " documents into the document collection");
                    db.close();
                });
            });
            res.send(itemsNew);
        });
    });
}
