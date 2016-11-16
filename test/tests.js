// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { expect } = require('chai');
const { FakeModel, FakeDocument } = require('../lib');
const _ = require('lodash');

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

function insertFakeData() {
	return Animal.insertMulti([
		{
			id: 'foo',
			animalType: 'cat',
			name: 'Toby',
			age: 5
		},
		{
			id: 'bar',
			animalType: 'dog',
			name: 'Ruff',
			age: 2
		},
		{
			id: 'baz',
			animalType: 'cat',
			name: 'Felix',
			age: 8
		},
		{
			id: 'qux',
			animalType: 'horse',
			name: 'Sammy',
			age: 4
		},
		{
			id: 'biz',
			animalType: 'horse',
			name: 'Lightning',
			age: 3
		},
		{
			id: 'boop',
			animalType: 'frog',
			name: 'Zippy',
			age: 1
		}
	]);
}

describe('Fake Model', function() {

	beforeEach(function() {
		Animal.clear();
	});

	it('should insert documents', function() {
		return Animal.insert({ id: 'foo', name: 'Felix' })
			.then((doc) => {
				expect(doc.getData().name).to.equal('Felix');
			});
	});

	it('should allow inserting and querying documents', function() {
		return insertFakeData()
			.then(() => Animal.find({
				age: { $gte: 4 }
			}))
			.then((results) => {
				let resultIds = _.map(results, 'data.id').sort();
				expect(resultIds).to.deep.equal([ 'baz', 'foo', 'qux' ]);
			});
	});

	it('should sort documents', function() {
		return insertFakeData()
			.then(() => Animal.find({
				age: { $gte: 4 }
			}, { sort: [ '-age' ] }))
			.then((results) => {
				let resultIds = _.map(results, 'data.id');
				expect(resultIds).to.deep.equal([ 'baz', 'foo', 'qux' ]);
			});
	});

	it('should only return requested fields', function() {
		return insertFakeData()
			.then(() => Animal.find({
				age: { $gte: 5 }
			}, { fields: [ 'name', 'animalType' ] }))
			.then((results) => {
				expect(results.length).to.equal(2);
				expect(results[0].data.name).to.equal('Toby');
				expect(results[0].data.animalType).to.equal('cat');
				expect(results[0].data.age).to.not.exist;
			});
	});

	it('should apply skip and limit', function() {
		return insertFakeData()
			.then(() => Animal.find({}, { sort: [ 'age' ], skip: 2, limit: 3 }))
			.then((results) => {
				let resultIds = _.map(results, 'data.id');
				expect(resultIds).to.deep.equal([ 'biz', 'qux', 'foo' ]);
			});
	});

	it('should return the total field', function() {
		return insertFakeData()
			.then(() => Animal.find({}, { sort: [ 'age' ], skip: 2, limit: 3, total: true }))
			.then((results) => {
				expect(results.length).to.equal(3);
				expect(results.total).to.equal(6);
			});
	});

	it('should create and save documents', function() {
		return insertFakeData()
			.then(() => {
				let a = Animal.create({
					id: 'whammy',
					animalType: 'frog',
					name: 'Flies',
					age: 2
				});
				return a.save();
			})
			.then(() => Animal.findOne({ id: 'whammy' }))
			.then((result) => {
				expect(result.data.name).to.equal('Flies');
			});
	});

	it('should allow removing documents', function() {
		return insertFakeData()
			.then(() => Animal.find({}))
			.then((results) => {
				expect(results.length).to.equal(6);
				return results[0].remove();
			})
			.then(() => Animal.find({}))
			.then((results) => {
				expect(results.length).to.equal(5);
			});
	});

	it('should update documents', function() {
		return insertFakeData()
			.then(() => Animal.update({}, { $inc: { age: 1 } }))
			.then(() => Animal.find({}, { sort: [ 'age' ] }))
			.then((results) => {
				let ages = _.map(results, 'data.age');
				expect(ages).to.deep.equal([ 2, 3, 4, 5, 6, 9 ]);
			});
	});

	it('should aggregate global stats', function() {
		return insertFakeData()
			.then(() => Animal.aggregate({}, {
				stats: {
					age: {
						avg: true,
						max: true
					}
				},
				total: true
			}))
			.then((result) => {
				expect(result).to.deep.equal({
					stats: {
						age: {
							avg: 3.8333333333333335,
							max: 8
						}
					},
					total: 6
				});
			});
	});

	it('should aggregate discrete grouped stats', function() {
		return insertFakeData()
			.then(() => Animal.aggregate({}, {
				groupBy: 'animalType',
				stats: {
					age: {
						count: true
					}
				}
			}))
			.then((result) => {
				expect(result).to.deep.equal([
					{
						key: [ 'cat' ],
						stats: {
							age: {
								count: 2
							}
						}
					},
					{
						key: [ 'dog' ],
						stats: {
							age: {
								count: 1
							}
						}
					},
					{
						key: [ 'horse' ],
						stats: {
							age: {
								count: 2
							}
						}
					},
					{
						key: [ 'frog' ],
						stats: {
							age: {
								count: 1
							}
						}
					}
				]);
			});
	});

	it('should aggregate grouped by range', function() {
		return insertFakeData()
			.then(() => Animal.aggregate({}, {
				groupBy: {
					field: 'age',
					ranges: [
						{ end: 4 },
						{ start: 4 }
					]
				},
				stats: {
					age: {
						count: true
					}
				}
			}))
			.then((result) => {
				expect(result).to.deep.equal([
					{
						key: [ 1 ],
						stats: {
							age: {
								count: 3
							}
						}
					},
					{
						key: [ 0 ],
						stats: {
							age: {
								count: 3
							}
						}
					}
				]);
			});
	});

	it('should upsert documents', function() {
		return insertFakeData()
			.then(() => Animal.upsert({ id: 'asdf' }, { name: 'FOOBAR' }))
			.then((doc) => {
				expect(doc.data.id).to.equal('asdf');
				expect(doc.data.name).to.equal('FOOBAR');
			});
	});

});

