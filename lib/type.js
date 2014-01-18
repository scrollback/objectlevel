/*
	Restrictions:
	
	The *names* of object types, indexes and links must not contain
	the colon character (:). Index values that are strings must not
	contain the null character (\0).
	
	Index functions must be synchronous, i.e. all calls to emit must
	happen before the function returns. They should also be consistent,
	i.e. multiple calls with the same object should emit the same values.
*/

/* global module, require, console */

function Type(database, type, opt) {
	var i;
	
	if(typeof type !== 'string') throw Error('ERR_BAD_TYPE_NAME');
	opt = opt || {};
	opt.indexes = opt.indexes || {};
	opt.links = {};
	
	for(i in opt.indexes) if(i.indexOf(database.hdrs) != -1) throw Error('ERR_BAD_INDEX_NAME');
	
	this.db = database;
	this.type = type;
	this.opt = opt;
}

Type.prototype.index = require("./index.js");

Type.prototype.get = require("./get.js");
Type.prototype.put = require("./put.js");
Type.prototype.delete = require("./delete.js");
Type.prototype.link = require("./link.js");
Type.prototype.unlink = require("./unlink.js");

module.exports = Type;