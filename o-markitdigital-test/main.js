import oMarkitDigitalTest from './src/js/markitDigitalTest';

const constructAll = function() {
	oMarkitDigitalTest.init();
	document.removeEventListener('o.DOMContentLoaded', constructAll);
};

document.addEventListener('o.DOMContentLoaded', constructAll);

export default oMarkitDigitalTest;