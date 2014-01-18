/*
	Removes links between objects.
	
	When called with from, rel and to arguments, a single, specific link is removed.
	When called with from and rel properties, all links of that type are removed.
	When called with just a from property, all links referring that object are removed.
*/
/* global module, require, process */

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
	
	if(!rel) {
		relc = 0;
		for(rel in opt.links) addrel(rel);
	} else addrel(rel);
	
	function addrel(rel) {
		relc++;
		if(!opt.links[rel]) return cb(Error("ERR_LINK_BAD_REL " + rel));

		if(to) {
			add(from, rel, to);
			process.nextTick(exec);
		} else {
			if(opt.links[rel].indexOf(hdrs) == -1) return cb();
			
			db.createReadStream({ 
				start: opt.links[rel] + flds + from + flds, 
				end: opt.links[rel] + flds + from + flds + '\uffff', 
				keys: true, values: false
			}).on('data', function(key) {
				add(from, rel, key.split(flds).pop());
			}).on('close', exec);
		}
	}
	
	function add(from, rel, to) {
		batch.push({type: 'del', key: type + hdrs + rel + flds + to + flds + from, });
		if(opt.links[rel].indexOf(hdrs) != -1) {
			batch.push({ type: 'del', key: opt.links[rel] + flds + from + flds + to });
		}
		
		/* Delete the link data */			
		batch.push({type:'del', key: type+hdrs+rel+hdrs+opt.links[rel] + flds + from + flds + to});
		batch.push({type:'del', key: opt.links[rel]+hdrs+type+hdrs+rel + flds + to + flds + from});
	}
	
	function exec() {
		if(--relc > 0) return;
		db.batch(batch, function(err) {
			if(err) return cb(Error("ERR_UNLINK_BATCH " + err.message));
			cb();
		});
	}
};