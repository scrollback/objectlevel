/* global require, console, process */

var store = require("../index.js"),
	run = require("./runner.js"),
	words = require("../lib/words.js"),
	perf = require("./perf.js");

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
	var m = [];
	for(; n>0; n--) m.push({
		id: words.guid(32),
		from: Math.random() < 0.5? 'aravind': 'harish',
		to: Math.random() < 0.5? 'scrollback': 'nodejs',
		type: 'text',
		time: new Date().getTime() - n*2000 - Math.floor(Math.random()*2000),
		text: words.paragraph(1)
	});
	
	var t = perf("put started", b);
	messages.put(m, function() {
		perf("put completed", t);
		cb();
	});
}

var start, end;

store.connect('./testdb', function() {
	var c = parseInt(process.argv[3]) || 1, i,
		l = parseInt(process.argv[4]) || 1000,
		b;
	
	console.log(process.argv[2], c, 'threads of', l);
	
	function put() {
		putMessage(l, function() {
			end = new Date();
			
		});
	}
	
	function get() {
		var t = perf("get started", b);
		messages.get({by: 'totime', start: ['a', 0], limit: l}, function(err, res) {
			var end = new Date();
			if(err) throw err;
			perf("get completed", t);
		});
	}
	
	putMessage(1, function() {
		if(process.argv[2] == 'put') {
			b = perf("starting puts");
			for(i=0; i<c; i++) process.nextTick(put);
		} else if(process.argv[2] == 'get') {
			b = perf("starting gets");
			for(i=0; i<c; i++) process.nextTick(get);
		} else {
			console.log("Usage: node bench {put|get} [<concurrent_requests>] [<messages_per_request>]");
		}
	});
});

//


//messages.del('msg04');
//