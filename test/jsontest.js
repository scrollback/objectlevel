var mt = require("microtime"),
	i, a=[], t, x, j;

for(i=0; i<10000; i++) {
	a.push('{"hello":"world", "number":'+i+'}');
}

for(j=0; j<1000; j++) {
	t = mt.now();
	x=[];
	a.forEach(function(it){ x.push(JSON.parse(it)); });
	console.log('1', mt.now() - t, x.length);

	t = mt.now();
	x=[];
	for(i=0; i<a.length; i++) { x.push(JSON.parse(a[i])); }
	console.log('2', mt.now() - t, x.length);

	t = mt.now();
	x=[];
	for(i=0; i<10000; i++) { x.push(JSON.parse(a[i])); }
	console.log('3', mt.now() - t, x.length);

	t = mt.now();
	x=[];
	for(i=0; i<10000; i++) { x[i] = JSON.parse(a[i]); }
	console.log('4', mt.now() - t, x.length);

	t = mt.now();
	x=JSON.parse('[' + a.join(',') + ']');
	console.log('5', mt.now() - t, x.length);
}
