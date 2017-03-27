'use strict';

module.exports = {
    /**
     * Node 服务器启动端口，如果是自行搭建，请保证负载均衡上的代理地址指向这个端口
     */
    port: '5757',
    //数据库配置地址
    mongodb: {
        url: 'mongodb://localhost:27017/jrxc'
    },
    url: {
        //大乐透开奖历史数据采集地址
        dlt: 'http://baidu.lecai.com/lottery/draw/list/1?type=range_date',
        //双色球开奖历史数据采集地址
        ssq: 'http://baidu.lecai.com/lottery/draw/list/50?type=range_date',
        //大乐透开奖明细数据采集地址
        drawDlt: 'http://baidu.lecai.com/lottery/draw/ajax_get_detail.php?lottery_type=1',
        //双色球开奖明细数据采集地址
        drawSsq: 'http://baidu.lecai.com/lottery/draw/ajax_get_detail.php?lottery_type=50'
    }
};
