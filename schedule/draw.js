/**
 * Created by MoXiao on 2017/2/16.
 * 定时获取开奖公告
 */
const http     = require('http');
const schedule = require("node-schedule");
const eventproxy = require('eventproxy');
const superagent = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
const url = require('url');
const mongoClient = require('mongodb').MongoClient
const assert = require('assert');
const moment = require('moment');

const config = require('../config');
const drawConsts = require('../consts/DrawConsts');
const dbConsts = require('../consts/DbConsts');

function getDrawPhaseByType(typeEn,callback) {
    console.log("获取开奖期号开始");
    mongoClient.connect(config.mongodb.url, function(err, db) {
        var collection = db.collection(dbConsts.MONGODB_COLLECTION_DRAW_CTL);
        collection.findOne({'typeEn':typeEn},function(err, result) {
            assert.equal(err, null);
            console.log("获取开奖公告控制信息"+JSON.stringify(result));
            var phase = "";
            if(result ==null){
                if(typeEn == drawConsts.LOTTERY_TYPEEN_DLT){
                    phase = drawConsts.DEFAULT_PHASE_SSQ;
                }else{
                    phase = drawConsts.DEFAULT_PHASE_DLT;
                }
            }else{
                let nowDate = moment(new Date()).format('YYYY-MM-DD');
                let lastupDate = moment(result.lastuptime).format('YYYY-MM-DD');
                phase = result.phase;
                if(nowDate != lastupDate){
                    phase = parseInt(result.phase)+1;
                }
                console.log("获取开奖期号结束"+phase);
            }
            callback(phase);
        });
    });
}

/**
 * 采集大乐透开奖信息
 * @param phase
 */
function getDrawDlt(){
    getDrawPhaseByType(drawConsts.LOTTERY_TYPEEN_DLT,function (phase) {
        let url = config.url.drawDlt+"&phase="+phase;
        console.log('开始大乐透开奖数据URL'+url);
        superagent.get(url)
            .end(function (err, res) {
                if (err) {
                    console.log("大乐透开奖数据采集失败" + err.message);
                    res.send('大乐透开奖数据采集失败' + err.message);
                }
                try {
                    let result = JSON.parse(res.text);
                    let data = result.data;
                    if(data !=''){
                        let status = data.status;
                        console.log('大乐透开奖状态：'+status);
                        if(status == drawConsts.DRAW_STATUS_OPEN ||status == drawConsts.DRAW_STATUS_OPEN2){
                            let items = '';
                            let windetail = [];
                            console.log('大乐透已经开奖，开始处理开奖结果数据');
                            let phase = data.phase;//开奖期号
                            console.log('大乐透开奖phase：'+phase);
                            let time_draw = data.time_draw;//开奖时间
                            let result = data.result.result;//开奖号码数组
                            let result_detail = data.result_detail.resultDetail;//中奖情况数组

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
                            console.log('大乐透中奖详细：'+JSON.stringify(windetail));
                            items = {
                                typeEn:'dlt',
                                cpType:'大乐透',
                                cpIssue:phase,
                                redBall: result[0].data,
                                blueBall:  result[1].data,
                                cpDate:time_draw,
                                windetail:windetail
                            };
                            //存储到mongoDB
                            mongoClient.connect(config.mongodb.url, function(err, db) {
                                assert.equal(null, err);
                                console.log("Connected correctly to server");
                                var collection = db.collection(dbConsts.MONGODB_COLLECTION_KJGG);
                                collection.count({'typeEn':drawConsts.LOTTERY_TYPEEN_DLT},function(err, count) {
                                    if(count ==0){//没有数据，直接插入
                                        console.log("没有数据大乐透开奖公告，直接插入");
                                        collection.insertOne(items, function(err, result) {
                                            assert.equal(err, null);
                                            console.log("大乐透开奖公告插入成功");
                                            updateOrInsertDrawCtl(drawConsts.LOTTERY_TYPEEN_DLT,phase);
                                            //db.close();
                                        });
                                    }else{
                                        console.log("有数据大乐透开奖公告，进行更新");
                                        collection.updateOne({'typeEn':drawConsts.LOTTERY_TYPEEN_DLT},items, function(err, result) {
                                            assert.equal(err, null);
                                            assert.equal(1, result.result.n);
                                            console.log("大乐透开奖公告更新成功");
                                            updateOrInsertDrawCtl(drawConsts.LOTTERY_TYPEEN_DLT,phase);
                                            //db.close();
                                        });
                                    }
                                });
                                //更新大乐透历史开奖信息
                                var collectionDlt = db.collection(dbConsts.MONGODB_COLLECTION_DLT);
                                collectionDlt.count({'cpIssue':items.cpIssue},function(err, count) {
                                    if(count ==0){//没有数据，直接插入
                                        console.log("没有数据大乐透开奖信息，直接插入");
                                        collectionDlt.insertOne(items, function(err, result) {
                                            assert.equal(err, null);
                                            console.log("大乐透开奖信息插入成功");
                                            db.close();
                                        });
                                    }else{
                                        console.log("本期大乐透开奖信息已存在，不做更新");
                                        db.close();
                                    }
                                });
                            });
                        }else{
                            console.log('大乐透未开奖，请稍后再查询');
                        }

                    }else{
                        console.log('大乐透开奖采集参数错误');
                    }
                }catch (err){
                    console.log('大乐透开奖采集数据返回处理错误：'+err.message);
                }
            });
    });//end getDrawPhaseByType
}

/**
 * 采集双色球开奖信息
 * @param phase
 */
function getDrawSsq() {
    getDrawPhaseByType(dbConsts.MONGODB_COLLECTION_SSQ,function (phase) {
        let url = config.url.drawSsq+"&phase="+phase;
        console.log('开始采集双色球开奖数据，URL'+url);
        superagent.get(url)
            .end(function (err, res) {

                if (err) {
                    console.log("采集双色球开奖数据失败" + err.message);
                    res.send('采集双色球开奖数据失败' + err.message);
                }

                try {
                    let result = JSON.parse(res.text);
                    let data = result.data;
                    if(data !=''){
                        let status = data.status;
                        console.log('双色球开奖状态：'+status);
                        if(status == drawConsts.DRAW_STATUS_OPEN ||status == drawConsts.DRAW_STATUS_OPEN2){
                            let items = '';
                            let windetail = [];
                            console.log('双色球已经开奖，开始处理开奖结果数据');
                            let phase = data.phase;//开奖期号
                            console.log('双色球开奖phase：'+phase);
                            let time_draw = data.time_draw;//开奖时间
                            let result = data.result.result;//开奖号码数组
                            let result_detail = data.result_detail.resultDetail;//中奖情况数组

                            windetail.push({//一等奖
                                award:1,
                                awardcn:'一等奖(6+1)',
                                condition:'61',//中奖条件
                                winnum:result_detail[0].bet,//中奖数量
                                singlebonus:result_detail[0].prize//中奖金额
                            },{//二等奖
                                award:2,
                                awardcn:'二等奖(6+0)',
                                condition:'60',//中奖条件
                                winnum:result_detail[1].bet,//中奖数量
                                singlebonus:result_detail[1].prize//中奖金额
                            },{//三等奖
                                award:3,
                                awardcn:'三等奖(6+0)',
                                condition:'51',//中奖条件
                                winnum:result_detail[2].bet,//中奖数量
                                singlebonus:result_detail[2].prize//中奖金额
                            },{//四等奖
                                award:4,
                                awardcn:'四等奖(6+0)',
                                condition:'50,41',//中奖条件
                                winnum:result_detail[3].bet,//中奖数量
                                singlebonus:result_detail[3].prize//中奖金额
                            },{//五等奖
                                award:5,
                                awardcn:'五等奖(6+0)',
                                condition:'40,31',//中奖条件
                                winnum:result_detail[4].bet,//中奖数量
                                singlebonus:result_detail[4].prize//中奖金额
                            },{//六等奖
                                award:6,
                                awardcn:'六等奖(2+1/1+1/0+1)',
                                condition:'21,11,01',//中奖条件
                                winnum:result_detail[5].bet,//中奖数量
                                singlebonus:result_detail[5].prize//中奖金额
                            });
                            console.log('双色球中奖详细：'+JSON.stringify(windetail));

                            items = {
                                typeEn:'ssq',
                                cpType:'双色球',
                                cpIssue:phase,
                                redBall: result[0].data,
                                blueBall:  result[1].data,
                                cpDate:time_draw,
                                windetail:windetail
                            };
                            //存储到mongoDB
                            mongoClient.connect(config.mongodb.url, function(err, db) {
                                assert.equal(null, err);
                                console.log("Connected correctly to server");
                                var collection = db.collection(dbConsts.MONGODB_COLLECTION_KJGG);
                                collection.count({'typeEn':dbConsts.MONGODB_COLLECTION_SSQ},function(err, count) {
                                    if(count ==0){//没有数据，直接插入
                                        console.log("没有数据双色球开奖公告，直接插入");
                                        collection.insertOne(items, function(err, result) {
                                            assert.equal(err, null);
                                            console.log("双色球开奖公告插入成功");
                                            //更新双色球历史开奖信息文档

                                            updateOrInsertDrawCtl(dbConsts.MONGODB_COLLECTION_SSQ,phase);
                                            //db.close();
                                        });
                                    }else{
                                        console.log("有双色球开奖数据，进行更新");
                                        collection.updateOne({'typeEn':dbConsts.MONGODB_COLLECTION_SSQ},items, function(err, result) {
                                            assert.equal(err, null);
                                            assert.equal(1, result.result.n);
                                            console.log("双色球开奖公告更新成功");
                                            updateOrInsertDrawCtl(dbConsts.MONGODB_COLLECTION_SSQ,phase);
                                            //db.close();
                                        });
                                    }
                                });

                                //更新双色球历史开奖信息
                                var collectionDlt = db.collection(dbConsts.MONGODB_COLLECTION_SSQ);
                                collectionDlt.count({'cpIssue':items.cpIssue},function(err, count) {
                                    if(count ==0){//没有数据，直接插入
                                        console.log("没有数据双色球开奖信息，直接插入");
                                        collectionDlt.insertOne(items, function(err, result) {
                                            assert.equal(err, null);
                                            console.log("双色球开奖信息插入成功");
                                            db.close();
                                        });
                                    }else{
                                        console.log("本期双色球开奖信息已存在，不做更新");
                                        db.close();
                                    }
                                });
                            });

                        }else{
                            console.log('双色球未开奖，请稍后再查询');
                        }

                    }else{
                        console.log('双色球采集参数错误');
                    }
                }catch (err){
                    console.log('双色球采集数据返回处理错误：'+err.message);
                }
            });
    });//end getDrawPhaseByType
}

/**
 * 更新开奖公告控制信息
 * @param type
 * @param phase
 */
function updateOrInsertDrawCtl(type,phase) {
    console.log("更新开奖公告控制信息开始");
    mongoClient.connect(config.mongodb.url, function(err, db) {
        var collection = db.collection(dbConsts.MONGODB_COLLECTION_DRAW_CTL);
        var drawCtl ={
            type:type,
            phase:phase,
            lastuptime:new Date()
        };
        collection.count({'type':type},function(err, count) {
            if(count ==0){//没有数据，直接插入
                console.log("没有"+type+"开奖公告控制信息，直接插入");
                collection.insertOne(drawCtl, function(err, result) {
                    assert.equal(err, null);
                    console.log(type+"开奖公告控制信息插入成功");
                    db.close();
                });
            }else{
                console.log("有"+type+"开奖公告控制信息，进行更新");
                collection.updateOne({'type':type},drawCtl, function(err, result) {
                    assert.equal(err, null);
                    assert.equal(1, result.result.n);
                    console.log(type+"开奖公告控制信息更新成功");
                    db.close();
                });
            }
        });
    });
    console.log("更新开奖公告控制信息结束");
}

var dlt = schedule.scheduleJob('0 36,45 21 * * 1,3,6', function () {
    console.log("执行任务大乐透采集.........");
    getDrawDlt();
    console.log("完成任务大乐透采集.........");

});
var ssq = schedule.scheduleJob('0 36,45 20,21 * * 0,2,4,6', function () {
    console.log("执行任务双色球采集.........");
    getDrawSsq();
    console.log("完成任务双色球采集.........");
});

