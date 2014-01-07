/*
	Restrictions:
	
	The *names* of object types, indexes and links must not contain
	the colon character (:). Index values that are strings must not
	contain the null character (\0).
	
	Index functions must be synchronous, i.e. all calls to emit must
	happen before the function returns. They should also be consistent,
	i.e. multiple calls with the same object should emit the same values.
*/

/* global require, console, module, process, Buffer */

var db, files,
	encode = require('./encode.js'),
	noop = function() {},
	flds = '|', // Must never occur in id's or index values
	hdrs = ':'; // Must never occur in type, index or link 
				// names and must be valid in filenames.

var objectlevel = function(type, opt) {
	var api = {}, i;
	if(typeof type !== 'string') throw Error('ERR_BAD_TYPE_NAME');
	opt = opt || {}; api.opt = opt; api.type = type;
	opt.indexes = opt.indexes || {};
	opt.links = opt.links || {};
	
	/*
		Concatentates an array of index values into a 'key', encoding
		numbers and adding delimiters as necessary.
	*/
	function indexVal(args) {
		var key='', i, arg;
		for(i=0; i<args.length; i++) {
			arg = args[i];
			if(typeof arg === 'object') arg = JSON.stringify(arg);
			if(typeof arg === 'string' && arg.indexOf(flds) !== -1) {
				throw Error("ERR_INDEX_BAD_VALUE " + arg);
			}
			key += flds + (typeof arg === 'number'? encode(arg): arg);
		}
		return key;
	}
	
	/*
		Given an object, executes the index functions and collects the keys
		into an object.
	*/
	function indexes(obj) {
		var ix, ino = [], done = false;
		
		ino.push(type + flds + obj.id);
		
		for(ix in opt.indexes) {
			opt.indexes[ix](obj, push);
		}
		
		done = true;
				
		function push() {
			if(done) throw Error('ERR_INDEX_ASYNC_FUNCTION ' + type);
			ino.push(type + hdrs + ix + indexVal(arguments) + flds + obj.id);
		}
		
		return ino;
	}
	
	/*
		Saves an object or an array of objects, overwriting pre-existing objects
		with the same ID. Also updates indexes.
	*/
	api.put = function(objs, cb) {
		cb = cb || noop;
		if(!(objs instanceof Array)) objs = [objs];
		
		var batch = [], putc = objs.length, error = null;
		objs.forEach(function(obj) {
			if(!obj.id) return cb(Error("ERR_PUT_BAD_OBJ " + JSON.stringify(obj)));
			var range = files.put(obj, type);
			
			api.get(obj.id, function(err, old) {
				var ino;
				if(err && !err.notFound) return cb(Error("ERR_PUT_GET_OLD " + err.message));
				
				ino = indexes(obj);
				ino.forEach(function(key) {
					batch.push({type:'put', key:key, value:range});
				});
				
				if(old) indexes(old).forEach(function(key) {
					if(typeof ino[key] === 'undefined') batch.push({type:'del', key:key});
				});
				
				done();
			});
		});
		
		function done() {
			if(--putc > 0) return;
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_PUT_BATCH " + err.message));
				cb();
			});
		}
	};
	
	/*
		Creates a link between two objects.
	*/
	api.link = function(from, rel, to, data, cb) {
		var fromkey = type + flds + from,
			totype, tokey;
		cb = cb || noop;
		
		if(!opt.links[rel]) return cb(Error("ERR_LINK_BAD_REL " + rel));
		
		totype = opt.links[rel].split(hdrs)[0];
		tokey = totype + flds + to;

		if(typeof data === 'function') cb = data;
		if(typeof data !== 'object') data = null;
		
		db.get(fromkey, function(err, fromrange) {
			db.get(tokey, function(error, torange) {
				var range, batch=[], ot=type+hdrs+rel, it=opt.links[rel];
				if(err) return cb(Error("ERR_LINK_GET_OBJ " + err.message));
				
				batch.push({type:'put', key: ot + flds + to + flds + from, value:fromrange });
				if(opt.links[rel].indexOf(hdrs) != -1) {
					batch.push({type:'put', key: it + flds + from + flds + to, value:torange });
				}
				
				if(data) {
					data[rel] = to; data[opt.links[rel].split(hdrs)[1]] = from;
					range = files.put(data, (ot<it? ot+hdrs+it: it+hdrs+ot));
					batch.push({type:'put', key: ot + hdrs + it + flds + from + flds + to, value:range});
					batch.push({type:'put', key: it + hdrs + ot + flds + to + flds + from, value:range});
				}
				
				db.batch(batch, function(err) {
					if(err) return cb(Error("ERR_LINK_BATCH " + err.message));
					cb();
				});
			});
		});
	};
	
	/*
		Removes links between objects.
		
		When called with from, rel and to arguments, a single, specific link is removed.
		When called with from and rel properties, all links of that type are removed.
		When called with just a from property, all links referring that object are removed.
	*/
	api.unlink = function(from, rel, to, cb) {
		var batch = [], relc;
		
		if(typeof rel === 'function') {
			cb = rel; rel=null; to='null';
		}
		if(typeof to === 'function') {
			cb = to; to = null;
		}
		
		cb = cb || noop;
		
		if(rel) {
			addrel(rel, reldone);
		} else {
			relc = 0;
			for(rel in opt.links) {
				addrel(rel, reldone);
			}
		}

		function reldone() {
			if(--relc > 0) return;
			exec();
		}
		
		function addrel(rel, done) {
			relc++;
			if(!opt.links[rel]) return cb(Error("ERR_LINK_BAD_REL " + rel));

			if(to) {
				add(from, rel, to);
				process.nextTick(done);
			} else {
				if(opt.links[rel].indexOf(hdrs) == -1) return cb();
				
				db.createReadStream({ 
					start: opt.links[rel] + flds + from + flds, 
					end: opt.links[rel] + flds + from + flds + '\uffff', 
					keys: true, values: false
				}).on('data', function(key) {
					add(from, rel, key.split(flds).pop());
				}).on('close', done);
			}
		}
		
		function add(from, rel, to) {
			batch.push({type: 'del', key: type + hdrs + rel + flds + to + flds + from, });
			
			if(opt.links[rel].indexOf(hdrs) != -1) {
				batch.push({ type: 'del', key: opt.links[rel] + flds + from + flds + to });
			}
			
			/* Delete the link data */			
			batch.push({type:'del', key: type+hdrs+rel+hdrs+opt.links[rel] + flds + from + flds + to});
			batch.push({type:'del', key: opt.links[rel]+hdrs+type+hdrs+rel + flds + to + flds + from});
		}
		
		function exec() {
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_UNLINK_BATCH " + err.message));
				cb();
			});
		}
	};
	
	/*
		Retrieves one or more objects, given an id or a query.
		
		Queries contain a 'by' property, which contains the name of an index or
		a relationship and either a single value to search for ('eq') or a range
		of values ('start' and/or 'end').
		
		
	*/
	
	api.get = function(q, cb) {
		var key, err, res=[], rel={}, getc=0;
		cb = cb || noop;
		if(typeof q === 'function') {
			cb = q; q = {};
		} 
		
		if(typeof q !== 'object') {
			db.get(type + flds + q, function(err, range) {
				if(err && !err.notFound) return cb(Error("ERR_GET_ID " + err.message + ' ' + q));
				if(!range) return cb(null, undefined);
				
				files.get(range, type, function(err, data) {
					if(err) return cb(Error("ERR_GET_FILE_READ " + err.message + ' ' + range));
					cb(null, data);
				});
			});
		} else {
			if(q.by && !opt.indexes[q.by] && !opt.links[q.by]) {
				cb(Error("ERR_GET_BAD_INDEX " + q.by));
			}
			
			key = type + (q.by? hdrs + q.by: '');
			q.limit  = (!q.limit || q.limit > 1024)? 1024: q.limit;
			
			if(q.eq) q.start = q.end = q.eq;
			if(q.start && !(q.start instanceof Array)) q.start = [q.start];
			if(q.end && !(q.end instanceof Array)) q.end = [q.end];
			
			q.start = key + (q.start? indexVal(q.start): '') + flds;
			q.end = key + (q.end? indexVal(q.end): '') + flds + '\uffff';
			
			q.keys = false; q.values = true;
			
			getc++;
			db.createReadStream(q).
			on('data', function(range) {
				res.push(range);
			}).
			on('error', function(e) { err = e; }).
			on('close', results);
			
			if(opt.links[q.by] && q.eq) {
				getc++;
				key = opt.links[q.by]+hdrs+type+hdrs+q.by + flds + q.eq + flds;
				db.createReadStream({ start: key, end: key + '\uffff' }).
				on('data', function(data) {
					rel[data.key.split(flds).pop()] = data.value;
				}).
				on('error', function(e) { err = e; }).
				on('close', results);
			}
		}
		
		function results() {
			var rs={}, ret = [], fetc=0, i, ot=type+hdrs+q.by, it=opt.links[q.by];
			if(--getc > 0) return;
			if(err) return cb(Error("ERR_GET_QUERY " + err.message + ' ' + JSON.stringify(q)));
			if(!res.length) cb(null, []);
						
			res.forEach(function(range) {
				fetc++;
				files.get(range, type, function(err, obj) {
					if(err) return cb(err);
					rs[obj.id] = obj;
					done();
				});
			});
			
			function fetchrel(i) {
				fetc++;
				files.get(rel[i], (ot<it? ot+hdrs+it: it+hdrs+ot), function(err, obj) {
					if(err) return cb(err);
					delete obj[q.by]; delete obj[opt.links[q.by].split(hdrs)[1]];
					rel[i] = obj;
					done();
				});
			}
			for(i in rel) fetchrel(i);
			
			
			function done() {
				var i, j;
				if(--fetc > 0) return;
				for(i in rs) {
					if(rel[i]) for(j in rel[i]) rs[i][j] = rel[i][j];
					ret.push(rs[i]);
				}
				cb(null, ret);
			}
		}
	};

	api.del = function(id, cb) {
		cb = cb || noop;
		var batch=[],
			pkey = type + flds + id;
		
		db.get(pkey, function(err, data) {
			if(err && !err.notFound) return cb("ERR_DEL_GET " + err.message);
			if(!data) return cb();
			var key;
			
			batch.push({type:'del', key:pkey});
			indexes(JSON.parse(data)).forEach(function (key) {
				batch.push({type:'del', key:key});
			});
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_DEL_BATCH " + err.message));
				api.unlink(id, cb);
			});
		});
	};
	
	return api;
};

objectlevel.connect = function (p, cb) {
	files = require('./files.js')(p);
	db = require('level')(p, cb);
};

objectlevel.defineLink = function (link) {
	var rels = Object.keys(link);
	if(rels.length !== 2 || rels[0] == rels[1]) throw Error("ERR_BD_LINK");
	try {
		link[rels[0]].opt.links[rels[1]] = link[rels[1]].type + hdrs + rels[0];
		link[rels[1]].opt.links[rels[0]] = link[rels[0]].type + hdrs + rels[1];
	} catch(e) {
		throw Error("ERR_BAD_LINK " + e.message);
	}
};

module.exports = objectlevel;