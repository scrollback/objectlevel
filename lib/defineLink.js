module.exports = function (link, opt) {
	var rels = Object.keys(link), indexes = (opt && opt.indexes) || false;
		
	if(rels.length !== 2 || rels[0] == rels[1]) throw Error("ERR_BAD_LINK");
	if(rels[0].indexOf(this.hdrs) != -1 || rels[1].indexOf(this.hdrs) != -1) throw Error('ERR_BAD_LINK_NAME');
	
	try {
		link[rels[0]].opt.links[rels[1]] = { type: link[rels[1]].type, rel: rels[0], indexes: indexes };
		link[rels[1]].opt.links[rels[0]] = { type: link[rels[0]].type, rel: rels[1], indexes: indexes };
	} catch(e) {
		throw Error("ERR_BAD_LINK " + e.message);
	}
};