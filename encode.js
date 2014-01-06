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

module.exports = function (value) {
	var x = new Buffer(8);
	var h, l;
	
	x.writeDoubleBE(value, 0);
	
	if(value < 0) {
		h = (-x.readUInt32BE(0)) & 0xffffffff;
		l = (-x.readUInt32BE(4)) & 0xffffffff;
		x.writeInt32BE(h,0);
		x.writeInt32BE(l,4);
	}

	if(value >= 0) {
		h = x.readUInt8(0) | 0x80;
		x.writeUInt8(h,0);
	}
	
	return x.toString('base64');
};

