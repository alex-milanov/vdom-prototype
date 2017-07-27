'use strict';

const fse = require('fs-extra');
const path = require('path');

const paths = {
	'dist/fonts': [
		'node_modules/font-awesome/fonts',
		'node_modules/firacode/distr'
	],
	'dist/assets': 'src/assets'
};

const resolve = p => path.resolve(__dirname, '..', p);
const copy = (a, b) => fse.copySync(resolve(a), resolve(b));

const keys = o => Object.keys(o);

keys(paths).forEach(
	d => paths[d] instanceof Array
		? paths[d].forEach(s =>
			copy(s, d)
		)
		: copy(paths[d], d)
);
