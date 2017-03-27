/**
 * Created by MoXiao on 2017/2/6.
 */
var express = require('express');
var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var async = require('async');
var url = require('url');
var assert = require('assert');

var router = express.Router();

var mongoClient = require('mongodb').MongoClient

var config = require('../../config');
const dbConsts = require('../../consts/DbConsts');

/**
 * 保存或更新推荐号码
 */
function saveOrUpdateTjNum(items) {
    //存储到mongoDB
    mongoClient.connect(config.mongodb.url, function(err, db) {
        assert.equal(null, err);
        console.log("连接数据库成功！");
        var collection = db.collection(dbConsts.MONGODB_COLLECTION_XYTJ);
        collection.findOne({'typeEn':items.typeEn,'cpIssue':items.cpIssue},function(err, result) {
            assert.equal(err, null);
            if(result ==null){//没有推荐数据，直接插入
                console.log("没有推荐号码，直接插入");
                collection.insertOne(items, function(err, result) {
                    assert.equal(err, null);
                    console.log("推荐号码插入成功");
                    db.close();
                });
            }else{
                console.log("有推荐号码，进行更新");
                collection.updateOne({'typeEn':items.typeEn,'cpIssue':items.cpIssue},items, function(err, result) {
                    assert.equal(err, null);
                    assert.equal(1, result.result.n);
                    console.log("推荐号码更新成功");
                    db.close();
                });
            }
        });
    });
}//end saveOrUpdateTjNum function

/* GET dlt page. */
module.exports = (req, res) => {
    saveOrUpdateTjNum({
        typeEn: dbConsts.MONGODB_COLLECTION_SSQ,
        cpType: '双色球',
        cpIssue: '2017012',
        cpDate: '2017-01-24',
        xyhm:[{redBall: ['10', '11', '12', '23', '26', '29'],blueBall: ['16']},{redBall: ['10', '11', '12', '23', '26', '29'],blueBall: ['16']},{redBall: ['10', '11', '12', '23', '26', '29'],blueBall: ['16']}]
    });
    saveOrUpdateTjNum({
        typeEn: dbConsts.MONGODB_COLLECTION_DLT,
        cpType: '大乐透',
        cpIssue: '17012',
        cpDate: '2017-01-25',
        xyhm:[{redBall: ['05', '15', '21', '29', '34'],blueBall: ['06', '09']},{redBall: ['05', '15', '21', '29', '34'],blueBall: ['06', '09']}]
    });
    saveOrUpdateTjNum({
        typeEn: dbConsts.MONGODB_COLLECTION_SSQ,
        cpType: '双色球',
        cpIssue: '2017013',
        cpDate: '2017-01-26',
        xyhm:[{redBall: ['10', '11', '12', '23', '26', '29'],blueBall: ['16']},{redBall: ['10', '11', '12', '23', '26', '29'],blueBall: ['16']},{redBall: ['10', '11', '12', '23', '26', '29'],blueBall: ['16']}]
    });
    saveOrUpdateTjNum({
        typeEn: dbConsts.MONGODB_COLLECTION_DLT,
        cpType: '大乐透',
        cpIssue: '17013',
        cpDate: '2017-01-27',
        xyhm:[{redBall: ['05', '15', '21', '29', '34'],blueBall: ['06', '09']},{redBall: ['05', '15', '21', '29', '34'],blueBall: ['06', '09']}]
    });
};