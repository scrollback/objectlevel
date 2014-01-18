/* global module, require, console */

module.exports = function (link) {
	var rels = Object.keys(link);
	if(rels.length !== 2 || rels[0] == rels[1]) throw Error("ERR_BAD_LINK");
	if(rels[0].indexOf(this.hdrs) != -1 || rels[1].indexOf(this.hdrs) != -1) throw Error('ERR_BAD_LINK_NAME');
	try {
		link[rels[0]].opt.links[rels[1]] = link[rels[1]].type + this.hdrs + rels[0];
		link[rels[1]].opt.links[rels[0]] = link[rels[0]].type + this.hdrs + rels[1];
	} catch(e) {
		throw Error("ERR_BAD_LINK " + e.message);
	}
};