require('mustache');

class EquityHighlightApp {

	constructor (rootEl) {
		this.rootEl = rootEl;
		const symbolParam = rootEl.getAttribute('data-o-equity-highlight-app-symbol');

		this.makeQuoteCall(symbolParam);
	}

	makeQuoteCall(sym){
		// Make a quote call and then update module with the results.
		//Need to update to get a valid source key - this one is currently the jump page key and regularly expires.
		const url = 'http://markets.ft.com/research/webservices/securities/v1/quotes?symbols=' + sym + '&source=042a7723d770ad6e';

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
			`<div data-o-component="o-aside-panel" class="o-aside-panel">
				<div class="o-aside-panel__header">
					<h3 class="o-aside-panel__heading o-equity-highlight-app__title">Equity highlight</h3>
				</div>
				<div class="o-aside-panel__body">
					<div class="o-equity-highlight-app__content">
							
							<a class="o-equity-highlight-app__companyName" href="">${companyName}</a>
							<div>${symbol}</div>
						
							<div>Last Price: ${lastPrice}</div>
							<div>Currency: ${currency}</div>
						
							<div>Day Change: ${change1Day}</div>
							<div>Day Change Percent: ${change1DayPercent}%</div>
						
						</div>
				</div>
			</div>`;

			let insertionPoint = document.getElementsByClassName('o-equity-highlight-app')[0];
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
		if (rootEl instanceof HTMLElement && rootEl.matches('[data-o-component=o-equity-highlight-app]')) {
			return new EquityHighlightApp(rootEl, opts);
		}
		return Array.from(rootEl.querySelectorAll('[data-o-component="o-equity-highlight-app"]'), rootEl => new EquityHighlightApp(rootEl, opts));
	}
}

export default EquityHighlightApp;