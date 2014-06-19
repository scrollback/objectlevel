module.exports = function(id, cb) {
	cb = cb || function() {};
	var batch = [],
		db = this.db.level,
		self = this;
	
	db.get(self.getDataKey(id), function(err, old) {
		var i, l, ino;
		
		if(err && !err.notFound) return cb(Error("ERR_DEL_GET_OLD " + err.message + ' ' + id));
		batch.push({type: 'del', key: self.getDataKey(id)});
		
		ino = self.index(old);
		for(i=0, l=ino.length; i<l; i++) batch.push({type: 'del', key: ino[i]});
		
		function finish(err, b) {
			if(err) return cb(Error("ERR_DEL_UNLINK " + err.message));
			
			db.batch(b.concat(batch), function(err) {
				if(err) return cb(Error("ERR_DEL_BATCH " + err.message));
				cb();
			});			
		}
		
		finish.expectsBatch = true;
		self.unlink(id, finish);
	});
};
