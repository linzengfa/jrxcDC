'use strict';

const LoginService = require('qcloud-weapp-server-sdk').LoginService;

module.exports = (req, res) => {
    const loginService = LoginService.create(req, res);

    loginService.check()
        .then(data => {
            //存储用户信息
            res.json({
                'code': 0,
                'message': 'ok',
                'data': {
                    'userInfo': data.userInfo,
                },
            });
        });
};