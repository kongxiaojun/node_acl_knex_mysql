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
"use strict";

var noop = {};
var util = require('util');
var _ = require('lodash');

noop.params = function(){
	return this;
};
noop.end = function(){};

var contract = function(args){
	if(contract.debug===true){
		contract.fulfilled = false;
		contract.args = _.toArray(args);
		contract.checkedParams = [];
		return contract;
	}else{
		return noop;
	}
};

contract.params = function(){
	var i, len;
	this.fulfilled |= checkParams(this.args, _.toArray(arguments));
	if(this.fulfilled){
		return noop;
	}else{
		this.checkedParams.push(arguments);
		return this;
	}
}
contract.end = function(){
	if(!this.fulfilled){
		printParamsError(this.args, this.checkedParams);
		throw new Error('Broke parameter contract');
	}
}

var typeOf = function(obj){
	return Array.isArray(obj) ? 'array':typeof obj;
};

var checkParams = function(args, contract){
	var fulfilled, types, type, i, j;

	if(args.length !== contract.length){
		return false;
	}else{
		for(i=0; i<args.length; i++){
			try{
				types = contract[i].split('|');
			}catch(e){
				console.log(e, args)
			}

			type = typeOf(args[i]);
			fulfilled = false;
			for(j=0; j<types.length; j++){
				if (type === types[j]){
					fulfilled = true;
					break;
				}
			}
			if(fulfilled===false){
				return false;
			}
		}
		return true;
	}
};

var printParamsError = function(args, checkedParams){
	var msg = 'Parameter mismatch.\nInput:\n( ',
			type,
			input,
			i;
	_.each(args, function(input, key){
		type = typeOf(input);
		if(key != 0){
			msg += ', '
		}
		msg += input + ': '+type;
	})

	msg += ')\nAccepted:\n';

	for (i=0; i<checkedParams.length;i++){
		msg += '('+ argsToString(checkedParams[i]) + ')\n';
	}

	console.log(msg);
};

var argsToString = function(args){
	var res = "";
	_.each(args, function(arg, key){
		if(key != 0){
			res += ', ';
		}
		res += arg;
	})
	return res;
}

exports = module.exports = contract;

