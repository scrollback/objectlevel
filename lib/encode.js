/*
	This function encodes 64-bit floats such that
	bitwise comparison of the binary corresponds
	to the numeric comparison of the original
	values.
	
	It does the equivalent of two's complement
	encoding of negative numbers, and sets the 
	highest bit for non-negative values.
	
	Returns an 8-byte big-endian binary buffer.
*/

/* global module, require, Buffer */

function encode (value) {
	var x = new Buffer(8);
	var h, l;
	
	x.writeDoubleBE(value, 0);
	
	if(value < 0) {
		l = (-x.readUInt32BE(4));
		h = (~x.readUInt32BE(0) + (l===0? 1: 0)); /* lower word overflows iff it is -0 */
		x.writeUInt32BE(h >>> 0,0); // discard bits higher than 32
		x.writeUInt32BE(l << 1 >>> 1,4); // discard bits higher than 31
	} else {
		/* non-negative; set the leading bit. */
		h = x.readUInt8(0) | 0x80;
		x.writeUInt8(h, 0);
	}
	
	return '\ue2f2' + enc85(x); 
	/* 
		The prefix is from the unicode private use area,
		and is expected to not appear as the first character
		of string key components. 2f2 is decimal 754, for
		IEEE 754 (the floating point spec)
	*/
}

encode.decode = function(str) {
	var x, h, l;
	if(str[0] != '\ue2f2') return str;
	x = dec85(str.substr(1));
	
	h = x.readUInt8(0);
	if(h > 127) {
		// originally a non-negative number. Just set the sign bit back to 0.
		h &= 0x7f;
		x.writeUInt8(h, 0);
	} else {
		l = (-x.readUInt32BE(4));
		h = ~(x.readUInt32BE(0) - (l===0? 1: 0));
		x.writeUInt32BE(h >>> 0, 0);
		x.writeUInt32BE(l >>> 0, 4);
	}
	return x.readDoubleBE(0);
};

module.exports = encode;

function enc85(b) {
	var val, c, pad, padb;
	
	pad = (4 - b.length%4) % 4;
	if(pad) {
		padb = Buffer(pad); padb.fill(0);
		b = Buffer.concat([b, padb]);
	}
	
	c = Buffer(b.length * 5/4);
	
	for(var i=0; i<b.length/4; i++) {
		val = b.readUInt32BE(i*4);
		for(var j=0; j<5; j++) {
			c.writeUInt8(42 + val%85, i*5 + (4-j));
			val = (val/85) | 0;
		}
	}
	
	return c.slice(0, c.length - pad).toString();
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