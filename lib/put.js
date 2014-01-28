/*
	Saves an object or an array of objects, overwriting pre-existing objects
	with the same ID. Also updates indexes.
*/

var words = require('./words.js');

module.exports = function(objs, cb) {
	cb = cb || function(){};
	if(!(objs instanceof Array)) objs = [objs];
		
	var batch = [], putc = objs.length, error = null, 
		type = this.type, opt = this.opt, self = this,
		db = this.db.level, files = this.db.files,
		flds = this.db.flds, i, l, obj, range;
	
	for(i=0, l=objs.length; i<l; i++) {
		obj = objs[i];
		if(!obj.id) obj.id = words.guid(32);
		range = files.put(obj, type);
		db.get(type + flds + obj.id, result(range, obj));
	}

	function result(range, obj) {
		return function (err, oldRange) {
			if(err && !err.notFound) {
				return cb(Error("ERR_PUT_GET_OLD " + err.message + ' ' + obj.id));
			}
			
			if(!oldRange) {
				queue(range, obj);
			} else {
				files.del(oldRange, type);
				files.get(oldRange, type, function(err, old) {
					if(err) return cb(Error("ERR_PUT_FILE_READ " + err.message));
					queue(range, obj, old);
				});
			}
		};
	}
	
	function queue(range, obj, old) {
		var ino = self.index(obj), ind, i, l, key, keyin = {};
		for(i=0, l=ino.length; i<l; i++) {
			key = ino[i];
			batch.push({type: 'put', key: key, value: range});
			keyin[key] = true;
		}

		if(old) {
			ind = self.index(old);
			for(i=0, l=ind.length; i<l; i++) {
				key = ind[i];
				if(!keyin[key]) batch.push({type: 'del', key: key});
			}
		}

		done();
	}

	function done() {
		if(--putc > 0) return;
		
		console.log('batch', batch);

		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_PUT_BATCH " + err.message));
			cb();
		});
	}
};
