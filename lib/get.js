/*
	Retrieves one or more objects, given an id or a query.
	
	Queries contain a 'by' property, which contains the name of an index or
	a relationship and either a single value to search for ('eq') or a range
	of values ('gte' and/or 'lte').
	
	
*/

var  decode = require("./encode.js").decode;

module.exports = function(q, cb) {
	var self = this, db = this.db.level, flds = this.db.flds, hdrs = this.db.hdrs;
	
	cb = cb || function() {};
	if(typeof q === 'function') { cb = q; q = null; }
	
	function getObjFromDKey(key, cb) {
		db.get(key, function(err, data) {
			if(err && !err.notFound) return cb(Error("ERR_GET_BY_DKEY " + err.message + ' ' + key));
			if(typeof data !== 'undefined') try {
				data = JSON.parse(data);
			} catch(e) {
				return cb(Error("ERR_GET_BAD_JSON " + e.message));
			}
			cb(null, data);
		});
	}
	
	function getObjsFromIKeys(keys, cb) {
		var os = {}, ds = {}, fc = 0, i, l, error; // ObjectS, Data(S) and FetchCount
		
		function getObjFromIKey(key) {
			var link;
			if(error) return;
			key = key.split(flds);
			link = self.links[key[0].split(hdrs)[1]];
			
			fc++;
			getObjFromDKey(self.getDataKey(
				key[key.length-2]
			), function(err, obj) {
				if(err) error = err;
				else os[key[key.length-2]] = obj;
				done();
			});

			if(link) {
				fc++;
				getObjFromDKey(link.getDataKey(
					key[key.length-2],
					key[1]
				), function (err, obj) {
					if(err) error = err;
					else ds[key[key.length-2]] = obj;
					done();
				});
			}
		}
		
		function done() {
			var i, j, ret = [];
			if(--fc > 0) return;
			if(error) return cb(error);
			
			function push(r) { ret.push(r); }
			for(i in os) {
				if(ds[i]) for(j in ds[i]) os[i][j] = ds[i][j];
				if(q.map) q.map(os[i], push);
				else ret.push(os[i]);
			}

			cb(null, ret);
		}
		
		for(i=0, l=keys.length; i<l; i++) {
			getObjFromIKey(keys[i]);
		}
	}
	
	function getIKeysFromQuery(q, cb) {
		var res = [], ent = self, by = q.by, error = null;
		
		if(Array.isArray(q.by)) {
			ent = self.links[q.by[0]];
			by = q.by[1];
		}
		
		db.createReadStream({
			gte: Buffer(ent.getIndexKey(by, q.gte)),
			lte: Buffer.concat([Buffer(ent.getIndexKey(by, q.gte)), Buffer([0xff])]),
			values: false, keys: true, reverse: q.reverse, limit: q.limit
		}).
		on('data', function(data) { res.push(data); }).
		on('error', function(e) { error = Error("ERR_GET_IKEYS" + e.message); }).
		on('close', function() { cb(error, res); });
	}
	
	function getAllObjs(cb) {
		var res = [], error = null;
		
		db.createReadStream({
			gte: Buffer(self.getDataKey()),
			lte: Buffer.concat([Buffer(self.getDataKey()), Buffer([0xff])]),
			values: true, keys: false
		}).
		on('data', function(data) {
			try {
				res.push(JSON.parse(data));
			} catch(e) {
				error = Error("ERR_GET_BAD_JSON " + e.message);
			}
		}).
		on('error', function(e) { error = Error("ERR_GET_ALL" + e.message); }).
		on('close', function() { cb(error, res); });
	}
	
	function getObjsFromIds(ids, cb) {
		var ret = [], i, l, fc=0, error;
		
		for(i=0, l=ids.length; i<l; i++) {
			fc++;
			getObjFromDKey(self.getDataKey(ids[i]), push);
		}
		
		function push(err, obj) {
			if(err) error = err;
			if(error) return;
			ret.push(obj);
			done();
		}
		
		function done() {
			if(--fc > 0) return;
			if(error) return cb(error);
			return cb(null, ret);
		}
	}
	
	if(q === null) {
		getAllObjs(cb);
	} else if(typeof q !== 'object') {
		getObjFromDKey(self.getDataKey(q), cb);
	} else if(Array.isArray(q)) {
		getObjsFromIds(q, cb);
	} else {
		if(!q.by) {
			return cb(Error("ERR_GET_NO_INDEX"));
		} else if(Array.isArray(q.by)) {
			if(!self.links[q.by[0]]) return cb(Error("ERR_GET_BAD_LINK " + q.by[0]));
		} else if(!self.indexes[q.by] && !self.links[q.by]) {
			return cb(Error("ERR_GET_BAD_INDEX " + q.by));
		}
		
//		q.limit  = (!q.key && (!q.limit || q.limit > 1024))? 1024: q.limit;
		
		if(q.eq) q.gte = q.lte = q.eq;
		if(q.gte && !(Array.isArray(q.gte))) q.gte = [q.gte];
		if(q.lte && !(Array.isArray(q.lte))) q.lte = [q.lte];
				
		getIKeysFromQuery(q, function(err, keys) {
			var i, l, ret=[];
			
			if(keys.length === 0) return cb(null, []);
			
			if(q.keys) {
				for(i=0, l=keys.length; i<l; i++) {
					ret[i] = keys[i].split(flds).slice(1, -1).map(decode);
				}
				return cb(null, ret);
			}
			
			getObjsFromIKeys(keys, cb);
		});
	}
};
