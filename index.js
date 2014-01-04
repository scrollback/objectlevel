/* global require, console, module */

var level = require('level'),
	encode = require('./encode.js'),
	db, noop = function() {};

function hex(str) {
	var h = [], l=str.length, i;
	for(i=0; i<l; i++) h.push(str.charCodeAt(i).toString(16));
	console.log(h.join(' '));
}

var objectlevel = function(type, opt) {
	var api = {}, i;
	opt.indexes = opt.indexes || {};
	
	function indexVal(args) {
		var key='', i, arg;
		for(i=0; i<args.length; i++) {
			arg = args[i];
			key += '\u0000' + (typeof arg === 'number'? encode(arg): arg);
		}
		return key;
	}
	
	function indexes(obj) {
		var ino = {}, ix;
		
		function push() {
			var key = type + '\u0001' + ix + indexVal(arguments) + '\u0000' + obj.id;
			ino[key] = true;
		}
		
		for(ix in opt.indexes) {
			opt.indexes[ix](obj, push);
		}
		
		return ino;
	}
	
	var get = function (name, start, stop, opt, cb) {
		opt.by = name;
		opt.str = str;
		opt.num = num;
		api.get(opt, cb);
	};
	
	for(i in opt.indexes) {
		api[i] = get.bind(null, i);
	}
	
	api.put = function(obj, cb) {
		cb = cb || noop;
		if(!obj.id) return cb(Error("ERR_PUT_BAD_OBJ " + JSON.stringify(obj)));
		
		var pkey = type + '\u0000' + obj.id;

		db.get(pkey, function(err, old) {
			var ino, key, batch=[];
			if(err && !err.notFound) return cb(Error("ERR_PUT_GET_OLD " + err.message));
			
			batch.push({type:'put', key:pkey, value:JSON.stringify(obj)});
			
			ino = indexes(obj);
			for(key in ino) {
				batch.push({type:'put', key:key, value:JSON.stringify(obj)});
			}
			
			if(old) for(key in indexes(JSON.parse(old))) {
				if(typeof ino[key] === 'undefined') batch.push({type:'del', key:key});
			}
			
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_PUT_BATCH " + err.message));
				cb();
			});
		});
	};
	
	api.get = function(q, cb) {
		var key = type + '\u0001' + q.by, err, res=[];
		cb = cb || noop;

		function byId(ids) {
			var res=[], n=0, abort=false;
			
			ids.forEach(function (id, i) {
				db.get(type + '\u0000' + id, function(err, data) {
					if(err && !err.notFound) {
						abort = true;
						return cb(Error("ERR_GET_ID " + err.message + ' ' + id));
					}
					if(abort) return;
					try { res[i] = JSON.parse(data); } catch(e) {
						abort = true;
						return cb(Error("ERR_GET_ID_JSON " + err.message + ' ' + id));
					}
					n++;
					if(n===ids.length) return cb(null, res);
				});
			});
		}
		
		function results() {
			if(err) return cb(Error("ERR_GET_QUERY " + err.message + ' ' + JSON.stringify(q)));
			cb(null, res);
		}
		
		if(typeof q !== 'object') {
			try { cb(null, byId([q])); } catch(e) { cb(e); }
		} else if(q.by && (q.start || q.end)) {
			if(q.str) key += '\u0000' + q.str;
			q.limit  = (!q.limit || q.limit > 1024)? 1024: q.limit;
			
			q.start = key + (q.start? indexVal(q.start): '');
			q.end = key + (q.end? indexVal(q.end): '') + '\uffff';
			
			db.createReadStream(q).
			on('data', function(data) {
				res.push(JSON.parse(data.value)); 
			}).
			on('error', function(e) { err = e; }).
			on('close', results).resume();
		} else {
			return cb(Error("ERR_GET_BAD_QUERY " + JSON.stringify(q)));
		}
	};

	api.del = function(id, cb) {
		cb = cb || noop;
		var batch=[],
			pkey = type + '\u0000' + id;
		
		db.get(pkey, function(err, data) {
			if(err && !err.notFound) return cb("ERR_DEL_GET " + err.message);
			if(!data) return cb();
						
			batch.push({type:'del', key:pkey});
			for(key in indexes(JSON.parse(data))) {
				batch.push({type:'del', key:key});
			}
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_DEL_BATCH " + err.message));
				cb();
			});
		});
	};
	
	return api;
};

objectlevel.connect = function (path, cb) {
	db = level(path, cb);
};

module.exports = objectlevel;