'use strict';

const {
	section, h1, a, div, i,
	form, button, input, label,
	select, option,
	ul, li, h, hr
} = require('../util/vdom');

const {take} = require('../util/common');

module.exports = ({state, actions}) => section('#ui',
	h1('VDOM Prototype'),
	hr(),
	i('#toggle.fa', {
		class: {
			'fa-toggle-on': state.toggled,
			'fa-toggle-off': !state.toggled
		}
	}),
	label('Items Count'),
	' ',
	select('#itemsType', ['number', 'text', 'password'].map(type =>
		option({attrs: {
			value: type
		}}, type)
	)),
	input('#itemsCount', {
		attrs: {
			type: state.itemsType,
			value: state.listCount
		}
	}),
	input({
		attrs: {
			type: 'checkbox',
			checked: state.itemsType === 'number'
		}
	}),
	ul('.itemsList',
		(state.itemsType === 'number') && take(state.listCount).map(index =>
			li(`List Item ${index}`)
		) || []
	)
);
