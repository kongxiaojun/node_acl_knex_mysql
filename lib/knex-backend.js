/**
 MIT License

 Copyright (c) 2018 Jacy

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 Knex Backend.
 Implementation of the storage backend using Knex.js
 */
'use strict';

var contract = require('./contract');
var async = require('async');
var _ = require('lodash');
var createTables = require('./databaseTasks').createTables;
var buckets = require('./buckets');

function KnexDBBackend(db, prefix, options){
	this.db = db;
	this.buckets = buckets(options);
	this.prefix = typeof prefix !== 'undefined' ? prefix : '';
}

KnexDBBackend.prototype = {
	/**
		 Begins a transaction.
	*/
	begin : function(){
		// returns a transaction object
		return [];
	},

	/**
		 Ends a transaction (and executes it)
	*/
	end : function(transaction, cb){
		contract(arguments)
			.params('array', 'function')
			.end()
		;

		// Execute transaction
		async.series(transaction,function(err){
			cb(err instanceof Error? err : undefined);
		});
	},

	/**
		Cleans the whole storage.
	*/
	clean : function(cb){
		contract(arguments)
			.params('function')
			.end()
		;
		cb(undefined);
	},

	/**
		 Gets the contents at the bucket's key.
	*/
	get : function(bucket, key, cb){
		contract(arguments)
			.params('string', 'string|number', 'function')
			.end()
		;

		var table = '';
		if (bucket.indexOf('allows') != -1) {
			table = this.prefix + this.buckets.permissions;
			this.db
				.select('acl_key', 'acl_value')
				.from(table)
				.where({'acl_key': bucket})
				.then(function(result) {
					if (result.length) {
						var acl_value = JSON.parse(result[0].acl_value)
						cb(undefined, (acl_value[key] || []));
					} else {
						cb(undefined, []);
					}
				})
			;
		} else {
			table = this.prefix + bucket;
			this.db
				.select('acl_key', 'acl_value')
				.from(table)
				.where({'acl_key': key})
				.then(function(result) {
					cb(undefined, (result.length ? JSON.parse(result[0].acl_value) : []));
				})
			;
		}
	},

	/**
		Returns the union of the values in the given keys.
	*/
	union : function(bucket, keys, cb){
		contract(arguments)
			.params('string', 'array', 'function')
			.end()
		;

		var table = '';
		if (bucket.indexOf('allows') != -1) {
			table = this.prefix + this.buckets.permissions;
			this.db
				.select('acl_key', 'acl_value')
				.from(table)
				.where({'acl_key': bucket})
				.then(function(results) {
					if (results.length && results[0].acl_value) {
						var keyArrays = [];
						_.each(keys, function(key) {
							keyArrays.push.apply(keyArrays, JSON.parse(results[0].acl_value)[key]);
						});
						cb(undefined, _.union(keyArrays));
					} else {
						cb(undefined, []);
					}

				})
			;
		} else {
			table = this.prefix + bucket;
			this.db
				.select('acl_key', 'acl_value')
				.from(table)
				.whereIn('acl_key', keys)
				.then(function(results) {
					if (results.length) {
						var keyArrays = [];
						_.each(results, function(result) {
							keyArrays.push.apply(keyArrays, JSON.parse(result.acl_value));
						});
						cb(undefined, _.union(keyArrays));
					} else {
						cb(undefined, []);
					}
				})
			;
		}
	},

	/**
		Adds values to a given key inside a table.
	*/
	add : function(transaction, bucket, key, values){
		contract(arguments)
			.params('array', 'string', 'string|number','string|array|number')
			.end()
		;

		var self = this;
		var table = '';
		values = Array.isArray(values) ? values : [values]; // we always want to have an array for values

		transaction.push(function(cb){

			if (bucket.indexOf('allows') != -1) {
				table = self.prefix + self.buckets.permissions;
				self.db
					.select('acl_key', 'acl_value')
					.from(table)
					.where({'acl_key': bucket})
					.then(function(result) {
						var json = {};

						if (result.length === 0) {

							// if no results found do a fresh insert
							json[key] = values;
							return self.db(table)
								.insert({acl_key: bucket, acl_value: JSON.stringify(json)})
							;
						} else {
							var acl_value = JSON.parse(result[0].acl_value)

							// if we have found the key in the table then lets refresh the data
							if (_.has(acl_value, key)) {
                                acl_value[key] = _.union(values, acl_value[key]);
							} else {
                                acl_value[key] = values;
							}

							return self.db(table)
								.where('acl_key', bucket)
								.update({acl_key: bucket, acl_value: JSON.stringify(acl_value)})
							;
						}
					})
					.then(function() {
						cb(undefined);
					})
				;
			} else {
				table = self.prefix + bucket;
				self.db
					.select('acl_key', 'acl_value')
					.from(table)
					.where({'acl_key': key})
					.then(function(result) {

						if (result.length === 0) {

							// if no results found do a fresh insert
							return self.db(table)
								.insert({acl_key: key, acl_value: JSON.stringify(values)})
							;
						} else {

							// if we have found the key in the table then lets refresh the data
							return self.db(table)
								.where('acl_key', key)
								.update({acl_value: JSON.stringify(_.union(values, result[0].acl_value ? JSON.parse(result[0].acl_value) : []))})
							;
						}
					})
					.then(function() {
						cb(undefined);
					})
				;
			}
		});
	},

	/**
		 Delete the given key(s) at the bucket
	*/
	del : function(transaction, bucket, keys){
		contract(arguments)
			.params('array', 'string', 'string|array')
			.end()
		;

		var self = this;
		var table = '';
		keys = Array.isArray(keys) ? keys : [keys]; // we always want to have an array for keys

		transaction.push(function(cb){

			if (bucket.indexOf('allows') != -1) {
				table = self.prefix + self.buckets.permissions;
				self.db
					.select('acl_key', 'acl_value')
					.from(table)
					.where({'acl_key': bucket})
					.then(function(result) {

						if (result.length === 0) {

						} else {
							var acl_value = JSON.parse(result[0].acl_value)

							_.each(keys, function(keyValue) {
                                acl_value = _.omit(acl_value, keyValue);
							});

							if (_.isEmpty(result[0].acl_value)) {
								// if no more roles stored for a resource the remove the resource
								return self.db(table)
									.where('acl_key', bucket)
									.del()
								;
							} else {
								return self.db(table)
									.where('acl_key', bucket)
									.update({acl_value: JSON.stringify(acl_value)})
								;
							}
						}
					})
					.then(function() {
						cb(undefined);
					})
				;
			} else {
				table = self.prefix + bucket;
				self.db(table)
					.whereIn('acl_key', keys)
					.del()
					.then(function() {
						cb(undefined);
					})
				;
			}
		});
	},

	/**
		Removes values from a given key inside a bucket.
	*/
	remove : function(transaction, bucket, key, values){
		contract(arguments)
			.params('array', 'string', 'string|number','string|array')
			.end()
		;

		var self = this;
		var table = '';
		values = Array.isArray(values) ? values : [values]; // we always want to have an array for values

		transaction.push(function(cb){

			if (bucket.indexOf('allows') != -1) {
				table = self.prefix + self.buckets.permissions;
				self.db
					.select('acl_key', 'acl_value')
					.from(table)
					.where({'acl_key': bucket})
					.then(function(result) {
						if(result.length === 0) {return;}

						var acl_value = JSON.parse(result[0].acl_value)

						// update the permissions for the role by removing what was requested
						_.each(values, function(keyValue) {
                            acl_value[key] = _.without(acl_value[key], keyValue);
						});

						//  if no more permissions in the role then remove the role
						if (!acl_value[key].length) {
                            acl_value = _.omit(acl_value, key);
						}

						return self.db(table)
							.where('acl_key', bucket)
							.update({acl_value: JSON.stringify(acl_value)})
						;
					})
					.then(function() {
						cb(undefined);
					})
				;
			} else {
				table = self.prefix + bucket;
				self.db
					.select('acl_key', 'acl_value')
					.from(table)
					.where({'acl_key': key})
					.then(function(result) {
						if(result.length === 0) {return;}

						var resultValues = result[0].acl_value ? JSON.parse(result[0].acl_value) : [];
						// if we have found the key in the table then lets remove the values from it
						_.each(values, function(value) {
							resultValues = _.without(resultValues, value);
						});
						return self.db(table)
							.where('acl_key', key)
							.update({acl_value: JSON.stringify(resultValues)})
						;
					})
					.then(function() {
						cb(undefined);
					})
				;
			}
		});
	}
};

KnexDBBackend.prototype.setup = function (callback){
    if (!this.db || typeof this.db === 'undefined') {
        throw new Error("setup error db is null!");
    }
    createTables([this.prefix, this.db, this.buckets],callback)
};

KnexDBBackend.prototype.teardown = require('./databaseTasks').dropTables;

exports = module.exports = KnexDBBackend;
