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
    countPush: false,
    countLimit: 3,

    timerPush: false,
    timerInterval: 1000,
    timezonePush: true,
    timezonePushTime: 15,
    timezoneInterval : 3600000,
    serverTimeZone : 9
}

/* Mqtt Client Sample*/
mqttClient.on('connect',function(){
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
    redisClient.hget('Users','user' + req.body.click.toString(),function (err,obj) {
        if (err) return console.log(err);
        var tt =  JSON.parse(obj);
        var userObj = {
            userId : tt.userId,
            pageViewCount : ++tt.pageViewCount,
            timeZone : tt.timeZone
        };
        redisClient.hset('Users','user' + req.body.click.toString(),JSON.stringify(userObj));

        //Count Mqtt Setup
        if(userObj.pageViewCount%pushSetup.countLimit==0 && pushSetup.countPush){
            mqttClient.publish(tt.userId, (userObj.pageViewCount/pushSetup.countLimit)*pushSetup.countLimit+' User Visit!')
        }
    });

});


/* timer Setup */
var timerPusMsg = [0,];
setInterval(function () {
    if(pushSetup.timerPush) {
        redisClient.hgetall('Users', function (err, obj) {
            timerPusMsg = [0,];
            if (err) return console.log(err);
            for (var i in obj) {
                timerPusMsg.push(JSON.parse(obj[i]).pageViewCount + ' User Visit!');
            }
        });

        for (var i = 1; i <= count; i++) {
            mqttClient.publish('user' + i, timerPusMsg[i]);
        }
    }
},pushSetup.timerInterval)

/* time Zone Setup */
var timerZonePusMsg = [0,];
setInterval(function () {
    if(pushSetup.timezonePush) {
        var pushTimeZone = pushSetup.serverTimeZone + Math.abs(getWorldTime(pushSetup.serverTimeZone)-pushSetup.timezonePushTime);
        if(pushTimeZone > 12){
            pushTimeZone = -12 + (pushTimeZone-12)
        }
        redisClient.hgetall('Users', function (err, userList) {
            timerZonePusMsg = [0,];
            if (err) return console.log(err);

            for(var i in userList ) {
                if( userList.hasOwnProperty(i) ) {
                    var user = userList[i];
                    var u = JSON.parse(user);
                    if( u.timeZone === pushTimeZone ) {
                        // timerZonePusMsg.push(u.pageViewCount + ' User Visit!');
                        mqttClient.publish(i, u.pageViewCount + ' User Visit!');
                        console.log(i);
                    }
                }
            }
            // for (var i in obj) {
            //     if(JSON.parse(obj[i]).timeZone === pushTimeZone) {
            //         timerZonePusMsg.push(JSON.parse(obj[i]).pageViewCount + ' User Visit!');
            //     }
            //     else{
            //         timerZonePusMsg.push(false);
            //     }
            // }
            // for (var i = 1; i <= count; i++) {
            //     if(timerZonePusMsg[i]) {
            //         mqttClient.publish('user' + i, timerZonePusMsg[i]);
            //         console.log(timerZonePusMsg[i]);
            //     }
            // }
        });
    }
}, 10000);

function webClientSetup(){
    var userObj = {
        userId : 'user'+(++count),
        pageViewCount : 0,
        timeZone : Math.floor(Math.random() * 24)-12
    };
    //redisClient.hmset('Users',userObj.userId ,JSON.stringify(userObj));
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
