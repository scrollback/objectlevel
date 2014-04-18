var encode = require("../lib/encode.js");

function dotest(num) {
	var code = encode(num),
		dec = encode.decode(code);
	
	if(dec !== num) {
		var x = new Buffer(8), y, z = new Buffer(8);
		x.writeDoubleBE(num, 0);
		z.writeDoubleBE(dec, 0);

		y = dec85(code.substr(1));

		console.log(
			"Failed " + num + " -> " + dec + " (" + 
			x.toString('hex') + ' > ' + y.toString('hex') + 
			' > ' + z.toString('hex') + ")"
		);
	}
//	else console.log(num + " passed");
}

function dec85(s) {
	var b, pad, val, c;
	pad = (5 - s.length%5) % 5;
	
	c = Buffer(s.length + pad);
	c.write(s, 0);
	if(pad) c.fill(126, s.length);
	b = Buffer((s.length + pad) * 4/5);
	
	for(var i=0; i<c.length/5; i++) {
		val = 0;
		for(var j=0; j<5; j++) {
			val = val*85 + c.readUInt8(i*5+j) - 42;
		}
		b.writeUInt32BE(val, i*4);
	}
	return b.slice(0, b.length - pad);
}

function test() {
	var i;
	for(i=0; i<200; i++) {
		dotest((i-200)*1000000);
	}
	// for(i=0; i<20; i++) {
	// 	dotest(rand());
	// }
	// dotest(0);
	// dotest(Infinity);
	// dotest(-Infinity)
}

function rand() {
	return (Math.random()-0.5)*100000000000000;
}

test();