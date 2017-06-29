class MarkitDigitalTest {

	constructor (MarkitDigitalTestEl, opts) {
		this.MarkitDigitalTestEl = MarkitDigitalTestEl;
		this.opts = opts || {values: "default"};
	}

	static init (rootEl, opts) {
		if (!rootEl) {
			rootEl = document.body;
		}
		if (!(rootEl instanceof HTMLElement)) {
			rootEl = document.querySelector(rootEl);
		}
		if (rootEl instanceof HTMLElement && rootEl.matches('[data-o-component=o-markitdigital-test]')) {
			return new MarkitDigitalTest(rootEl, opts);
		}
		return Array.from(rootEl.querySelectorAll('[data-o-component="o-markitdigital-test"]'), rootEl => new MarkitDigitalTest(rootEl, opts));
	}
}

export default MarkitDigitalTest;