/*
	Saves an object or an array of objects, overwriting pre-existing objects
	with the same ID. Also updates indexes.
*/

var words = require('./words.js');

module.exports = function(objs, options, cb) {
	if(typeof options == 'function') {
		cb = options;
		options = {};
	}
	cb = cb || function(){};
	options = options || {};
	if(!(objs instanceof Array)) objs = [objs];
		
	var batch = [], putc = objs.length, 
		type = this.type, self = this,
		db = this.db.level, files = this.db.files,
		flds = this.db.flds, i, l, obj;
	
	for(i=0, l=objs.length; i<l; i++) {
		obj = objs[i];
		if(!obj.id) obj.id = words.guid(32);
		db.get(type + flds + obj.id + flds, result(obj));
	}

	function result(obj) {
		return function (err, oldRange) {
			if(err && !err.notFound) {
				return cb(Error("ERR_PUT_GET_OLD " + err.message + ' ' + obj.id));
			}
			
			if(!oldRange) {
				queue(files.put(obj, type), obj);
			} else {
				files.del(oldRange, type);
				files.get(oldRange, type, function(err, old) {
					if(err) return cb(Error("ERR_PUT_FILE_READ " + err.message));
					if(options.preUpdate && options.preUpdate(old, obj) === false) return done();
					queue(files.put(obj, type), obj, old);
				});
			}
		};
	}
	
	function queue(range, obj, old) {
		var ino, ind, i, l, key, keyin = {};
		
		ino = self.index(obj);
		for(i=0, l=ino.length; i<l; i++) {
			key = ino[i];
			batch.push({type: 'put', key: key + flds, value: range });
			keyin[key] = true;
		}

		if(old) {
			ind = self.index(old);
			for(i=0, l=ind.length; i<l; i++) {
				key = ind[i];
				if(!keyin[key]) batch.push({type: 'del', key: key + flds });
			}
		}

		done();
	}

	function done() {
		if(--putc > 0) return;
		
		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_PUT_BATCH " + err.message));
			cb();
		});
	}
};
