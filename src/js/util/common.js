'use strict';

const jsonEqual = (a, b) =>
	JSON.stringify(a) === JSON.stringify(b);

const biterate = (a, b, cb, index = 0) =>
	(typeof a[index] !== 'undefined'
	|| typeof b[index] !== 'undefined')
		&& [].concat(
			cb(a[index], b[index], index),
			biterate(a, b, cb, index + 1)
		)
		|| [];

const biterate2 = (a, b, cb) => {
	for (let index = 0; index < a.length || index < b.length; index++) {
		cb(a[index], b[index], index);
	}
};
// biterate([1, 2, 3, 4], ['a', 'b', 'c'], (a, b, index) => console.log(a, b, index));

const take = (num, index = 0) =>
	(index < num) ? [].concat(index, take(num, index + 1)) : [];

module.exports = {
	jsonEqual,
	biterate,
	biterate2,
	take
};
