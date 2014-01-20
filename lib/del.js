/* global module, require */

module.exports = function(id, cb) {
	cb = cb || function() {};
	var batch = [], pkey = type + flds + id, 
		type = this.type, db = this.db.level, files = this.db.files,
		flds = this.db.flds, self = this;
	
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
			var key;
			
			self.index(data).forEach(function (key) {
				batch.push({type: 'del', key: key});
			});
			
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_DEL_BATCH " + err.message));
				self.unlink(id, cb);
			});
		}
	});
};
