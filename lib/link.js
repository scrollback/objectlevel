/*
	Creates a link between two objects.
*/
/* global module, require, console */

module.exports = function(from, rel, to, data, cb) {
	var fromkey, totype, tokey, 
		type = this.type, opt = this.opt, 
		db = this.db.level, files = this.db.files, 
		flds = this.db.flds, hdrs = this.db.hdrs,
		keys = this.db.keys;
	
	cb = cb || function() {};
	data = data || {};
	
	if(!opt.links[rel]) return cb(Error("ERR_LINK_BAD_REL " + rel));
	
	totype = opt.links[rel].split(hdrs)[0];
	tokey = totype + flds + to;
	fromkey = this.type + flds + from;

	if(typeof data === 'function') cb = data;
	if(typeof data !== 'object') data = null;
	
	db.get(fromkey, function(err, fromrange) {
		if(err) return cb(Error("ERR_LINK_GET_OBJ " + err.message));
		db.get(tokey, function(err, torange) {
			var range, batch=[], ot=type+hdrs+rel, it=opt.links[rel];
			if(err) return cb(Error("ERR_LINK_GET_OBJ " + err.message));
						
			batch.push({type:'put', key: ot + flds + to + flds + from, value:fromrange });
			if(opt.links[rel].indexOf(hdrs) != -1) {
				batch.push({type:'put', key: it + flds + from + flds + to, value:torange });
			}
			
			data[rel] = to; data[opt.links[rel].split(hdrs)[1]] = from;
			range = files.put(data, (ot<it? ot+hdrs+it: it+hdrs+ot));
			batch.push({type:'put', key: ot + hdrs + it + flds + from + flds + to, value:range});
			batch.push({type:'put', key: it + hdrs + ot + flds + to + flds + from, value:range});
			
			db.batch(batch, function(err) {
				if(err) return cb(Error("ERR_LINK_BATCH " + err.message));
				cb();
			});
		});
	});
};