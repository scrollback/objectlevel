ObjectLevel
===========

Indexed, relational JSON store for Node.js using flat files and [LevelDB](https://code.google.com/p/leveldb/)

## Overview ##

- ObjectLevel stores JSON data in append-only flat text files and maintains indexes in LevelDB.
- Custom indexing logic can be written in JS using an API similar to CouchDB views.
- Relations (links) between objects can be defined and used for querying efficiently.

### What's new

#### v0.1.9
- The `start` and `end` parameters of queries have been renamed `gte` and `lte` to reduce confusion 
while querying in the reverse direction, and for consistency with the `eq` parameter. If you use
range queries, you must update your code.
- There was a bug in the bitwise-comparable encoding of some large negative numbers. This has been fixed.

#### v0.1.8
- Fixed a bug where .del() didn't work sometimes.
- Added the ability to efficiently return link data for a single link, where both endpoints are known.
  You can now do:
```javascript
type.get({
	by: 'linkname',
	eq: ['fromId', 'toId'] // IDs of the endpoints of the link.
}, handleResults);
```
This returns the object with ID 'toId' with embedded link data.

#### v0.1.7
- Added map functions to get(). You can now do:
```javascript
var query = {
	by: 'indexname', eq: 'value',
	map: function(obj, emit) {
		if(obj.foo) emit(obj.bar);
	}
};

type.get(query, handleResults);
```

This helps filter and transform results after retrieving them from the database.

#### v0.1.6
- Added preUpdate hooks to put(). You can now do:
``` javascript
type.put(object, {preUpdate: function(obj, old) {
	console.log('An old value exists with this ID:', old);
	obj.createdOn = old.createdOn;
	// Maybe I should abort this put? return false;
}}, putCompleted)
```

#### v0.1.5
- Fixes an issue that caused updates on indexed links to waste space

#### v0.1.4
- Performance improvements
- Fixes an issue in the `.unlink()` API introduced in v0.1.3

#### v0.1.3
- Indexes on link data.
- Writes a metadata file tracking updates/deletes for use during compaction

#### v0.1.2
- Support for opening multiple databases.
- Fixed a bug where numeric keys components were not returned
- All data is now completely recoverable from flat files only
- Improved space usage significantly, both in leveldb and in the flat files
- Pushing objects without IDs will no longer throw errors; guids will be used.
- Refactored the codebase into small, single-responsibility modules

## When to use ##

You need a dedicated lightweight data store that's part of your application, and you have

- Insert- and read-heavy workloads
- Complex indexing/lookup requirements
- Relations in your data model

ObjectLevel also gives you
- Crash safety (from database corruption, not data loss: a few seconds’ data might be lost in case of an OS crash)
- Live backups without locking


## When not to use ##

Don’t use ObjectLevel (yet) if you have
- update-heavy workloads (compaction of flat files is not implemented yet)
- multiple processes that need to access the same data simultaneously
- large amounts of data (hundreds of GBs) of one object type (rollover of flat files not implemented yet)

Additionally, if you need replication or sharding, you have to implement it yourself in your application.


## Installation ##

	$ npm install objectlevel

## Usage ##

In the examples below, we need to store `message` objects, where each message has properties `id`, `to`, (an array of recipients) and `time`. Later, we need to retrieve messages given a recipient, sorted by time.

### Defining an object type ###

```javascript
var objectlevel = objectlevel("objectlevel");

db = new objectlevel(__dirname + '/data');
var messages = db.defineType('messages', {
	indexes: {
		recipientTime: function (msg, emit) {
			msg.to.forEach(function(recipient) {
				emit(recipient, msg.time);
			});
		}
	}
});
```

An index on the 'id' field is created by default; other indexes are defined by index functions like `recipientTime` above. When a message object is added, the index function is called with the inserted object. The functions then calculate and emit index values.

Values passed to emit are joined to form a *key* that can be used to find this object; Each argument to `emit` is a *component* of the key. It’s good practice to name the index after the components emitted, like we’ve done here.

**Important**: Index functions must be synchronous, i.e. all calls to emit must happen before the function returns. They should also be consistent, i.e. multiple calls with identical objects must emit the same values.


### Adding or updating data ###

```javascript
messages.put({id: 'msg01', to: ['alice'], time: 10});
```

### Querying ###

#### 1. Getting a message with its ID is straightforward.

```javascript
messages.get('msg01', function(err, message /* a single message object */) {
	...
});
```

#### 2. Getting a specific message given the recipient and time is also easy

```javascript
messages.get({by: 'recipientTime', eq: ['alice', 10]}, function(err, res /* an array */) {
	...
});
```
Here, eq means the index value *equals* the provided array of components.

#### 3. More realistically, you may want to search within a range of timestamps for messages sent to alice.

```javascript
messages.get({by: 'recipientTime', start: ['alice', 0], end: ['alice', 20]}, callback);
```

Results will be sorted by time - ObjectLevel, results are sorted by the index used. When the index has multiple components, the first one is the most significant. In other words, the recipientTime index sorts first by recipient, then by time for keys which have the same recipient.

#### 4. Get all messages sent to alice (irrespective of timestamp)


```javascript
messages.get({by: 'recipientTime', start: ['alice'], end: ['alice']}, callback);
```

Less significant components can be omitted. The above query can also be written as

```javascript
messages.get({by: 'recipientTime', eq: 'alice'}, callback);
```

#### 5. All messages in a time range, irrespective of recipient

This isn’t possible without defining another index – a later (less significant) component of the key can't be specified if you skip an earlier (more significant) one. The solution here is to add another index the indexes definition of the message type.

```javascript
time: function(msg, emit) { emit(msg.time); }
```

#### Query parameters

The query form of the `get` function takes an object as its first parameter, which may have the following properties:

 - `by`: The name of the index to use.
 - `eq`: A single key, or
 - `start` and `end`: A key range.
 - `reverse`: If true, reverses the sort order (by default it is in increasing order of the numeric index)
 - `limit`: The maximum number of objects to retrieve
 - `keys`: If true, returns only arrays of index components (and not the objects). If you don't need the values, set this for a significant performance gain. The `id` property of objects will be appended to the array, so if you just need id's you can use this.


### Deleting objects ###

```javascript
messages.del('msg03');
```

### Defining a link (relation) ###

Let's say messages are organized using labels; Users can label objects with properties like color and name. 

```javascript

/* First, define the two collections */
var messages = db('messages', ...),
    labels = db('labels', ...);

db.defineLink({hasLabel: labels, onMessage: messages}, { indexes: { ... } });
```
Here, messages#hasLabel and labels#onMessage are the names of the endpoints of the link; Indexes is a hashmap of index functions that take a link data object and emit keys.

### Linking objects ###

Links can be made from either side.
```javascript
messages.link('msg01', 'hasLabel', 'funny');
labels.link('thoughtful', 'onMessage', 'msg10');
```

Optionally, data can be added to the link. For example, the time at which a label was applied to a particular message can be stored.

```javascript
messages.link('msg01', 'hasLabel', 'funny', {appliedOn: 1303});
```

### Querying using links ###

Links create a pair of indexes that can be queried like other indexes. For example, to get all the messages that have a particular label, use:

```javascript
messages.get({by: 'hasLabel', eq: 'funny'}, callback);
```

The result will be an array of messages, with an additional `appliedOn` property. Properties defined in the link data will override those with the same names in the object.

To query using link data indexes, use:

```javascript
defineLink({hasLabel: labels, onMessage: messages}, { indexes: {
	appliedOn: function(linkData, emit) { emit(linkData.appliedOn); }
}});

messages.get({
	by: 'hasLabel',
	start: ['funny', 'appliedOn', 1000], 
	end: ['funny', 'appliedOn', '2000']
}, callback);
```


### Unlinking objects ###

You can remove a specific link,
```javascript
messages.unlink('msg01', 'hasLabel', 'funny');
```

all links of a given type
```javascript
messages.unlink('msg01', 'hasLabel');
```

or all links to the object
```javascript
messages.unlink('msg01');
```

When you delete an object, all links to it are deleted automatically.

## Further development ##

- Combining reads to improve performance
- Rollover of data files to avoid unmanageably large files
- Periodic compaction of data files
- More powerful queries
  - key filter function
  - reduce function

### Tools ###

A separate objectlevel-tools project is planned, which will provide command-line utilities for:
 1. Exploring an objectlevel data directory
 2. Setting up continuous, automatic remote backups
 3. Restoring an index from a data file (if LevelDB files were not backed up, or if index definitions were changed)
 4. Setting up master-slave replication
