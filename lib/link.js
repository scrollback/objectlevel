function Link(fromType, outRel, toType, inRel, opt) {
	opt = opt || {};
	
	this.db = fromType.db;
	this.fromType = fromType;
	this.outRel = outRel;
	this.toType = toType;
	this.inRel = inRel;
	
	this.indexes = opt.indexes || {};
}

Link.prototype.index = function (from, to, data) {
	var ix, ino = [], done = false, self = this;
	
	if(typeof from === 'object') from = from.id;
	if(typeof to === 'object') to = to.id;
	
	function push() {
		if(done) throw Error('ERR_INDEX_ASYNC_FUNCTION ' + self.type);
		var value = [].slice.call(arguments, 0);
		value.unshift(to); value.push(from);
		ino.push(self.getIndexKey(ix, value));
	}
	
	push(); // Add key the link itself (without any link data indexes)
	
	/* jshint -W088 */
	for(ix in this.indexes) this.indexes[ix](data, push);
	/* jshint +W088 */
	done = true;
	return ino;
	
};

Link.prototype.getDataKey = function(from, to) {
	var hdrs = this.db.hdrs, flds = this.db.flds;
	
	if(typeof from === 'object') from = from.id;
	if(typeof to === 'object') to = to.id;
	
	if(this.fromType.type < this.toType.type) {
		return this.db.dpre + this.fromType.type + hdrs + this.outRel + hdrs +
			this.toType.type + hdrs + this.inRel + flds + to + flds + from + flds;
	} else {
		return this.db.dpre + this.toType.type + hdrs + this.inRel + hdrs +
			this.fromType.type + hdrs + this.outRel + flds + from + flds + to + flds;
	}
};

Link.prototype.getIndexKey = function(name, value) {
	var hdrs = this.db.hdrs, flds = this.db.flds;

	if(name && !this.indexes[name]) throw Error("ERR_NO_SUCH_INDEX");
	if(!Array.isArray(value)) value = [value];
	
	return this.db.ipre + this.fromType.type + hdrs + this.outRel + 
		(name? hdrs + name: "") + flds + this.db.key(value) + flds;

};

module.exports = Link;
