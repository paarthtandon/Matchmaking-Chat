var socket = io();

var connected = false;
var chatShown = false;
var room = '';
var tags = ['Reading', 'Watching TV', 'Family Time', 'Going to Movies', 'Fishing', 'Computer', 'Gardening', 'Renting Movies', 'Walking', 'Exercise', 'Listening to Music', 'Entertaining', 'Hunting', 'Team Sports', 'Shopping', 'Traveling', 'Sleeping', 'Socializing', 'Sewing', 'Golf', 'Church Activities', 'Relaxing', 'Playing Music', 'Housework', 'Crafts'];
var tagButtons = [];

var gender = '';
var preference = '';
var yourTags = [];
var blocked = [];

//DOM calls
var gender = document.getElementById('gender'),
    preference = document.getElementById('preference'),
    tagButtons = document.getElementById('tag-buttons'),
    tagInput = document.getElementById('tag-input'),
    start = document.getElementById('start'),
    chatBox = document.getElementById('chat-window'),
    chatIO = document.getElementById('chat-io'),
    output = document.getElementById('output'),
    message = document.getElementById('message'),
    send = document.getElementById('send'),
    leave = document.getElementById('leave'),
    block = document.getElementById('block');

//Event listeners
start.addEventListener('click', function () {
    startSearch();
});
send.addEventListener('click', function () {
    sendMessage();
});
message.addEventListener('keypress', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) {
        sendMessage();
    }
});
leave.addEventListener('click', function () {
    leaveChat();
});
block.addEventListener('click', function () {
    blockUser();
});
var timer;
var interval = 5000;
message.addEventListener('keyup', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
        socket.emit('done typing', {});
    }, interval);
});
message.addEventListener('keydown', function () {
    socket.emit('typing', {});
});

//Listeners
socket.on('connect', function (data) {
    connected = true;
    hideChat();
});
socket.on('chat start', function (data) {
    room = data.room;
    console.log('joined', room, data.gender);
    output.innerHTML += '<li class="server-chat"><strong>Joined room with a ' + data.gender + ' who has similar interests</strong></li>';
    output.scrollBy(0, 100);
});
socket.on('chat end', function (data) {
    room = '';
    output.innerHTML += '<li class="server-chat"><strong>Partner left the room</strong></li>';
    output.scrollBy(0, 100);
});
socket.on('disconnect', function (data) {
    console.log('Connection fell or your browser is closing.');
});
socket.on('block', function (data) {
    blocked.push(data.id);
    console.log(blocked);
});
socket.on('message', function (data) {
    output.innerHTML += '<li class="partner-chat"><strong>Partner: </strong>' + data.message + '</li>';
    output.scrollBy(0, 100);
});
socket.on('typing', function () {
    console.log('typing');
});
socket.on('done typing', function () {
    console.log('done typing');
});

//Methods
var startSearch = function () {
    if (room == '') {
        if (yourTags.length > 0) {
            g = gender.value;
            p = preference.value;
            tags = yourTags;
            b = blocked;
            socket.emit('search', {
                gender: g,
                preference: p,
                tags: tags,
                blocked: b
            });
            if (chatShown == false) {
                showChat();
            }
            output.innerHTML += '<li class="server-chat"><strong>Searching for partner</strong></li>';
            output.scrollBy(0, 100);
        } else {
            window.alert("You must select at least one tag to search!");
        }
    } else {
        output.innerHTML += '<li class="your-chat"><strong>Already with partner</strong></li>';
        output.scrollBy(0, 100);
    }
}

var leaveChat = function () {
    if (connected && room != '') {
        output.innerHTML += '<li class="server-chat"><strong>You left the room</strong></li>';
        output.scrollBy(0, 100);
        socket.emit('leave room');
        room = '';
    }
};

var blockUser = function () {
    socket.emit('block');
    leaveChat();
};

var hideChat = function () {
    chatShown = false;
    chatBox.style.display = 'none';
    chatIO.style.display = 'none';
};

var showChat = function () {
    chatShown = true;
    chatBox.style.display = 'block';
    chatIO.style.display = 'block';
};

var sendMessage = function () {
    if (room != '') {
        socket.emit('message', {
            message: message.value
        });
        output.innerHTML += '<li class="your-chat"><strong>You: </strong>' + message.value + '</li>';
        output.scrollBy(0, 100);
        message.value = "";
    } else {
        window.alert("You must be with a partner to send a message!");
    }
}

var tagBtnId = 0;
var addTag = function (term) {
    if (!(yourTags.includes(term))) {
        var tagButton = document.createElement('button');
        var tagText = document.createTextNode(term);
        var tagButton = document.createElement('button');
        tagButton.setAttribute('class', 'tagbtn');
        tagButton.setAttribute('onclick', 'delTag(' + tagBtnId + ')');
        tagButton.setAttribute('id', tagBtnId.toString());
        tagBtnId += 1;
        tagButton.appendChild(tagText);
        console.log(tagButton);
        var tagLI = document.createElement('li');
        tagLI.appendChild(tagButton);
        tagLI.setAttribute('class', 'tag')
        tagButtons.appendChild(tagLI);
        yourTags.push(term);
        tagInput.value = '';
    }
    var filtered = yourTags.filter(function (el) {
        return el != null;
    });
    yourTags = filtered;
    console.log(yourTags.toString());
}

var delTag = function (id) {
    var btnToDelete = document.getElementById(id);
    for (let i = 0; i < yourTags.length; i++) {
        var element = yourTags[i];
        if (element == btnToDelete.innerHTML) {
            delete yourTags[i];
        }
    }
    btnToDelete.parentElement.remove();
    var filtered = yourTags.filter(function (el) {
        return el != null;
    });
    yourTags = filtered;
    console.log(yourTags.toString());
}

//Autocomplete
var tagAutocomplete = new autoComplete({
    selector: '#tag-input',
    minChars: 0,
    source: function (term, suggest) {
        term = term.toLowerCase();
        var choices = tags;
        var suggestions = [];
        for (i = 0; i < choices.length; i++)
            if (~choices[i].toLowerCase().indexOf(term)) suggestions.push(choices[i]);
        suggest(suggestions);
    },
    onSelect: function (e, term, item) {
        addTag(term);
    }
});