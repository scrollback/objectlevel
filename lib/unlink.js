/*
	Removes links between objects.
	
	When called with from, rel and to arguments, a single, specific link is removed.
	When called with from and rel properties, all links of that type are removed.
	When called with just a from property, all links referring that object are removed.
*/

module.exports = function(from, rel, to, cb) {
	var batch = [], relc, 
		type = this.type, opt = this.opt, db = this.db.level,
		flds = this.db.flds, hdrs = this.db.hdrs;
	
	if(typeof rel === 'function') {
		cb = rel; rel=null; to=null;
	} else if(typeof to === 'function') {
		cb = to; to = null;
	}
	cb = cb || function() {};
	
	console.log("UNLINK ARGUMENTS FINAL", from, rel, to);
	
	if(!rel) {
		relc = 0;
		for(rel in opt.links) addrel(rel);
	} else addrel(rel);
	
	function addrel(rel) {
		var link = opt.links[rel], cto,
			tokey = Buffer(link.type + hdrs + link.rel + flds + from + flds);
		relc++;
		if(!link) return cb(Error("ERR_LINK_BAD_REL " + rel));
		
		db.createReadStream({ 
			start: tokey, 
			end: Buffer.concat([tokey, Buffer([0xff])]),
			keys: true, values: false
		}).on('data', function(key) {
			key = key.split(flds);
			cto = key.pop();
			if(!to || cto == to) addLink(from, rel, key.slice(2), to);
		}).on('close', exec);
	}
	
	function addLink(from, rel, key, to) {
		var link = opt.links[rel];
		
		key = key.length? flds + key.join(flds) + flds: flds;
		batch.push({type: 'del', key: type + hdrs + rel + flds + to + key + from });
		batch.push({ type: 'del', key: link.type + hdrs + link.rel + flds + from + key + to });
		
		/* Delete the link data */			
		batch.push({type:'del', key: type+hdrs+rel+hdrs+link.type+hdrs+link.rel + flds + from + flds + to});
		batch.push({type:'del', key: link.type+hdrs+link.rel+hdrs+type+hdrs+rel + flds + to + flds + from});
	}
	
	function exec() {
		if(--relc > 0) return;
		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_UNLINK_BATCH " + err.message));
			cb();
		});
	}
};