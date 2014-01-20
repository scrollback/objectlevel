/* global require, module, exports, process, Buffer, console */

var fs = require('fs'), files={};

// var perf = require('./test/perf.js');

var encode = function(range) { return range.pos + ',' + range.len; },
	decode = function(str) { var a = str.split(','); return { pos: parseInt(a[0]), len: parseInt(a[1]) }; },
	noop = function(){};

module.exports = function(path) {
	function put(obj, file, cb) {
		var json =  JSON.stringify(obj) + '\n',
			buf = new Buffer(json),
			len = buf.length, range;
			
		queue('put', buf, file, cb || noop);
		file = files[file];
		range = {pos: file.fp, len: len-1};
		file.fp += len;
		return encode(range);
	}
	
	function get(range, file, cb) {
		cb = cb || noop;
		range = decode(range);
		queue('get', range, file, function(err, buf) {
			var obj;
			if(err) return cb(err);
			try { obj = JSON.parse(buf.toString()); 
			} catch(e) { return cb(e); }
			cb(null, obj);
		});
	}
	
	function del(range, file, cb) {
		queue('del', range + '\n', file, cb || noop);
	}
	
	function open(name, cb) {
		var file = files[name], stats, fname = path + '/' + name + '.data', c=2;
		try {
			stats = fs.statSync(fname);
			file.fp = stats.size;
		} catch(e) {
			file.fp = 0;
		}
		file.opening = true;
		file.ws = fs.createWriteStream(fname, {flags: 'a+'}).
		on('error', function(err) { return cb(err); }).
		on('open', function(f) {
			file.fd = f; done();
		});
		file.mws = fs.createWriteStream(path + '/' + name + '.meta').
		on('error', function(err) { return cb(err); }).
		on('open', done);
		
		function done() {
			if(--c > 0) return;
			file.opening = false; file.ready = true;
			cb();
		}
	}
		
	function queue(op, data, name, cb) {
		var file = files[name];
		if(!file) file = files[name] = { ready: false, queue: [] };
				
		file.queue.push({op: op, data: data, cb: cb || function(){} });
		
		if(file.ready) exec(file);
		else if(!file.opening) open(name, function(err) {
			if(err) return cb(err);
			exec(file);
		});
	}
	
	return { put: put, get: get, del: del };
};

function exec(file) {
	var task = file.queue.shift(),
		buf, range, t;
		
	if(!task) return;
	
	if(task.op === 'put') {
		file.ws.write(task.data, done);
	} else if(task.op === 'get') {
		range = task.data;
		buf = new Buffer(range.len);
		fs.read(file.fd, buf, 0, range.len, range.pos, function(err) {
			done(err, buf);
		});
	} else if(task.op === 'del') {
		file.mws.write(task.data, done);
	}
	
	function done(err, data) {
		task.cb(err, data);
		exec(file);
	}
}