import oMarkitDigitalTest from './src/js/markitDigitalTest';

const constructAll = function() {
	console.log('test');
	oMarkitDigitalTest.init();
	document.removeEventListener('o.DOMContentLoaded', constructAll);
};

document.addEventListener('o.DOMContentLoaded', constructAll);

export default oMarkitDigitalTest;