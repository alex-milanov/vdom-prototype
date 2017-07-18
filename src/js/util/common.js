'use strict';

// comparing 2 simple json structures by stringifying them
const jsonEqual = (a, b) =>
	JSON.stringify(a) === JSON.stringify(b);

// iterate recurrsively 2 arrays with callback
const biterate = (a, b, cb, index = 0) =>
	(typeof a[index] !== 'undefined'
	|| typeof b[index] !== 'undefined')
		&& [].concat(
			cb(a[index], b[index], index),
			biterate(a, b, cb, index + 1)
		)
		|| [];

// iterate 2 arrays with for loop
const biterate2 = (a, b, cb) => {
	for (let index = 0; index < a.length || index < b.length; index++) {
		cb(a[index], b[index], index);
	}
};
// biterate([1, 2, 3, 4], ['a', 'b', 'c'], (a, b, index) => console.log(a, b, index));

// create recurrsively an array of integers
const take = (num, index = 0) =>
	(index < num) ? [].concat(index, take(num, index + 1)) : [];

module.exports = {
	jsonEqual,
	biterate,
	biterate2,
	take
};
