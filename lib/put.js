/*
	Saves an object or an array of objects, overwriting pre-existing objects
	with the same ID. Also updates indexes.
*/

module.exports = function(objs, options, cb) {
	if(typeof options == 'function') {
		cb = options;
		options = {};
	}
	cb = cb || function(){};
	options = options || {};
	if(!Array.isArray(objs)) { objs = [objs]; }
		
	var batch = [], putc = objs.length, self = this,
		db = this.db.level, i, l, obj;
	
	for(i=0, l=objs.length; i<l; i++) {
		obj = objs[i];
		if(!obj.id) obj.id = guid(32);
		db.get(self.getDataKey(obj), result(obj));
	}

	function result(obj) {
		return function (err, old) {
			if(err && !err.notFound) {
				return cb(Error("ERR_PUT_GET_OLD " + err.message + ' ' + obj.id));
			}
			
			if(!old) {
				queue(obj);
			} else {
				old = JSON.parse(old);
				if(options.preUpdate && options.preUpdate(old, obj) === false) return done();
				queue(obj, old);
			}
		};
	}
	
	function queue(obj, old) {
		var ino, ind, i, l, key, keyin = {}, nul = Buffer(1);
		nul.writeUInt8(0, 0);
		
//		console.log("Putting key ", self.getDataKey(obj));
		batch.push({type: 'put', key: self.getDataKey(obj), value: JSON.stringify(obj) });
		
		ino = self.index(obj);
		for(i=0, l=ino.length; i<l; i++) {
			key = ino[i];
			batch.push({type: 'put', key: key, value: nul });
			keyin[key] = true;
		}

		if(old) {
			ind = self.index(old);
			for(i=0, l=ind.length; i<l; i++) {
				key = ind[i];
				if(!keyin[key]) batch.push({type: 'del', key: key });
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

function guid (n) {
    var str="", i;
	n = n || 32;
	for(i=0; i<n; i++) str += (Math.random()*36|0).toString(36);
	return str;
}
