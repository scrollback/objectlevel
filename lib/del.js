module.exports = function(id, cb) {
	cb = cb || function() {};
	var batch = [], type = this.type, 
		db = this.db.level, files = this.db.files,
		flds = this.db.flds, pkey = type + flds + id,
		self = this;
	
	db.get(pkey, function(err, oldRange) {
		if(err && !err.notFound) {
			return cb(Error("ERR_DEL_GET_OLD " + err.message + ' ' + id));
		}

		if(!oldRange) {
			queue();
		} else {
			files.del(oldRange, type);
			files.get(oldRange, type, function(err, old) {
				if(err) return cb(Error("ERR_DEL_FILE_READ " + err.message));
				queue(old);
			});
		}
		
		function queue(data) {
			if(!data) return cb();
			var i, l, ino;
			
			ino = self.index(data);
			for(i=0, l=ino.length; i<l; i++) batch.push({type: 'del', key: ino[i]});
			
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_DEL_BATCH " + err.message));
				self.unlink(id, cb);
			});
		}
	});
};
