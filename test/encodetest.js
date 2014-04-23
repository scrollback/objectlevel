var encode = require("../lib/encode.js");

function testValue(num) {
	var code = encode(num),
		dec = encode.decode(code);
	if(dec !== num) console.log("Encode/Decode Error ", num, code, dec);
}

function testScale(scale, N) {
	var i, num, last, curr, dec;
	last = undefined;
	for(i=0; i<=N; i++) {
		num = (-1 + 2*i/N)*scale;
		curr = encode(num);
		if(typeof last !== 'undefined' && last && curr <= last) console.log("Monotonicity Error", num, curr, last);
		dec = encode.decode(curr);
		if(dec !== num) console.log("Encode/Decode Error ", num, curr, dec);
		
		last = curr;
	}
}

function test() {
	var i, M = 45;
	testValue(0);
	testValue(Infinity);
	testValue(-Infinity);
	
	for(i=0; i<=2*M; i++) {
		console.log("Testing scale ", Math.exp(i-M));
		testScale(Math.exp(i-M), 10000);
	}
}

var d = new Date();
test();
console.log(new Date() - d);