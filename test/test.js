/* global module, require, console */

var store = require("../index.js"),
	assert = require("assert"),
	words = require("./words.js"),
	util = require("util");

Array.prototype.inspect = function(depth) {
	var str = '[', i;
	for(i=0; i<this.length && str.length < 144; i++) {
		str += util.inspect(this[i], {colors: true,depth: depth-1}) + (i<this.length-1? ', ': '');
	}
	
	return str + (this.length>i? '+' + (this.length-i): '') + ']';
};

var test = (function() {
	var tests = [], labels=[], i=0, running = false;
	
	function next(err, data) {
		console.log(
			labels[i] + Array(20-labels[i].length).join(' ') +
			(arguments.length? util.inspect(
				(arguments.length > 2? arguments: err || data),
				{depth: 2, colors: true}
			).replace(/\n\s*/g, ' '): 'Ok')
		);
		i++;
		if(tests[i]) tests[i](next);
		else running = false;
	}
	
	return function (label, test) {
		labels.push(label); tests.push(test);
		if(!running) {
			running = true;
			test(next);
		}
	};
}());

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

test('connect', function (d) {
	store.connect('./testdb2', d);
});

test('putRooms', function (d) {
	rooms.put([
		{id: 'scrollback', identities: ['irc:irc.rizon.net/scrollback']},
		{id: 'nodejs', identities: ['irc:irc.freenode.net/nodejs']}
	], d);
});

test('putUsers', function(d) {
	users.put([{id: 'aravind'}, {id: 'harish'}], d);
});

test('putMessages', function(d) {
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

test('putRoom', function(d) {
	rooms.put({id: 'bitcoin'}, d);
});

test('getOneRoom', function(d) {
	rooms.get('nodejs', d);
});

test('getBadRoom', function(d) {
	rooms.get('badroom', d);
});

test('getRooms', function(d) {
	rooms.get(d);
});

test('getAllMessages', function(d) {
	messages.get(d);
});

test('getSomeMessages', function(d) {
	messages.get({by:'totime', start: ['scrollback'], end: ['scrollback']}, d);
});

test('addLink1', function(d) {
	rooms.link('scrollback', 'occupant', 'aravind', {entered: 343}, d);
});

test('addLink2', function(d) {
	rooms.link('bitcoin', 'occupant', 'aravind', d);
});

test('addLink3', function(d) {
	users.link('harish', 'occupied', 'scrollback', {entered: 123}, d);
});

test('getLinkForward', function(d) {
	rooms.get({by: 'occupant', eq: 'aravind'}, d);
});

test('getLinkReverse', function(d) {
	users.get({by: 'occupied', eq: 'scrollback'}, d);
});

test('goodUnlink', function(d) {
	users.unlink('aravind', 'occupied', 'bitcoin', d);
});

test('badUnlink', function(d) {
	users.unlink('aravind', 'occupied', 'asdf', d);
});

test('getLinkEmpty', function(d) {
	users.get({by: 'occupied', eq: 'bitcoin'}, d);
});

test('delete', function(d) {
	rooms.del('scrollback', d);
});

test('getRoomKeys', function(d) {
	rooms.get({by: 'identity', eq: 'irc', keys: true}, d);
});