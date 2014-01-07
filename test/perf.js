var microtime = require("microtime");

var last = microtime.now();
module.exports = function(str, l) {
	var t = microtime.now();
	console.log(t - (l || last), str);
	last = t;
	return t;
}