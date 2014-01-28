/* global global */

var fs = require("fs");

var f1 = fs.openSync("./testdata1.data", "r"),
	f2 = fs.openSync("./testdata2.data", "r"),
	f3 = fs.openSync("./testdata3.data", "r"),
	f4 = fs.openSync("./testdata4.data", "r"),
	field = parseInt(process.argv[3]);

var microtime = require("microtime"),
	run = require("./runner"),
	offs=[], i, blksize = 4096;

// console.log(stats);

for(i=0; i<1000; i++) {
	offs.push({pos: Math.floor(Math.random() * field), len: 10+Math.floor(Math.random()*20)});
}

function naive(fd, cb) {
	var i, c=0, t = microtime.now(), out=[];
	for(i=0; i<offs.length; i++) {
		c++;
		fs.read(fd, new Buffer(offs[i].len), 0, offs[i].len, offs[i].pos, done);
	}

	function done(err, n, buffer) {
		out.push(buffer.toString());
		if(--c>0) return;
		cb(null, {time: microtime.now() - t, bytes: out.join('\n').length, reads: offs.length});
	}
}

function chunked(fd, cb, blk) {
	var i, l, c=0, t, reads=[], r, out=[], p, s;
	var maxGap = parseInt(process.argv[2]);

	if(blk) maxGap = Math.floor(maxGap/blksize)*blksize;

	t = microtime.now();

	offs.sort(function(a, b) { return a.pos - b.pos; });

	for(i=0, l=offs.length; i<l; i++) {
		p = offs[i].pos; s = offs[i].len;
		if(r && p - r.pos - r.len < maxGap) {
			r.len = blk? Math.ceil((p + s - r.pos)/blksize)*blksize: p + s - r.pos;
			r.offs.push(offs[i]);
		} else {
			r = blk?{
				pos: Math.floor(p/blksize)*blksize,
				len: Math.ceil((s + p%blksize)/blksize)*blksize,
				offs: [offs[i]]
			}: { pos: p, len: s, offs: [offs[i]] };

			reads.push(r);
		}
	}

	for(i=0, l=reads.length; i<l; i++) {
		r = reads[i];
		c++;
		fs.read(fd, new Buffer(r.len), 0, r.len, r.pos, result(r));
	}

	function result(r) {
		return function(err, n, buffer) {
			var str = [], i, l, o;
			for(i=0, l=r.offs.length; i<l; i++) {
				o = r.offs[i];
				str.push(buffer.toString('utf8', o.pos - r.pos, o.pos - r.pos + o.len));
			}
			done(str);
		};
	}

	function done(str) {
		out = out.concat(str);
		if(--c>0) return;
		cb(null, {time: microtime.now() - t, bytes: out.join('\n').length, reads: reads.length});
	}
}

function gc(d) { var t = microtime.now(); global.gc(); d(null, microtime.now()-t); }

console.log('\nmaxGap', process.argv[2], 'field', process.argv[3]);

run("naive-warmup", function(d) { naive(f1, d); });
run("chunked-warmup", function(d) { chunked(f1, d, true); });
run("chunked-warmup", function(d) { chunked(f1, d); });
run("gc", gc);
run("naive", function(d) { naive(f2, d); });
run("gc", gc);
run("chunked-block", function(d) { chunked(f3, d, true); });
run("gc", gc);
run("chunked-fine", function(d) { chunked(f4, d); });

//
//
//var	words = require("../lib/words"),
//	ws = fs.createWriteStream('./testdata.data');
//
//ws.on('open', function() {
//	for(var i=0; i<100000; i++) {
//		ws.write(words.paragraph(78) + ' ');
//	}
//});
