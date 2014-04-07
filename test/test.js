/* global it, describe */

var objectlevel = require("../index.js"),
	store = new objectlevel('./testdb'),
	words = require("../lib/words.js"),
	assert = require('assert');

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

it('should putRooms', function (done) {
	rooms.put([
		{id: 'scrollback', identities: ['irc:irc.rizon.net/scrollback']},
		{id: 'nodejs', identities: ['irc:irc.freenode.net/nodejs']}
	], function(err, res) { if(err) throw err; done(); });
});

it('should putUsers', function (done) {
	users.put([{id: 'aravind'}, {id: 'harish'}], function(err, res) { if(err) throw err; done(); });
});

it('should getUsers', function (done) {
	users.get(function(err, res) { if(err) throw err; done(); });
});

it('should overWriteUser', function (done) {
	users.put({id: 'aravind', newProp: 'new property'}, { preUpdate: function(old, obj) {
		obj.oldProp = 'not so new';
	}}, function(err, res) { if(err) throw err; done(); });
});

it('should abortWriteUser', function (done) {
	users.put({id: 'harish', newProp: 'abc'}, { preUpdate: function() {
		return false;
	}}, function(err, res) { if(err) throw err; done(); });
});

it('should getUsers', function (done) {
	users.get(function(err, res) { if(err) throw err; done(); });
});

it('should getRooms', function (done) {
	rooms.get(function(err, res) { if(err) throw err; done(); });
});

it('should putMessages', function (done) {
	var m = [], n;
	for(n=20; n>0; n--) m.push({
		from: Math.random() < 0.5? 'aravind': 'harish',
		to: Math.random() < 0.5? 'scrollback': 'nodejs',
		type: 'text',
		time: new Date().getTime() - n*2000 - Math.floor(Math.random()*2000),
		text: words.paragraph(1)
	});
	
	messages.put(m, function(err, res) { if(err) throw err; done(); });
});

it('should putRoom', function (done) {
	rooms.put({id: 'bitcoin'}, function(err, res) { if(err) throw err; done(); });
});

it('should getOneRoom', function (done) {
	rooms.get('nodejs', function(err, res) { if(err) throw err; done(); });
});

it('should getBadRoom', function (done) {
	rooms.get('badroom', function(err, res) { if(err) throw err; done(); });
});

it('should getRooms', function (done) {
	rooms.get(function(err, res) { if(err) throw err; done(); });
});

it('should getAllMessages', function (done) {
	messages.get(function(err, res) { if(err) throw err; done(); });
});

it('should getSomeMessages', function (done) {
	var start = - new Date().getTime() + 5*2000, end = - new Date().getTime() + 15*2000;
	messages.get({
		by:'totime', 
		start: ['scrollback', start],
		end: ['scrollback', end]
	}, function(err, res) { if(err) throw err; done(); });
});

it('should addLink1', function (done) {
	rooms.link('scrollback', 'hasOccupant', 'aravind', {entered: 343}, function(err, res) { if(err) throw err; done(); });
});

it('should addLink2', function (done) {
	rooms.link('bitcoin', 'hasMember', 'aravind', {role: 'owner'}, function(err, res) { if(err) throw err; done(); });
});

it('should addLinkBack', function (done) {
	users.link('harish', 'memberOf', 'bitcoin', {role: 'moderator'}, function(err, res) { if(err) throw err; done(); });
});

it('should getLinkForward', function (done) {
	rooms.get({by: 'hasOccupant', eq: 'aravind'}, function(err, res) { if(err) throw err; done(); });
});

it('should getLinkRevIndex', function (done) {
	users.get({by: 'memberOf', eq: ['bitcoin', 'role', 'moderator']}, function(err, res) { if(err) throw err; done(); });
});

it('should overWriteLink', function (done) {
	rooms.link('scrollback', 'hasOccupant', 'aravind', {entered: 123}, function(err, res) { if(err) throw err; done(); });
});

it('should getLinkForward', function (done) {
	rooms.get({by: 'hasOccupant', eq: 'aravind'}, function(err, res) { if(err) throw err; done(); });
}); 

it('should getLinkReverse', function (done) {
	users.get({by: 'occupantOf', eq: 'scrollback'}, function(err, res) { if(err) throw err; done(); });
});

it('should overwriteIndexedLink', function (done) {
	users.link('harish', 'memberOf', 'bitcoin', {role: 'moderato'}, function(err, res) { if(err) throw err; done(); });
});

it('should getLinkIndexAgain', function (done) {
	rooms.get({by: 'hasMember', eq: 'harish'}, function(err, res) { if(err) throw err; done(); });
});

it('should getLinkIndReverse', function (done) {
	users.get({by: 'memberOf', eq: 'bitcoin'}, function(err, res) { if(err) throw err; done(); });
});

it('should goodUnlink', function (done) {
	users.unlink('aravind', 'occupantOf', 'bitcoin', function(err, res) { if(err) throw err; done(); });
});

it('should verifyOtherLinks', function (done) {
	rooms.get({by: 'hasOccupant', eq: 'aravind'}, function(err, res) { if(err) throw err; done(); });
});

it('should verifyOtherLinksBack', function (done) {
	users.get({by: 'occupantOf', eq: 'scrollback'}, function(err, res) { if(err) throw err; done(); });
});

it('should badUnlink', function (done) {
	users.unlink('aravind', 'occupantOf', 'asdf', function(err, res) { if(err) throw err; done(); });
});

it('should getLinkEmpty', function (done) {
	users.get({by: 'occupantOf', eq: 'bitcoin'}, function(err, res) { if(err) throw err; done(); });
});

it('should delete', function (done) {
	rooms.del('scrollback', function(err, res) { if(err) throw err; done(); });
});

it('should getRoomKeys', function (done) {
	rooms.get({by: 'identity', eq: 'irc', keys: true}, function(err, res) { if(err) throw err; done(); });
});

it('should getMessageKeys', function (done) {
	messages.get({by: 'totime', eq: 'scrollback', keys: true}, function(err, res) { if(err) throw err; done(); });
});

it('should mapFunction', function (done) {
	//messages.get({
});
//
//
//run('getTargetLinkData', function(d) {
//	users.get({by: 'memberOf', eq: ['bitcoin', 'harish']}, d);
//});
//
//run('goodUnlink', function(d) {
//	users.unlink('aravind', 'occupantOf', 'bitcoin', d);
//});
//
//run('verifyDelete', function(d) {
//	rooms.get('scrollback', d);
//})
//
//run('getRoomKeys', function(d) {
//	rooms.get({by: 'identity', eq: 'irc', keys: true}, d);
//});
