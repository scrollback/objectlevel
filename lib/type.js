/*
	Restrictions:
	
	The *names* of object types, indexes and links must not contain
	the colon character (:). Index values that are strings must not
	contain the null character (\0).
	
	Index functions must be synchronous, i.e. all calls to emit must
	happen before the function returns. They should also be consistent,
	i.e. multiple calls with the same object should emit the same values.
*/

function Type(database, type, opt) {
	var i;
	opt = opt || {};
	
	if(typeof type !== 'string') throw Error('ERR_BAD_TYPE_NAME');
	for(i in opt.indexes) if(i.indexOf(database.hdrs) != -1) throw Error('ERR_BAD_INDEX_NAME');

	this.indexes = opt.indexes || {};
	this.links = {};
	
	this.db = database;
	this.type = type;
}

Type.prototype.index = function (obj) {
	var ix, ino = [], done = false, self = this;
	
	function push() {
		if(done) throw Error('ERR_INDEX_ASYNC_FUNCTION ' + self.type);
		var value = [].slice.call(arguments, 0);
		value.push(obj.id);
		ino.push(self.getIndexKey(ix, value));
	}
	
	/* jshint -W088 */
	for(ix in this.indexes) this.indexes[ix](obj, push);
	/* jshint +W088 */
	done = true;
	return ino;
	
};

Type.prototype.getDataKey = function(d) {
	if(typeof d === 'object') {
//		console.log("DATA KEY OBJECT", d);
		d = d.id;
	}
	return this.db.dpre + this.type + this.db.flds + (d? d + this.db.flds: '');
};

Type.prototype.getIndexKey = function(name, value) {
	if(!this.indexes[name] && !this.links[name]) throw Error("ERR_NO_SUCH_INDEX " + name);
	if(!Array.isArray(value)) value = [value];
	return this.db.ipre + this.type + this.db.hdrs + name + this.db.flds + this.db.key(value) + this.db.flds;
};

Type.prototype.get = require("./get.js");
Type.prototype.put = require("./put.js");
Type.prototype.del = require("./del.js");
Type.prototype.link = require("./linkup.js");
Type.prototype.unlink = require("./unlink.js");

module.exports = Type;