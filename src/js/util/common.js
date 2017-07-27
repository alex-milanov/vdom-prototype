'use strict';

// comparing 2 simple json structures by stringifying them
const jsonEqual = (a, b) =>
	JSON.stringify(a) === JSON.stringify(b);

// iterate recurrsively 2 arrays with callback
const biterateOld = (a, b, cb, index = 0) =>
	(typeof a[index] !== 'undefined'
	|| typeof b[index] !== 'undefined')
		&& [].concat(
			cb(a[index], b[index], index),
			biterateOld(a, b, cb, index + 1)
		)
		|| [];

// iterate 2 arrays with for loop
const biterate2 = (a, b, cb) => {
	let arr = [];
	for (let index = 0; index < Math.max(a.length, b.length); index++) {
		arr = [].concat(arr, cb(a[index], b[index], index));
	}
	return arr;
};
// biterate([1, 2, 3, 4], ['a', 'b', 'c'], (a, b, index) => console.log(a, b, index));

// create recurrsively an array of integers
const take = num => Array.apply(null, {length: num}).map(Number.call, Number);
/*
{
	let arr = [];
	for (let i = 0; i < num; i++) arr.push(i);
	return arr;
};
*/

const biterate = (a, b, cb) => take(Math.max(a.length, b.length))
	.map(index => cb(a[index], b[index], index))
	.reduce((arr, el) => [].concat(arr, el), []);

const unique = (c1, c2) => c1.filter(el => c2.indexOf(el) === -1);

const put = (o, k, v) => ((o[k] = v), o);
const del = (o, k) => ((delete o[k]), o);

module.exports = {
	jsonEqual,
	biterate,
	biterate2: biterate,
	take,
	unique,
	put,
	del
};
