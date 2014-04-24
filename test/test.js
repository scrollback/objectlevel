/* global it, describe */

var objectlevel = require("../index.js"),
	store = new objectlevel('./testdb'),
	assert = require('assert');

var time = 1390000000000;
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
			emit(msg.to, msg.time);
		},
		tofromtime: function(msg, emit) {
			if(msg.labels) for(var i in msg.labels) {
				emit(msg.to, i, msg.time);
			}
		}
	}
});

store.defineLink({hasOccupant: users, occupantOf: rooms});
store.defineLink({hasMember: users, memberOf: rooms}, { indexes: {
	role: function(data, emit) {emit(data.role || 'member');}
}});

console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++");
console.log("+++++++clearing db before test would be better+++++++");
console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++");

describe("Testing put and get: ", function() {
	it('adding rooms to the db: ', function (done) {
		rooms.put({
			id: 'scrollback',
			identities: ['irc:irc.rizon.net/scrollback']
		}, function(err) {
			assert(!err, "error thrown - ");
			done();
		});
	});

	it('adding another room: ', function (done) {
		rooms.put({
			id: 'scrollbackteam',
			identities: ['irc:irc.rizon.net/scrollbackteam']
		}, function(err) {
			assert(!err, "error thrown - ");
			done();
		});
	});

	it('deleting a room', function (done) {
		rooms.del('scrollbackteam', function(err) { 
			assert(!err, "error thrown - ");
			done(); 
		});
	});

	it('trying to get the deleted room: ', function(done) {
		rooms.get('scrollbackteam', function(err, res) {
			assert(!err, "error thrown - ");
			assert(!res, "got wrong room");
			done();
		});
	});

	it('trying to get invalid room: ', function(done) {
		rooms.get('noscrollback', function(err, res) {
			assert(!err, "error thrown - ");
			assert(!res, "got wrong room");
			done();
		});
	});

	it('trying to get rooms: ', function(done) {
		rooms.get('scrollback', function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res.id, "scrollback", "got wrong room");
			assert.equal(res.identities[0], "irc:irc.rizon.net/scrollback", "got wrong identity");
			done();
		});
	});

	it('trying to get based on index: ', function(done) {
		rooms.get({by:"identity", eq: ['irc', 'irc.rizon.net/scrollback']}, function(err, data) {
			var res;
			assert(!err, "error thrown - ");
			assert.equal(data.length, 1, "got multiple objects");
			res = data[0];
			assert.equal(res.id, "scrollback", "got wrong room");
			assert.equal(res.identities[0], "irc:irc.rizon.net/scrollback", "got wrong identity");
			done();
		});
	});

	it('trying insert of multiple items: ', function (done) {
		users.put([{id: 'user-aravind', name:"aravind"}, {id: 'user-harish', name:"harish"}], function(err) {
			assert(!err, "error thrown");
			done();
		});
	});

	it('checking multiple inserts 1: ', function(done) {
		users.get('user-aravind', function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res.id, "user-aravind", "got wrong user");
			assert.equal(res.name, "aravind", "something wrong. value of a property is wrong");
			done();
		});
	});

	it('checking multiple inserts 2: ', function(done) {
		users.get('user-harish', function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res.id, "user-harish", "got wrong user");
			assert.equal(res.name, "harish", "something wrong. value of a property is wrong");
			done();
		});
	});

	it('overwrite user: ', function(done) {
		users.put({id: 'user-harish', name: "harish kumar v"}, function(err, res) {
			assert(!err, "error thrown - ");
			done();
		});
	});

	it('checking user overwrite 1: ', function(done) {
		users.get('user-harish', function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res.id, "user-harish", "got wrong user");
			assert.equal(res.name, "harish kumar v", "something wrong. value of a property is wrong");
			done();
		});
	});

	it('overwrite room: ', function(done) {
		rooms.put({
			id: 'scrollback',
			identities: ['irc:irc.rizon.net/scrollfree']
		}, function(err, res) {
			assert(!err, "error thrown - ");
			done();
		});
	});

	it('checking room overwrite 1: ', function(done) {
		rooms.get('scrollback', function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res.id, "scrollback", "got wrong room");
			assert.equal(res.identities[0], "irc:irc.rizon.net/scrollfree", "got wrong identity");
			done();
		});
	});

	it('checking room overwrite 2: ', function(done) {
		rooms.get({by:"identity", eq: ['irc','irc.rizon.net/scrollfree']}, function(err, data) {
			var res;
			assert(!err, "error thrown - ");
			assert.equal(data.length, 1, "got multiple objects");
			res = data[0];
			assert.equal(res.id, "scrollback", "got wrong room");
			assert.equal(res.identities[0], "irc:irc.rizon.net/scrollfree", "got wrong identity");
			done();
		});
	});

	it('checking old index after overwrite: ', function(done) {
		rooms.get({by:"identity", eq: ['irc:irc.rizon.net/scrollback']}, function(err, data) {
			assert(!err, "error thrown - ");
			assert.equal(data.length, 0, "why did it return data for old index");
			done();
		});
	});

	it('testing preUpdate with user: ', function(done) {
		users.put({id: 'user-harish', name:"harish", mail: "harish@IamAfreakinGenius.com"}, { preUpdate: function(old, obj) {
			obj.name = old.name;
		}}, function(err, res) { 
			assert(!err, "error thrown - ");
			done();
		});	
	});

	it('checking after update: ', function(done) {
		users.get('user-harish', function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res.id, "user-harish", "got wrong user");
			assert.equal(res.name, "harish kumar v", "something wrong. value of a property is wrong");
			assert.equal(res.mail, "harish@IamAfreakinGenius.com", "something wrong. value of a property is wrong");
			done();
		});
	});

	it('testing insert abort with preUpdate: ', function(done) {
		users.put({id: 'user-harish', name:"harish", mail: "harish@IamAfreakinGenius.com"}, { preUpdate: function(old, obj) {
			obj.name = old.name;
		}}, function(err, res) { 
			assert(!err, "error thrown - ");
			done();
		});	
	});

	it('checking after update abort: ', function(done) {
		users.get('user-harish', function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res.id, "user-harish", "got wrong user");
			assert.equal(res.name, "harish kumar v", "something wrong. value of a property is wrong");
			assert.equal(res.mail, "harish@IamAfreakinGenius.com", "something wrong. value of a property is wrong");
			done();
		});
	});

	it('should putMessages', function (done) {
		var m = [], n, i;
		for(i=0;i<10;i++) {
			m.push({
				from: 'harish',
				to: 'scrollback',
				time: (time + i*2000),
				text: "text"+(i+1)
			});
		}
		
		for(i=10;i<20;i++) {
			m.push({
				from: 'aravind',
				to: 'scrollback',
				time: (time + i*2000),
				text: "text"+(i+1)
			});
		}
		for(i=20;i<30;i++) {
			m.push({
				from: 'harish',
				to: 'nodejs',
				time: (time + i*2000),
				text: "text"+(i+1)
			});
		}
		
		for(i=30;i<40;i++) {
			m.push({
				from: 'aravind',
				to: 'nodejs',
				time: (time + i*2000),
				text: "text"+(i+1)
			});
		}

		messages.put(m, function(err, res) {
			assert(!err, "error thrown - ");
			done();
		});
	});

	it("trying to get using one value on index with two keys", function(done) {
		messages.get({by:"totime", eq:['scrollback']}, function(err, data) {
			assert(!err, "error thrown - ");
			assert(data.length, 20, "error thrown - ");
			data.forEach(function(msg) {
				assert.equal(msg.to, "scrollback", "message from another room got in.");
			});
			done();
		});
	});

	it("trying to get using one value on index with two keys", function(done) {
		messages.get({by:"totime", gte:['scrollback', time], lte:['scrollback']}, function(err, data) {
			assert(!err, "error thrown - ");
			assert(data.length, 20, "error thrown - ");
			data.forEach(function(msg) {
				assert.equal(msg.to, "scrollback", "message from another room got in.");
			});
			done();
		});
	});

	it("trying to get using one value on index with two keys", function(done) {
		messages.get({by:"totime", gte:['scrollback', time+(20000)], lte:['scrollback']}, function(err, data) {
			assert(!err, "error thrown - ");
			assert(data.length, 10, "error thrown - ");
			data.forEach(function(msg) {
				assert.equal(msg.to, "scrollback", "message from another room got in.");
			});
			done();
		});
	});

	it("trying to get using one value on index with two keys", function(done) {
		messages.get({by:"totime", gte: ['scrollback'], lte:['scrollback', time+(20000)]}, function(err, data) {
			var t;
			assert(!err, "error thrown - ");
			assert(data.length, 10, "error thrown - ");
			t = data[0].time;
			data.forEach(function(msg) {
				assert.equal(msg.to, "scrollback", "message from another room got in.");
				assert(t<=msg.time, "scrollback", "message from another room got in.");
				t = msg.time;
			});
			done();
		});
	});

	it("testing reversed", function(done) {
		messages.get({by:"totime", gte: ['scrollback', time], lte:['scrollback'], reverse: true}, function(err, data) {
			var t;
			assert(!err, "error thrown - ");
			assert(data.length, 10, "error thrown - ");
			t = data[0].time;
			data.forEach(function(msg) {
				assert.equal(msg.to, "scrollback", "message from another room got in.");
				assert(t>=msg.time, "message from another room got in.");
				t = msg.time;
			});
			done();
		});
	});

	it("testing limit", function(done) {
		messages.get({by:"totime", gte: ['scrollback', time], lte:['scrollback'], limit: 5}, function(err, data) {
			var t;
			assert(!err, "error thrown - ");
			assert(data.length, 5, "limit not working.");
			t = data[0].time;
			assert.equal(time, t, "time not correct");
			data.forEach(function(msg) {
				assert.equal(msg.to, "scrollback", "message from another room got in.");
				assert(t<=msg.time, "message from another room got in.");
				t = msg.time;
			});
			done();
		});
	});

	it('should getAllMessages', function (done) {
		messages.get(function(err, data) { 
			assert(!err, "error thrown - ");
			assert(data.length, 40, "limit not working.");
			done(); 
		});
	});
});


describe("testing links: ", function() {
	it("adding link", function(done) {
		rooms.link('scrollback', 'hasOccupant', 'user-aravind', {entered: 343}, function(err, res) {
			assert(!err, "error thrown - ");
			done();	
		});
	});

	it("querying link", function(done) {
		rooms.get({by: 'hasOccupant', eq: 'user-aravind'}, function(err, res) {
			assert(!err, "error thrown - ");
			assert.equal(res[0].id, "scrollback", "wrong room");
			done();	
		});
	});

	it("querying link", function(done) {
		users.get({by: 'occupantOf', eq: ['scrollback'] }, function(err, res) {
			var ids = {}; 
			assert(!err, "error thrown - ");
			assert.equal(res[0].id, "user-aravind", "wrong room");
			assert.equal(res[0].entered, 343, "wrong room");
			done();	
		});
	});

	it("link overwrite", function(done) {
		rooms.link('scrollback', 'hasOccupant', 'user-aravind', {entered: 279}, function(err, res) {
			assert(!err, "error thrown - ");
			done();	
		});
	});

	it("querying link", function(done) {
		users.get({by: 'occupantOf', eq: ['scrollback'] }, function(err, res) {
			var ids = {}; 
			assert(!err, "error thrown - ");
			assert.equal(res[0].id, "user-aravind", "wrong room");
			assert.equal(res[0].entered, 279, "wrong room");
			done();	
		});
	});

	it("adding more link", function(done) {
		rooms.link('scrollback', 'hasOccupant', 'user-harish', {entered: 420}, function(err, res) {
			assert(!err, "error thrown - ");
			done();	
		});
	});

	it("querying link", function(done) {
		users.get({by: 'occupantOf', eq: ['scrollback'] }, function(err, res) {
			var ids = {}; 
			assert(!err, "error thrown - ");
			res.forEach(function(e) {
				ids[e.id] = e;
			});
			assert(ids['user-harish'],"wrong room");
			assert(ids['user-aravind'],"wrong room");
			assert(ids['user-harish'].entered, 420,"wrong room");
			assert(ids['user-aravind'].entered, 279,"wrong room");
			done();	
		});
	});
	it('Unlink', function (done) {
		users.unlink('user-aravind', 'occupantOf', 'scrollback', function(err, res) {
			assert(!err, "error thrown - ");
			done();
		});
	});
		it("querying link", function(done) {
		users.get({by: 'occupantOf', eq: ['scrollback'] }, function(err, res) {
			var ids = {}; 
			assert(!err, "error thrown - ");
			res.forEach(function(e) {
				ids[e.id] = e;
			});
			assert(!ids['user-aravind'],"wrong room");
			done();	
		});
	});
	
});
