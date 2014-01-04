redindex
========

An indexed object store on Node.js and Redis.

## Example ##

We need to store `message` objects in Redis, where each message has properties `to`, `id` and `time`. Later, we need to retrieve a bunch of messages, given a recipient (`to` property) and a time duration.

### Creating an index ###

Let's define an index `totime` on `message` objects.

```javascript
var redindex = require("redindex");

var messages = redindex('messages', {
	indexes: {
		totime: function (msg, emit) {
			emit(msg.to, msg.time);
		}
	}
});
```

This is similar to CouchDB Views. Each index is defined by a function. When a message object is added to Redis, the index function is called with the inserted object. The function may calculate and emit index values.

Two kinds of index values can be emitted: strings (for performing equality comparisons) and numbers (for range comparisons and sorting). Each call to `emit()` may pass one or both these values - to emit a number without emitting a string, pass `null` as the string value.

Note: index functions must emit the same set of values when called with identical objects.

### Adding data ###

```javascript
messages.put({id: 'msg01', to: 'room1', time: 10});
```

### Querying ###

```javascript
messages.get({by: 'totime', str: 'room1', num: {gt: 10}}, function(err, res) {
	...
});
```

The `get` function takes a Query Object as its first parameter, and a callback as its second. The Query Object supports the following properties:

 - `by`: The name of the index to use.
 - `str`: A string value (for filtering)
 - `num`: A single numeric value or a comparison object (with properties `lt`, `lte`, `gt`, `gte` and `eq` as in MongoDB)
 - `rev`: If true, reverses the sort order (by default it is in increasing order of the numeric index)
 - `limit`, `offset`: Integers, used for pagination like the SQL limit clause
 - `full`: If true, returns the full objects (by default it returns only the ID's)

### Retrieving with ID ###

```javascript
messages.get('msg02');
```

### Deleting objects ###

```javascript
messages.del('msg03');
```
