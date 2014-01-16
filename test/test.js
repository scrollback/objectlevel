/* global module, require, console */

var store = require("../index.js"),
	assert = require("assert"),
	words = require("./words.js"),
	run = require("./runner.js");

var rooms = store('rooms', {
	indexes: {
		identity: function(room, emit) {
			if(room.identities) room.identities.forEach(function(ident) {
				emit.apply(null, ident.split(':'));
			});
		}
	}
});
var users = store('users');

var messages = store('messages', {
	indexes: {
		totime: function (msg, emit) {
			emit(msg.to, -msg.time);
		},
		tolabeltime: function(msg, emit) {
			if(msg.labels) for(var i in msg.labels) {
				emit(msg.to, i, -msg.time);
			}
		}
	}
});

store.defineLink({occupant: users, occupied: rooms});
store.defineLink({follower: users, followed: rooms});

run('connect', function (d) {
	store.connect('./testdb2', d);
});

run('putRooms', function (d) {
	rooms.put([
		{id: 'scrollback', identities: ['irc:irc.rizon.net/scrollback']},
		{id: 'nodejs', identities: ['irc:irc.freenode.net/nodejs']}
	], d);
});

run('putUsers', function(d) {
	users.put([{id: 'aravind'}, {id: 'harish'}], d);
});

run('getUsers', function(d) {
	users.get(d);
});

run('overWriteUser', function(d) {
	users.put({id: 'aravind'}, d);
});

run('getUsers', function(d) {
	users.get(d);
});

run('getRooms', function(d) {
	rooms.get(d);
});

run('putMessages', function(d) {
	var m = [], n;
	for(n=20; n>0; n--) m.push({
		id: words.guid(32),
		from: Math.random() < 0.5? 'aravind': 'harish',
		to: Math.random() < 0.5? 'scrollback': 'nodejs',
		type: 'text',
		time: new Date().getTime() - n*2000 - Math.floor(Math.random()*2000),
		text: words.paragraph(1)
	});
	
	messages.put(m, d);
});

run('putRoom', function(d) {
	rooms.put({id: 'bitcoin'}, d);
});

run('getOneRoom', function(d) {
	rooms.get('nodejs', d);
});

run('getBadRoom', function(d) {
	rooms.get('badroom', d);
});

run('getRooms', function(d) {
	rooms.get(d);
});

run('getAllMessages', function(d) {
	messages.get(d);
});

run('getSomeMessages', function(d) {
	messages.get({by:'totime', start: ['scrollback'], end: ['scrollback']}, d);
});

run('addLink1', function(d) {
	rooms.link('scrollback', 'occupant', 'aravind', {entered: 343}, d);
});

run('addLink2', function(d) {
	rooms.link('bitcoin', 'occupant', 'aravind', d);
});

run('addLink3', function(d) {
	users.link('harish', 'occupied', 'scrollback', {entered: 123}, d);
});

run('getLinkForward', function(d) {
	rooms.get({by: 'occupant', eq: 'aravind'}, d);
});

run('getLinkReverse', function(d) {
	users.get({by: 'occupied', eq: 'scrollback'}, d);
});

run('overWriteLink', function(d) {
	rooms.link('scrollback', 'occupant', 'aravind', {entered: 666}, d);
});

run('getLinkForward', function(d) {
	rooms.get({by: 'occupant', eq: 'aravind'}, d);
});

run('getLinkReverse', function(d) {
	users.get({by: 'occupied', eq: 'scrollback'}, d);
});

run('goodUnlink', function(d) {
	users.unlink('aravind', 'occupied', 'bitcoin', d);
});

run('badUnlink', function(d) {
	users.unlink('aravind', 'occupied', 'asdf', d);
});

run('getLinkEmpty', function(d) {
	users.get({by: 'occupied', eq: 'bitcoin'}, d);
});

run('delete', function(d) {
	rooms.del('scrollback', d);
});

run('getRoomKeys', function(d) {
	rooms.get({by: 'identity', eq: 'irc', keys: true}, d);
});