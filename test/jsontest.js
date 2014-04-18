var mt = require("microtime"),
	i, a=[], t, x, j, times = [0,0,0,0,0];

for(i=0; i<10000; i++) {
	a.push('{"hello":"world", "number":'+i+'}');
}

for(j=0; j<100; j++) {
	t = mt.now();
	x=[];
	a.forEach(function(it){ x.push(JSON.parse(it)); });
	times[0] += (mt.now() - t);

	t = mt.now();
	x=[];
	for(i=0; i<a.length; i++) { x.push(JSON.parse(a[i])); }
	times[1] += (mt.now() - t); /* Best approach, V8 optimizations? */

	t = mt.now();
	x=[];
	for(i=0; i<10000; i++) { x.push(JSON.parse(a[i])); }
	times[2] += (mt.now() - t);

	t = mt.now();
	x=[];
	for(i=0; i<10000; i++) { x[i] = JSON.parse(a[i]); }
	times[3] += (mt.now() - t);

	t = mt.now();
	x=JSON.parse('[' + a.join(',') + ']');
	times[4] += (mt.now() - t);
}

console.log(times);