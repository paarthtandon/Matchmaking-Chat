var express = require('express');
var socket = require('socket.io');
var fetch = require("node-fetch");

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

//App setup
var app = express();
var server = app.listen(port, ip, function () {
    console.log('running at ' + ip + ":" + port);
})

// Static files
app.use(express.static('public'));

// Socket setup
var io = socket(server);

// App Code
var queue = [];
var rooms = {};

//Methods
var matchTags = function (set1, set2) {
    var result = set1.filter(function (n) {
        return set2.indexOf(n) > -1;
    });
    if (result.length > 0){
        return true;
    } else {
        return false;
    }
}

var matchGenderPreference = function (gen1, pre1, gen2, pre2) {
    return (pre1 == 'any' && pre2 == 'any') || (pre1 == 'any' && (pre2 == gen1)) || 
    (pre2 == 'any' && (pre1 == gen2)) || ((pre1 == gen2) && (pre2 == gen1));
}
        
var findPartnerForLoneSocket = function (user) {
    console.log('user', user.tags, user.blocked);

    if (queue.length > 0) {
        var partner = '';

        for (let i = 0; i < queue.length; i++) {
            const p = queue[i];

            if (p) {
                if (!(user.blocked.includes(p.socket.id) || p.blocked.includes(user.socket.id))) {
                    if (matchGenderPreference(user.gender, user.preference, p.gender, p.preference) && matchTags(user.tags, p.tags)) {
                        var partner = queue[i];
                        delete queue[i];
                        break;
                    }
                }
            }
        }

        if (partner != '') {
            var room = user.socket.id + '#' + partner.socket.id;

            partner.socket.join(room);
            user.socket.join(room);

            rooms[partner.socket.id] = room;
            rooms[user.socket.id] = room;

            partner.socket.emit('chat start', {
                'room': room,
                'gender': user.gender
            });
            user.socket.emit('chat start', {
                'room': room,
                'gender': partner.gender
            });
        } else {
            queue.push(user);
        }
    } else {
        queue.push(user);
    }
}

//Listeners
io.on('connection', function (socket) {
    console.log('made socket connection', socket.id, queue.length);

    socket.on('search', function (data) {
        console.log('search ', socket.id, data.gender, data.preference, queue.length);
        user = {
            socket: socket,
            gender: data.gender,
            preference: data.preference,
            tags: data.tags,
            blocked: data.blocked
        };
        findPartnerForLoneSocket(user);
    });
    socket.on('leave room', function () {
        var room = rooms[socket.id];
        delete queue[socket.id];
        socket.broadcast.to(room).emit('chat end');
        socket.leave();
        var partnerID = room.split('#');
        partnerID = partnerID[0] === socket.id ? partnerID[1] : partnerID[0];
        console.log('leave ', socket.id, queue.length);
    });
    socket.on('disconnect', function () {
        console.log('disconnect', socket.id);
        if (rooms.length > 0) {
            var room = rooms[socket.id];
            socket.broadcast.to(room).emit('chat end');
            var partnerID = room.split('#');
            partnerID = partnerID[0] === socket.id ? partnerID[1] : partnerID[0];
        }
        delete queue[socket.id];
        socket.leave();
    });
    socket.on('block', function () {
        var room = rooms[socket.id];
        var partnerID = room.split('#');
        partnerID = partnerID[0] === socket.id ? partnerID[1] : partnerID[0];
        socket.emit('block', { id: partnerID });
    });
    socket.on('message', function (data) {
        var room = rooms[socket.id];
        socket.to(room).emit('message', {
            message: data.message
        });
    });
    socket.on('typing', function (data) {
        io.to(data.room).emit('typing');
    });
    socket.on('done typing', function (data) {
        io.to(data.room).emit('done typing');
    });
});
