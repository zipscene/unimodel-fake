const { getPath, objectHash, isScalar } = require('zs-objtools');
const { createAggregate } = require('zs-common-query');
const _ = require('lodash');
const XError = require('xerror');
const { multiFieldSort } = require('./utils');

/**
 * This class is instantiated once per aggregate and evaluates the aggregate
 * with an in-memory set of documents.
 *
 * @class AggregateEvaluation
 * @constructor
 * @param {Document[]} docs
 * @param {Object} aggregate
 * @param {Object} options
 */
class AggregateEvaluation {

	constructor(docs, aggregate, options = {}) {
		this.docs = docs;
		if (_.isPlainObject(aggregate)) aggregate = createAggregate(aggregate);
		this.aggregate = aggregate.getData();
		this.options = options;

		// This is a map from bucket keys (object hashes of the key) to bucket entries
		this.buckets = {};
	}

	/**
	 * Evaluates the aggregate.
	 *
	 * @method evaluate
	 * @return {Object} - Aggregate results
	 */
	evaluate() {
		if (this.aggregate.groupBy) {
			for (let doc of this.docs) {
				let key = this._getDocGroupKey(doc.data);
				let hash = objectHash(key);
				if (!this.buckets[hash]) {
					this.buckets[hash] = { key };
				}
				this._addDocToBucket(doc.data, hash);
			}
			let results = _.values(this.buckets);
			if (this.options.sort) {
				results = multiFieldSort(results, this.options.sort);
			}
			if (this.options.skip) {
				results = results.slice(this.options.skip);
			}
			if (this.options.limit) {
				results = results.slice(0, this.options.limit);
			}
			for (let result of results) {
				this._filterResultEntry(result);
			}
			return results;
		} else {
			for (let doc of this.docs) {
				this._addDocToBucket(doc.data, 'global');
			}
			let result = this.buckets.global || {};
			this._filterResultEntry(result);
			return result;
		}
	}

	_filterResultEntry(result) {
		if (result.stats) {
			for (let field in result.stats) {
				this._filterResultStats(result.stats[field], getPath(this.aggregate, `stats.${field}`));
			}
		}
		if (_.isEmpty(result.stats)) delete result.stats;
		if (!this.aggregate.total) delete result.total;
	}

	_filterResultStats(stats, statsSpec) {
		for (let key in stats) {
			if (!statsSpec[key]) {
				delete stats[key];
			}
		}
	}

	_getDocGroupKey(docData) {
		let groupBy = this.aggregate.groupBy;
		let groupValues = _.map(groupBy, (groupClause) => {
			let field = groupClause.field;
			let value = getPath(docData, field);
			if (value === undefined || value === null) return null;
			if (_.isArray(value)) {
				throw new XError(XError.UNSUPPORTED_OPERATION, 'Aggregates on array fields not supported');
			}
			if (groupClause.ranges) {
				let rangeNum;
				for (let i = 0; i < groupClause.ranges.length; i++) {
					let range = groupClause.ranges[i];
					if (
						(range.start === undefined && range.end === undefined) ||
						(range.start === undefined && value < range.end) ||
						(range.end === undefined && value >= range.start) ||
						(value >= range.start && value < range.end)
					) {
						rangeNum = i;
						break;
					}
				}
				if (rangeNum !== undefined) {
					return rangeNum;
				} else {
					return null;
				}
			} else if (groupClause.interval) {
				let base = groupClause.base || 0;
				return Math.floor((value - base) / groupClause.interval) * groupClause.interval + base;
			} else if (groupClause.timeComponent) {
				throw new XError(XError.UNSUPPORTED_OPERATION, 'Time component aggregates not supported');
			} else {
				return value;
			}
		});
		return groupValues;
	}

	_addDocToBucket(docData, bucketKey) {
		if (!this.buckets[bucketKey]) this.buckets[bucketKey] = {};
		let bucket = this.buckets[bucketKey];

		if (this.aggregate.stats) {
			if (!bucket.stats) bucket.stats = {};
			for (let field in this.aggregate.stats) {
				if (!bucket.stats[field]) bucket.stats[field] = {};
				let value = getPath(docData, field);
				if (value !== undefined && value !== null) {
					let fieldStats = bucket.stats[field];
					if (fieldStats.count === undefined) fieldStats.count = 0;
					fieldStats.count++;
					if (fieldStats.sum === undefined) fieldStats.sum = 0;
					if (typeof value === 'number') {
						fieldStats.sum += value;
						fieldStats.avg = fieldStats.sum / fieldStats.count;
					}
					if (isScalar(value)) {
						if (fieldStats.min === undefined || value < fieldStats.min) {
							fieldStats.min = value;
						}
						if (fieldStats.max === undefined || value > fieldStats.max) {
							fieldStats.max = value;
						}
					}
				}
			}
		}

		if (this.aggregate.total) {
			if (!bucket.total) bucket.total = 0;
			bucket.total++;
		}
	}

}

module.exports = AggregateEvaluation;
