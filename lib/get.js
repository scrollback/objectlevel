/*
	Retrieves one or more objects, given an id or a query.
	
	Queries contain a 'by' property, which contains the name of an index or
	a relationship and either a single value to search for ('eq') or a range
	of values ('start' and/or 'end').
	
	
*/

/* global module, require, console, Buffer */
var  decode = require("./encode.js").decode;
module.exports = function(q, cb) {
	var key, err, res=[], rel={}, getc=0, 
		type = this.type, opt = this.opt,
		db = this.db.level, files = this.db.files, 
		flds = this.db.flds, hdrs = this.db.hdrs;
	
	cb = cb || function() {};
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
		if(q.by && !opt.indexes[q.by] && !opt.links[q.by] && q.by!='id') {
			cb(Error("ERR_GET_BAD_INDEX " + q.by));
		}
		
		key = type + (q.by && (q.by!='id')? hdrs + q.by: '');
		q.limit  = (!q.key && (!q.limit || q.limit > 1024))? 1024: q.limit;
		
		if(q.eq) q.start = q.end = q.eq;
		if(q.start && !(q.start instanceof Array)) q.start = [q.start];
		if(q.end && !(q.end instanceof Array)) q.end = [q.end];
		
		q.start = Buffer(key + (q.start? this.db.key(q.start): '') + flds);
		q.end = Buffer.concat([Buffer(key + (q.end? this.db.key(q.end): '') + flds), Buffer([0xff])]);
		
		q.values = !q.keys;
		q.keys = !q.values;
				
		getc++;
		db.createReadStream(q).
		on('data', function(data) { res.push(data); }).
		on('error', function(e) { err = e; }).
		on('close', results);
		
		if(opt.links[q.by] && q.eq && !q.keys) {
			getc++;
			key = opt.links[q.by]+hdrs+type+hdrs+q.by + flds + q.eq + flds;
			db.createReadStream({ start: Buffer(key), end: Buffer.concat([Buffer(key), Buffer([0xff])]) }).
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
		
		if(q.keys) {
			res.forEach(function(key) {
				ret.push(key.split(flds).slice(1).map(decode));
			});
			return cb(null, ret);
		}
		
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