import oEquityHighlightModule from './src/js/equityHighlight';

const constructAll = function() {
	oEquityHighlightModule.init();
	document.removeEventListener('o.DOMContentLoaded', constructAll);
};

document.addEventListener('o.DOMContentLoaded', constructAll);

export default oEquityHighlightModule;