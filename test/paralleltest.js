var parallel = require("../lib/parallel.js");


var when = parallel();
setTimeout(when(), 1000);
setTimeout(when(), 2000);

when.done(function() {
	console.log("done");
});