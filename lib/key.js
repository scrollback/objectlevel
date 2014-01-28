/*
	Concatentates an array of index values into a 'key', encoding
	numbers and adding delimiters as necessary.
*/

var encode = require("./encode.js");

module.exports = function (args) {
	var key='', i, arg;
	for(i=0; i<args.length; i++) {
		arg = args[i];
		if(typeof arg === 'object') arg = JSON.stringify(arg);
		if(typeof arg === 'string' && arg.indexOf(this.flds) !== -1) {
			throw Error("ERR_INDEX_BAD_VALUE " + arg);
		}
		key += this.flds + (typeof arg === 'number'? encode(arg): arg);
	}
	return key;
};