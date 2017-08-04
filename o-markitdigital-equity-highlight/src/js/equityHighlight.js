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
		const sourceKey = '86c29104c1'; //using API key created for user sakshi jain
		const quoteService = 'http://markets.ft.com/research/webservices/securities/v1/quotes?symbols=' + sym + '&source=' + sourceKey;
		const timeSeriesService = 'http://markets.ft.com/research/webservices/securities/v1/time-series?symbols=' + sym + '&source=' + sourceKey;

		let quoteServiceRequest = fetch(quoteService).then(resp => resp.json());
		let timeSeriesServiceRequest = fetch(timeSeriesService).then(resp => resp.json());

		Promise.all([quoteServiceRequest, timeSeriesServiceRequest])
		.then(function(resp){
			if(resp !== null && resp.length > 1) {
			let quoteData = resp[0]["data"];
			//let timeSeriesData = resp[1]["data"]["items"][0]["timeSeries"]["timeSeriesData"];

			const companyName = quoteData.items[0].basic.name;
			const symbol = quoteData.items[0].basic.symbol;
			const lastPrice = quoteData.items[0].quote.lastPrice.toFixed(2);
			const currency = quoteData.items[0].basic.currency;
			const change1Day = quoteData.items[0].quote.change1Day.toFixed(2);
			const change1DayPercent = quoteData.items[0].quote.change1DayPercent.toFixed(2);
			//const timeSeriesDataParams = JSON.stringify(timeSeriesData);

			let htmlTemplate =
			`<div class="demo-container demo-container--standout">
				<div class="o-card o-card--standout o-card--image-" data-o-component="o-card">					
					<div class="o-card__content">
						<h2 class="o-card__heading">Equity highlight</h2>
				
						<div class="o-equity-highlight-app__symbol o-card__meta">
							<a href="https://markets.ft.com/data/equities/tearsheet/summary?s=${symbol}" class="o-card__tag">${companyName}</a>
							<span>${symbol}</span>
						</div>
						<div class="o-equity-highlight-app__price">${lastPrice}
								<span>${currency}</span>
						</div>
						<div class="o-equity-highlight-app__price-change">
								<div>Today's Change <span>${change1Day}</span></div>
								<div>1 Year Change <span>${change1DayPercent}%</span></div>
						</div>
						<div class="o-equity-highlight-app__symbol o-card__meta">
							<a href="https://markets.ft.com/data/equities" class="o-card__tag">View more equities</a>
						</div>
					</div>					
				</div>
			</div>`;

			let insertionPoint = document.getElementsByClassName('o-equity-highlight-app')[0];
			insertionPoint.insertAdjacentHTML('afterbegin', htmlTemplate);
						
			}
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