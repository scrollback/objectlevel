var encode = require("../lib/encode.js");

function test() {
	var num, code, dec;
	for(var i=0; i<20; i++) {
		num = (i-10)*100000;
		code = encode(num);
		dec = encode.decode(code);
		console.log(dec == num, num, code.substr(1), dec);
	}
}

function rand() {
	return Math.random()*100000000000000;
}

test();