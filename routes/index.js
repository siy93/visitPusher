var express = require('express');
var router = express.Router();
var JSON = require('JSON');
var async = require('async');
var redis = require('redis');
var redisClient = redis.createClient(6379,'127.0.0.1');
var mqtt = require('mqtt');
var mqttClient = mqtt.connect('mqtt://localhost');

var count = 0;
var pushSetup = {
    countPush: true,
    countLimit: 3,
    timerPush: true,
    timerInterval: 1000,
    timezonePush: false,
    timezonePushTime: 15,
    timezoneInterval : 3600000,
    serverTimeZone : 9
}

/* Mqtt Client Sample*/
mqttClient.on('connect',function(){
    mqttClient.subscribe('user1');
});

mqttClient.on('message',function (topic,message) {
    console.log(message.toString());
});

/* GET home page. */
router.get('/', function(req, res, next) {
    var id = webClientSetup();
    //getConnectedMember();
    res.render('index',{
        userid : id
    });
});

/* POST page View*/
router.post('/',function(req,res,next){
    console.log(req.body.click);
    redisClient.hmget('Users','user' + req.body.click.toString(),function (err,obj) {
        if (err) return console.log(err);
        var userObj = {
            userId : JSON.parse(obj[0]).userId,
            pageViewCount : ++JSON.parse(obj[0]).pageViewCount,
            timeZone : JSON.parse(obj[0]).timeZone
        };
        redisClient.hmset('Users','user' + req.body.click.toString(),JSON.stringify(userObj));

        //Count Mqtt Setup
        if(userObj.pageViewCount%pushSetup.countLimit==0 && pushSetup.countPush){
            mqttClient.publish(JSON.parse(obj[0]).userId, (userObj.pageViewCount/pushSetup.countLimit)*pushSetup.countLimit+' User Visit!')
        }
    });
    res.send('hi');
});


/* timer Push Setup */
setInterval(function () {
    if(pushSetup.timerPush) {
        var i =1;
        var pubMsg;
        console.log(count);
        async.whilst(
            function () {return i <= count;},
            function(cb){
                redisClient.hmget('Users','user'+i,function (err,obj) {
                    if (err) return console.log(err);
                    console.log("i: "+i);
                    mqttClient.publish('user'+i,JSON.parse(obj[0]).pageViewCount +' User Visit!');
                });
                setTimeout(cb,1000);
            },
            function(err) {
                i++;
                console.log("called");
            }
        );
    }
}, pushSetup.timerInterval);

/* time Zone Setup */
setInterval(function () {
    if(pushSetup.timezonePush) {
        var i =1;
        var pushTimeZone = pushSetup.serverTimeZone + Math.abs(getWorldTime(pushSetup.serverTimeZone)-pushSetup.timezonePushTime);
        if(pushTimeZone > 12){
            pushTimeZone = -12 + (pushTimeZone-12)
        }
        for(i=1;i<=count;i++){
            redisClient.hmget('Users','user'+i,function (err,obj) {
                if (err) return console.log(err);
                if(JSON.parse(obj[0]).timeZone == pushTimeZone)
                mqttClient.publish('user'+i,JSON.parse(obj[0]).pageViewCount +' User Visit!');
            });
        }
        i=1;
    }
}, pushSetup.timezoneInterval);

function webClientSetup(){
    var userObj = {
        userId : 'user'+(++count),
        pageViewCount : 0,
        timeZone : Math.floor(Math.random() * 24)-12
    };
    redisClient.hmset('Users',userObj.userId ,JSON.stringify(userObj));
    return userObj.userId;
}


function getWorldTime(tzOffset) { // 24시간제
    var now = new Date();
    var tz = now.getTime() + (now.getTimezoneOffset() * 60000) + (tzOffset * 3600000);
    now.setTime(tz);

    var s =
        leadingZeros(now.getHours(), 2)
        /*leadingZeros(now.getFullYear(), 4) + '-' +
        leadingZeros(now.getMonth() + 1, 2) + '-' +
        leadingZeros(now.getDate(), 2) + ' ' +
        leadingZeros(now.getMinutes(), 2) + ':' +
        leadingZeros(now.getSeconds(), 2);
        */
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
