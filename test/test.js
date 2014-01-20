/* global module, require, console */

var objectlevel = require("../index.js"),
	store = new objectlevel('./testdb'),
	assert = require("assert"),
	words = require("../lib/words.js"),
	run = require("./runner.js");

var rooms = store.defineType('rooms', {
	indexes: {
		identity: function(room, emit) {
			if(room.identities) room.identities.forEach(function(ident) {
				emit.apply(null, ident.split(':'));
			});
		}
	}
});
var users = store.defineType('users');
var messages = store.defineType('messages', {
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

store.defineLink({hasOccupant: users, occupantOf: rooms});
store.defineLink({hasMember: users, memberOf: rooms}, { indexes: {
	role: function(data, emit) {emit(data.role || 'member');}
}});

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
	var start = - new Date().getTime() + 5*2000, end = - new Date().getTime() + 15*2000
	messages.get({
		by:'totime', 
		start: ['scrollback', start],
		end: ['scrollback', end]
	}, d);
});

run('addLink1', function(d) {
	rooms.link('scrollback', 'hasOccupant', 'aravind', {entered: 343}, d);
});

run('addLink2', function(d) {
	rooms.link('bitcoin', 'hasMember', 'aravind', {role: 'owner'}, d);
});

run('addLinkBack', function(d) {
	users.link('harish', 'memberOf', 'bitcoin', {role: 'moderator'}, d);
});

run('getLinkForward', function(d) {
	rooms.get({by: 'hasOccupant', eq: 'aravind'}, d);
});

run('getLinkRevIndex', function(d) {
	users.get({by: 'memberOf', eq: ['bitcoin', 'role', 'owner']}, d);
});

run('overWriteLink', function(d) {
	rooms.link('scrollback', 'hasOccupant', 'aravind', {entered: 666}, d);
});

run('getLinkForward', function(d) {
	rooms.get({by: 'hasOccupant', eq: 'aravind'}, d);
});

run('getLinkReverse', function(d) {
	users.get({by: 'occupantOf', eq: 'scrollback'}, d);
});

run('goodUnlink', function(d) {
	users.unlink('aravind', 'occupantOf', 'bitcoin', d);
});

run('badUnlink', function(d) {
	users.unlink('aravind', 'occupantOf', 'asdf', d);
});

run('getLinkEmpty', function(d) {
	users.get({by: 'occupantOf', eq: 'bitcoin'}, d);
});

run('delete', function(d) {
	rooms.del('scrollback', d);
});

run('getRoomKeys', function(d) {
	rooms.get({by: 'identity', eq: 'irc', keys: true}, d);
});

run('getMessageKeys', function(d) {
	messages.get({by: 'totime', eq: 'scrollback', keys: true}, d);
});

