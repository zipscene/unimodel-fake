// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { SchemaDocument } = require('unimodel-core');
const _ = require('lodash');
const { deepCopy } = require('objtools');

class FakeDocument extends SchemaDocument {

	constructor(model, data) {
		super(model, data);
		this._originalId = data._id;
	}

	save() {
		return Promise.resolve()
			.then(() => this.model.trigger('pre-save', this))
			.then(() => {
				this.normalize();
				// Remove the document with the original ID and new ID to overwrite
				this.model._documents = _.filter(this.model._documents, (doc) => {
					return doc._id !== this._originalId && doc._id !== this.data._id;
				});
				// Add back this document data
				this.model._documents.push(deepCopy(this.data));
				// Update the original ID
				this._originalId = this.data._id;
			})
			.then(() => this.model.trigger('post-save', this));
	}

	remove() {
		return Promise.resolve()
			.then(() => this.model.trigger('pre-remove', this))
			.then(() => {
				this.model._documents = _.filter(this.model._documents, (doc) => {
					return doc._id !== this._originalId;
				});
			})
			.then(() => this.model.trigger('post-remove', this));
	}

}

module.exports = FakeDocument;
