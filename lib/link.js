/*
	Creates a link between two objects.
*/

module.exports = function(from, rel, to, data, cb) {
	var fromkey, tokey, fromrange, torange, old, link, self = this,
		type = this.type, opt = this.opt, 
		db = this.db.level, files = this.db.files, 
		flds = this.db.flds, hdrs = this.db.hdrs,
		ot, it, datahdr, odatakey, idatakey;
	
	cb = cb || function() {};
	
	if(!opt.links[rel]) return cb(Error("ERR_LINK_BAD_REL " + rel));
	
	link = opt.links[rel];
	tokey = link.type + flds + to; /* key of the object to which this link is made, already existing */
	fromkey = type + flds + from; /* key of the object from which this link is makde, already existing */
	ot=type+hdrs+rel; it=link.type+hdrs+link.rel; /* the header for the outgoing and incoming link keys */
	datahdr = ot<it? ot+hdrs+it: it+hdrs+ot; /* the header for the key for the link data */
	odatakey = ot + hdrs + it + flds + from + flds + to;
	idatakey = it + hdrs + ot + flds + to + flds + from;
	
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
	
	db.get(odatakey, function(err, datarange) {
		if(err && !err.notFound) return cb(Error("ERR_LINK_GET_DATA " + err.message));
		if(datarange) {
			files.get(datarange, datahdr, function(err, olddata) {
				if(err) throw err; //return cb(Error("ERR_LINK_FETCH_DATA ", err));
				old = { range: datarange, data: olddata };
				gotranges();
			});
		} else {
			old = {};
			gotranges();
		}
	});

	function gotranges() {
		if(!fromrange || !torange || !old) return;

		var range, batch=[], ino, i, l, ind, nin = {}, oin = {};

		if(link.indexes) {
			if(old.data) {
				console.log("OLD DATA", old.data);
				ind = self.index(old.data, link.indexes);
				for(i=0, l=ind.length; i<l; i++) oin[ind[i]] = old.data;
			}
			
			ino = self.index(data, link.indexes);
			for(i=0, l=ino.length; i<l; i++) {
				if(!oin[ino[i]]) {
					batch.push({type:'put', key: ot + flds + to + flds + ino[i] + flds + from, value:fromrange });
					batch.push({type:'put', key: it + flds + from + flds + ino[i] + flds + to, value:torange });
				}
				nin[ino[i]] = true;
			}
			
			if(ind) for(i=0, l=ind.length; i<l; i++) {
				if(!nin[ind[i]]) {
					batch.push({type:'del', key: ot + flds + to + flds + ind[i] + flds + from });
					batch.push({type:'del', key: it + flds + from + flds + ind[i] + flds + to });
				}
			}
			
		} else {
			batch.push({type:'put', key: ot + flds + to + flds + from, value:fromrange });
			batch.push({type:'put', key: it + flds + from + flds + to, value:torange });
		}

		data[rel] = to; data[link.rel] = from;
		range = files.put(data, datahdr);
		if(old && old.range) files.del(old.range, datahdr);

		batch.push({type:'put', key: odatakey, value:range});
		batch.push({type:'put', key: idatakey, value:range});
		
		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_LINK_BATCH " + err.message));
			cb();
		});
	}
};
