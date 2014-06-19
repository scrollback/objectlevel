var Link = require("./link.js");

module.exports = function (link, opt) {
	var rels = Object.keys(link);
		
	if(rels.length !== 2 || rels[0] == rels[1]) throw Error("ERR_BAD_LINK");
	if(rels[0].indexOf(this.hdrs) != -1 || rels[1].indexOf(this.hdrs) != -1) throw Error('ERR_BAD_LINK_NAME');
	
	var  inRel = rels[0], outRel = rels[1], fromType = link[inRel], toType = link[outRel];
		
	try {
		fromType.links[outRel] = new Link(fromType, outRel, toType, inRel, opt);
		toType.links[inRel] = new Link(toType, inRel, fromType, outRel, opt);
	} catch(e) {
		throw Error("ERR_BAD_LINK " + e.message);
	}
};