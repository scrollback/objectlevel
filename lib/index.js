/*
	Given an object, executes the index functions and collects the keys
	into an object.
*/

/* global module, require */

module.exports = function (obj, indexes) {
	var ix, ino = [], done = false, self = this,
		pre, post, flds = this.db.flds, hdrs = this.db.hdrs;
	
	if(indexes) {
		/* link data index */
		pre = ''; post='';
	} else {
		/* normal object index */
		pre = this.type + hdrs;
		post = flds + obj.id;
		indexes = this.opt.indexes;
		ino.push(this.type + flds + obj.id);
	}
	
	for(ix in indexes) {
		indexes[ix](obj, push);
	}
	done = true;
	
	function push() {
		if(done) throw Error('ERR_INDEX_ASYNC_FUNCTION ' + self.type);
		ino.push(pre + ix + self.db.key(arguments) + post);
	}
	
	return ino;
};
