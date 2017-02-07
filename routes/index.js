var express = require('express');
var router = express.Router();
var JSON = require('JSON');
var redis = require('redis');
var redisClient = redis.createClient(6379,'127.0.0.1');
var mqtt = require('mqtt');
var mqttClient = mqtt.connect('mqtt://localhost');

var currentConnectUser = 0;


/* Mqtt Client Sample*/
mqttClient.on('connect',function(){
    mqttClient.subscribe('usersChange');
});

mqttClient.on('message',function (topic,message) {
    console.log(message.toString());
});


/* GET home page. */
router.get('/', function(req, res, next) {
    var id = webClientSetup();
    getConnectedMember();
    res.render('index',{
        userid : id
    });
});

/* POST page View*/
router.post('/',function(req,res,next){
    console.log(req.body);
});


function getConnectedMember(){
    redisClient.hkeys('Users',function (err,keys) {
        if(err) return console.log(err);
        if(currentConnectUser !== keys.length){
            currentConnectUser = keys.length;
            for(var i=0;i<currentConnectUser;i++) {
                mqttClient.publish('usersChange', keys[i]);
            }
        }
    });
}



function webClientSetup(){
    var userObj = {
        userId : uuid(),
        pageViewCount : 0,
        timeZone : getWorldTime(Math.floor(Math.random() * 5) + 1)
    };
    redisClient.hmset('Users',userObj.userId ,JSON.stringify(userObj));
    return userObj.userId;
}


function uuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}



function getWorldTime(tzOffset) { // 24시간제
    var now = new Date();
    var tz = now.getTime() + (now.getTimezoneOffset() * 60000) + (tzOffset * 3600000);
    now.setTime(tz);

    var s =
        //leadingZeros(now.getFullYear(), 4) + '-' +
        //leadingZeros(now.getMonth() + 1, 2) + '-' +
        //leadingZeros(now.getDate(), 2) + ' ' +
        leadingZeros(now.getHours(), 2)
        //leadingZeros(now.getMinutes(), 2) + ':' +
        //leadingZeros(now.getSeconds(), 2);
    return s;
}


function leadingZeros(n, digits) {
    var zero = '';
    n = n.toString();

    if (n.length < digits) {
        for (var i = 0; i < digits - n.length; i++)
            zero += '0';
    }
    return zero + n;
}


module.exports = router;
