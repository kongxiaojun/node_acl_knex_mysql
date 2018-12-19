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
 */
'use strict';

var _ = require('lodash');
var buckets = require('./buckets');
var knex = require('knex');

var downSql = [
	'DROP TABLE IF EXISTS {{prefix}}{{meta}};',
	'DROP TABLE IF EXISTS {{prefix}}{{resources}};',
	'DROP TABLE IF EXISTS {{prefix}}{{parents}};',
	'DROP TABLE IF EXISTS {{prefix}}{{users}};',
	'DROP TABLE IF EXISTS {{prefix}}{{roles}};',
	'DROP TABLE IF EXISTS {{prefix}}{{permissions}};'
];

var upSql = [
	'CREATE TABLE {{prefix}}{{meta}} (id int(10) unsigned NOT NULL AUTO_INCREMENT, acl_key TEXT NOT NULL, acl_value TEXT NOT NULL, PRIMARY KEY (id));',
	'INSERT INTO {{prefix}}{{meta}} VALUES (0, \'users\', \'{}\');',
	'INSERT INTO {{prefix}}{{meta}} VALUES (0, \'roles\', \'{}\');',
	'CREATE TABLE {{prefix}}{{resources}} (id int(10) unsigned NOT NULL AUTO_INCREMENT, acl_key TEXT NOT NULL, acl_value TEXT NOT NULL, PRIMARY KEY (id));',
	'CREATE TABLE {{prefix}}{{parents}} (id int(10) unsigned NOT NULL AUTO_INCREMENT, acl_key TEXT NOT NULL, acl_value TEXT NOT NULL, PRIMARY KEY (id));',
	'CREATE TABLE {{prefix}}{{roles}} (id int(10) unsigned NOT NULL AUTO_INCREMENT, acl_key TEXT NOT NULL, acl_value TEXT NOT NULL, PRIMARY KEY (id));',
	'CREATE TABLE {{prefix}}{{users}} (id int(10) unsigned NOT NULL AUTO_INCREMENT, acl_key TEXT NOT NULL, acl_value TEXT NOT NULL, PRIMARY KEY (id));',
	'CREATE TABLE {{prefix}}{{permissions}} (id int(10) unsigned NOT NULL AUTO_INCREMENT, acl_key TEXT NOT NULL, acl_value TEXT NOT NULL, PRIMARY KEY (id));'
];

function tmpl(str, ctx) {
	var n = 1;
	var sql = str.replace(/{{(\w+)}}/g, function(match, cap1) {
		return ctx[cap1] || match;
	});
	return sql.replace(/\?/g, function() { return '$' + n++; });
}

function getDB(args, callback) {
	var connection = null;
	var db_name = args[0], username = args[1], password = args[2], db_host = args[4], db_port = args[5], db_url = args[6], db = args[7];
	if (!db && !db_url) {
		if (!db_name) throw Error('no db_name (1st arg) supplied');
		if (!username) throw Error('no username (2nd arg) supplied');

		if (!db_host) db_host = '127.0.0.1';
		if (!db_port) db_port = 5432;
		connection = {
			host: db_host,
			port: db_port,
			user: username,
			database: db_name,
			password: password
		}
	} else if (db_url) {
		connection = db_url;
	}

	return db = knex({
		client: 'postgres',
		connection: connection
	});
}

function dropTables(args, callback) {
	var prefix = args[3], db = args[7], bucketNames = buckets(args[8]);

	if (!db) {
		db = getDB(args);
	}
	if (!prefix) prefix = 'acl_';

	executeStatements(db, downSql, {
            'meta': bucketNames.meta,
            'parents': bucketNames.parents,
            'permissions': bucketNames.permissions,
            'prefix': prefix,
            'resources': bucketNames.resources,
            'roles': bucketNames.roles,
            'users': bucketNames.users
        })
        .then(function() {
            if (!_.isUndefined(callback)) {
                callback(null, db);
            }
        })
    ;
}

function createTables(args, callback) {
    var prefix = args[0], db = args[1], bucketNames = buckets(args[2]);

    if (!db) {
        db = getDB(args);
    }
    if (!prefix) prefix = 'acl_';

    executeStatements(db, downSql.concat(upSql), {
        'meta': bucketNames.meta,
        'parents': bucketNames.parents,
        'permissions': bucketNames.permissions,
        'prefix': prefix,
        'resources': bucketNames.resources,
        'roles': bucketNames.roles,
        'users': bucketNames.users
    })
        .then(function() {
            if (!_.isUndefined(callback)) {
                callback(null, db);
            }
        });
}

function executeStatements(db, statements, bucketNames) {
	return executeStatement(0)

	function executeStatement(statementNumber) {
		if(statementNumber < statements.length) {
		  	return db.raw(tmpl(statements[statementNumber], bucketNames)).then(function() {
				return executeStatement(++statementNumber)
			})
		}
	}
}

KnexDBBackend.prototype.setup = function (callback){
    if (!this.db || typeof this.db === 'undefined') {
        throw new Error("setup error db is null!");
    }
    createTables([this.prefix, this.db, this.buckets],callback)
};

KnexDBBackend.prototype.teardown = require('./databaseTasks').dropTables;

exports.dropTables = dropTables;
