/*
	Given an object, executes the index functions and collects the keys
	into an object.
*/

/* global module, require */

module.exports = function (obj) {
	var ix, ino = [], done = false, self = this,
		type = this.type, opt = this.opt, 
		flds = this.db.flds, hdrs = this.db.hdrs;
	
	ino.push(type + flds + obj.id);
	for(ix in opt.indexes) {
		opt.indexes[ix](obj, push);
	}
	done = true;
	
	function push() {
		if(done) throw Error('ERR_INDEX_ASYNC_FUNCTION ' + type);
		ino.push(type + hdrs + ix + self.db.key(arguments) + flds + obj.id);
	}
	
	return ino;
};
