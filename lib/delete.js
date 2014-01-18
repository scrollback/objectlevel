/* global module, require */

module.exports = function(id, cb) {
	cb = cb || function() {};
	var batch = [], pkey = type + flds + id, 
		type = this.type, db = this.db.level, flds = this.db.flds,
		self = this;
	
	this.get(id, function(err, data) {
		if(err && !err.notFound) return cb("ERR_DEL_GET " + err.message);
		if(!data) return cb();
		var key;
		
		self.index(data).forEach(function (key) {
			batch.push({type:'del', key:key});
		});
		
		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_DEL_BATCH " + err.message));
			self.unlink(id, cb);
		});
	});
};
