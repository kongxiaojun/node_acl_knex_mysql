Node Acl KnexBackend Support MySql
=============

A Knex.js backend for node_acl base on [node_acl_knex](https://github.com/christophertrudel/node_acl_knex) support MySql

Knex is a query builder for PostgreSQL, MySQL and SQLite3 in Node, The Knex backend is to be used as an adapter for [OptimalBits/node_acl](https://github.com/OptimalBits/node_acl).

##Features & Documentation
**Please note that this library currently supports Mysql.**

Please see [OptimalBits/node_acl](https://github.com/OptimalBits/node_acl).


##Installation

Using npm:

```javascript
npm install acl
npm install knex
npm install mysql

npm install acl-knex-mysql
```


#Quick Start
```javascript
	Acl = require('acl');
	AclKnexBackend = require('acl-knex');
	knex = require('knex');
	let acl_knex = new AclKnexBackend(knex, 'acl_');

	var db = knex({
		client: 'mysql',
		connection: {
			host: '127.0.0.1',
			port: 3306,
			user: 'admin',
			database: 'test'
		}
	});

	var acl = new Acl(acl_knex);
	//setup
	acl_knex.setup(function (err, db) {
		...
	});
	
```
