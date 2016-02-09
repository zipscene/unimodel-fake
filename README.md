# Unimodel-Fake: In-Memory Test Database

This package provides two classes: `FakeModel` and `FakeDocument`.  They implement a very basic
in-memory database conforming to zs-unimodel specifications.  `FakeModel` is a `SchemaModel`, and
as such, takes a schema.

Here's how it's used:

```js
const FakeModel = require('zs-unimodel-fake').FakeModel;

const Animal = new FakeModel('Animal', {
	id: {
		type: String,
		required: true,
		key: true
	},
	animalType: {
		type: String,
		enum: [ 'cat', 'dog', 'horse', 'frog' ]
	},
	name: String,
	age: Number
});

Animal.insert({
	id: 'foo',
	animalType: 'cat',
	name: 'Toby',
	age: 5
}); // -> Promise

let dog = Animal.create({
	id: 'bar',
	animalType: 'dog',
	name: 'Ruff',
	age: 8
});
dog.save();	// -> Promise

Animal.find({ age: { $gt: 6 } }).then((results) => {
	let name = results[0].getData().name;
	// name is 'Ruff'
});

Animal.clear(); // Clears out all inserted data
```

All unimodel operations are supported.  The standard arguments to `find()` are
also supported (`sort`, `fields`, `skip`, `limit`).

