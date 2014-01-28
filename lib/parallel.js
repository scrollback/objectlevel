module.exports = function() {
	/* create a new parallelizer */
	
	var parallel = function() {
		parallel.count++;
		return function() { parallel.count--; parallel.done(); }
	}
	
	parallel.count = 0;
	parallel.done = function(cb) {
		if(cb) parallel.callback = cb;
		if(parallel.count === 0) parallel.callback();
	}
	
	return parallel;
}