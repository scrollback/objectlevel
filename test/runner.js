var util = require("util");

Array.prototype.inspect = function(depth) {
	var str = '[', i;
	for(i=0; i<this.length && str.length < 240; i++) {
		str += util.inspect(this[i], {colors: true,depth: depth-1}) + (i<this.length-1? ', ': '');
	}
	
	return str + (this.length>i? '+' + (this.length-i): '') + ']';
};

module.exports = (function() {
	var tests = [], labels=[], running = false;
	
	function run(i) {
		running = true;
		if(tests[i]) tests[i](next);
		else running = false;
		
		function next(err, data) {
			if(err) return console.log(err);
			console.log(
				labels[i] + Array(20-labels[i].length).join(' ') +
				(arguments.length? util.inspect(
					data,
					{depth: 2, colors: true}
				).replace(/\n\s*/g, ' '): 'Ok')
			);
			
			run(i+1);
		}
	}
	
	return function (label, test) {
		labels.push(label); tests.push(test);
		if(!running) run(tests.length-1);
	};
}());
