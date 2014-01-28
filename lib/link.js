/*
	Creates a link between two objects.
*/

module.exports = function(from, rel, to, data, cb) {
	var fromkey, tokey, fromrange, torange, link, self = this,
		type = this.type, opt = this.opt, 
		db = this.db.level, files = this.db.files, 
		flds = this.db.flds, hdrs = this.db.hdrs;
	
	cb = cb || function() {};
	
	if(!opt.links[rel]) return cb(Error("ERR_LINK_BAD_REL " + rel));
	
	link = opt.links[rel];
	tokey = link.type + flds + to;
	fromkey = this.type + flds + from;

	if(typeof data === 'function') cb = data;
	if(typeof data !== 'object') data = {};
	
	db.get(fromkey, function(err, fr) {
		if(err) return cb(Error("ERR_LINK_GET_OBJ " + err.message));
		fromrange = fr;
		gotranges();
	});

	db.get(tokey, function(err, tr) {
		if(err) return cb(Error("ERR_LINK_GET_OBJ " + err.message));
		torange = tr;
		gotranges();
	});

	function gotranges() {
		if(!fromrange || !torange) return;

		var range, batch=[], ino, i, l,
			ot=type+hdrs+rel, it=link.type+hdrs+link.rel,
			datahdr = ot<it? ot+hdrs+it: it+hdrs+ot;

		if(link.indexes) {
			ino = self.index(data, link.indexes);
			for(i=0, l=ino.length; i<l; i++) {
				batch.push({type:'put', key: ot + flds + to + flds + ino[i] + flds + from, value:fromrange });
				batch.push({type:'put', key: it + flds + from + flds + ino[i] + flds + to, value:torange });
			}
		} else {
			batch.push({type:'put', key: ot + flds + to + flds + from, value:fromrange });
			batch.push({type:'put', key: it + flds + from + flds + to, value:torange });
		}

		data[rel] = to; data[link.rel] = from;
		range = files.put(data, datahdr);
		db.get(ot + hdrs + it + flds + from + flds + to, function(err, oldRange) {
			if(err) return;
			files.del(oldRange, datahdr);
		});

		batch.push({type:'put', key: ot + hdrs + it + flds + from + flds + to, value:range});
		batch.push({type:'put', key: it + hdrs + ot + flds + to + flds + from, value:range});

		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_LINK_BATCH " + err.message));
			cb();
		});
	}
};
