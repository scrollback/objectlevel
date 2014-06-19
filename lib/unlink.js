/*
	Removes links between objects.
	
	When called with from, rel and to arguments, a single, specific link is removed.
	When called with from and rel properties, all links of that type are removed.
	When called with just a from property, all links referring that object are removed.
*/

var decode = require("./encode.js").decode;

module.exports = function(from, rel, to, cb) {
	var batch = [], relc = 0,
		self = this, db = this.db.level, 
		flds = this.db.flds, hdrs = this.db.hdrs;
	
	if(typeof rel === 'function') {
		cb = rel; rel=null; to=null;
	} else if(typeof to === 'function') {
		cb = to; to = null;
	}
	cb = cb || function() {};
	
	if(!rel) {
		for(rel in self.links) addrel(rel);
	} else addrel(rel);
	
	function addrel(rel) {
		var link = self.links[rel], revLink = link.toType.links[link.inRel], cto,
			tokey = Buffer(revLink.getIndexKey("", from));

		if(!link) return cb(Error("ERR_LINK_BAD_REL " + rel));
		
		relc++;
		db.createReadStream({ 
			start: tokey, 
			end: Buffer.concat([tokey, Buffer([0xff])]),
			keys: true, values: false
		}).on('data', function(key) {
			key = key.split(flds);
			cto = key[key.length - 2];
			if(!to || cto == to) addkey(link, from, cto, key[0].split(hdrs)[2], key.slice(2, -2).map(decode));
		}).on('close', exec);
	}
	
	function addkey(link, from, to, name, values) {
		var revLink = link.toType.links[link.inRel],
			revVals = [from].concat(values).concat([to]),
			forVals = [to].concat(values).concat([from]);
		
		batch.push({type: 'del', key: link.getIndexKey(name, forVals) });
		batch.push({ type: 'del', key: revLink.getIndexKey(name, revVals) });
		
		/* Delete the link data */
		batch.push({type:'del', key: link.getDataKey(from, to) });
	}
	
	function exec() {
		if(--relc > 0) return;
		
		if(cb.expectsBatch) return cb(null, batch);
		
		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_UNLINK_BATCH " + err.message));
			cb();
		});
	}
};