/*
	Saves an object or an array of objects, overwriting pre-existing objects
	with the same ID. Also updates indexes.
*/
/* global module, require, console */

var words = require('./words.js');

module.exports = function(objs, cb) {
	cb = cb || function(){};
	if(!(objs instanceof Array)) objs = [objs];
		
	var batch = [], putc = objs.length, error = null, 
		type = this.type, opt = this.opt, self = this,
		db = this.db.level, files = this.db.files,
		flds = this.db.flds;
	
	objs.forEach(function(obj) {
		if(!obj.id) obj.id = words.guid(32);
		var range = files.put(obj, type);
		
		db.get(type + flds + obj.id, function(err, oldRange) {
			if(err && !err.notFound) {
				return cb(Error("ERR_PUT_GET_OLD " + err.message + ' ' + q));
			}
			
			if(!oldRange) {
				queue();
			} else {
				files.del(oldRange, type);
				files.get(oldRange, type, function(err, old) {
					if(err) return cb(Error("ERR_PUT_FILE_READ " + err.message));
					queue(old);
				});
			}
			
			function queue(old) {
				var ino = self.index(obj);
				ino.forEach(function(key) {
					batch.push({type: 'put', key: key, value: range});
				});
				
				if(old) self.index(old).forEach(function(key) {
					if(ino.indexOf(key) == -1) batch.push({type: 'del', key: key});
				});
				
				done();
			}
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