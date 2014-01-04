/* global require, console, process */
var store = require("../index.js"),
	assert = require("assert");

var messages = store('messages', {
	indexes: {
		totime: function (room, emit) {
			emit(room.to, room.time);
		},
		tolabeltime: function(room, emit) {
			for(var i in room.labels) {
				emit(room.to, i, room.time);
			}
		}
	}
});


function putMessage(n, cb) {
	var m = {}, l=Math.random()*3, i;
	if(n <= 0) return cb();
	
	m.id = 'm' + Math.floor(Math.random()*32768).toString(16);
	m.text = Math.floor(Math.random()*32768).toString(3) + 
		Math.floor(Math.random()*32768).toString(4) + 
		Math.floor(Math.random()*32768).toString(5);
	m.from = 'u'+ Math.floor(Math.random()*200).toString(4);
	m.to = 'r'+ Math.floor(Math.random()*100).toString(4);
	m.time = new Date().getTime() - n*2000 - Math.floor(Math.random()*2000);
	m.labels = {};
	for(i=0; i<l; i++) m.labels[i] = Math.random();
	
	messages.put(m, function(err) {
		if(err) throw err;
		putMessage(n-1, cb);
	});
}

var start, end;

store.connect('./testdb', function() {
	var c = parseInt(process.argv[3]) || 1, i,
		l = parseInt(process.argv[4]) || 1000;
	
	console.log(process.argv[2], c, 'threads of', l);
	
	if(process.argv[2] == 'put') {
		start = new Date();
		for(i=0; i<c; i++) {
			putMessage(l, function() {
				end = new Date();
				console.log('put', l, 'in', end.getTime() - start.getTime());
			});
		}
	} else if(process.argv[2] == 'get') {
		start = new Date();
		for(i=0; i<c; i++) messages.get({by: 'totime', start: ['',  0], limit: l}, function(err, res) {
			var end = new Date();
			if(err) throw err;
			console.log('got', res.length, 'in', end.getTime() - start.getTime());
		});
	} else {
		console.log("Usage: node test {put|get} [<concurrent_requests>] [<messages_per_request>]");
	}
});

//


//messages.del('msg04');
//