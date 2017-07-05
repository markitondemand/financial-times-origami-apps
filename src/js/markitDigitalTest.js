require('mustache');

class MarkitDigitalTest {

	constructor (rootEl, opts) {
		this.rootEl = rootEl;
		const symbolParam = rootEl.getAttribute('data-o-markitdigital-test-symbol');

		this.makeQuoteCall(symbolParam);
	}

	makeQuoteCall(sym){
		// Make a quote call and then update module with the results.
		//Need to update to get a valid source key - this one is currently the jump page key and regularly expires.
		const url = 'http://markets.ft.com/research/webservices/securities/v1/quotes?symbols=' + sym + '&source=8915b8ac6eed1029';

		fetch(url)
		.then((resp) => resp.json())
		.then(function(resp){

			const companyName = resp["data"].items[0].basic.name;
			const symbol = resp["data"].items[0].basic.symbol;
			const lastPrice = resp["data"].items[0].quote.lastPrice;
			const currency = resp["data"].items[0].basic.currency;
			const change1Day = resp["data"].items[0].quote.change1Day.toFixed(2);
			const change1DayPercent = resp["data"].items[0].quote.change1DayPercent.toFixed(2);

			let htmlTemplate =
			`<h1 class="o-markitdigital-test__title">Equity highlight</h1>
			<div class="o-markitdigital-test__content">
				
				<a class="o-markitdigital-test__companyName" href="">${companyName}</a>
				<div>Company Symbol: ${symbol}</div>
			
				<div>Last Price: ${lastPrice}</div>
				<div>Currency: ${currency}</div>
			
				<div>Day Change: ${change1Day}</div>
				<div>Day Change Percent: ${change1DayPercent}%</div>
			
			</div>`;

			let insertionPoint = document.getElementsByClassName('o-markitdigital-test')[0];
			insertionPoint.insertAdjacentHTML('afterbegin', htmlTemplate);
		})
		.catch(function(error){
			console.log("Error retrieving quote data for " + sym + ": " + error);
		});
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