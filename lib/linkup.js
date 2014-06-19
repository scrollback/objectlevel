/*
	Creates a link between two objects.
*/

module.exports = function(from, rel, to, data, cb) {
	var fromObj, toObj, oldData, link, inLink,
		self = this, db = this.db.level;
	
	cb = cb || function() {};
	
	if(!self.links[rel]) return cb(Error("ERR_LINK_BAD_REL " + rel));
	
	link = self.links[rel];
	inLink = link.toType.links[link.inRel];
	
	if(typeof data === 'function') cb = data;
	if(typeof data !== 'object') data = {};
	
	db.get(self.getDataKey(from), function(err, fr) {
		if(err) return cb(Error("ERR_LINK_GET_OBJ " + err.message));
		fromObj = JSON.parse(fr);
		gotObjects();
	});

	db.get(link.toType.getDataKey(to), function(err, to) {
		if(err) return cb(Error("ERR_LINK_GET_OBJ " + err.message));
		toObj = JSON.parse(to);
		gotObjects();
	});
	
	db.get(link.getDataKey(from, to), function(err, data) {
		if(err && !err.notFound) return cb(Error("ERR_LINK_GET_DATA " + err.message));
		oldData = data? JSON.parse(data): false;
		gotObjects();
	});

	function gotObjects() {
		if(!fromObj || !toObj || typeof oldData === 'undefined') return;

		var batch=[], ino, ind, nin = {}, oin = {}, i, l, nul = Buffer(1);
		nul.writeUInt8(0, 0);

		if(link.indexes) {
			if(oldData) {
				ind = link.index(from, to, oldData).concat(inLink.index(to, from, oldData));
				for(i=0, l=ind.length; i<l; i++) oin[ind[i]] = true;
			}
			
			ino = link.index(from, to, data).concat(inLink.index(to, from, data));
			for(i=0, l=ino.length; i<l; i++) {
				if(!oin[ino[i]]) batch.push({type:'put', key: ino[i], value: nul });
				nin[ino[i]] = true;
			}
			
			if(ind) for(i=0, l=ind.length; i<l; i++) {
				if(!nin[ind[i]]) batch.push({type:'del', key: ind[i] });
			}
		}

		batch.push({type:'put', key: link.getDataKey(from, to), value: JSON.stringify(data) });
		
		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_LINK_BATCH " + err.message));
			cb();
		});
	}
};
