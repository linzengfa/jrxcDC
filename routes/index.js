'use strict';

const express = require('express');
const router = express.Router();


router.get('/', require('./welcome'));
router.get('/login', require('./login'));
router.get('/user', require('./user'));
router.get('/dlt', require('./draw/dlt'));//大乐透数据采集
router.get('/ssq', require('./draw/ssq'));//双色球数据采集
router.get('/xytj', require('./draw/xytj'));//大乐透数据采集

module.exports = router;