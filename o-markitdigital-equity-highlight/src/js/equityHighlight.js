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
			const change1WeekPercent = quoteData.items[0].quote.change1WeekPercent.toFixed(2);
			//const timeSeriesDataParams = JSON.stringify(timeSeriesData);

			let htmlTemplate =
			`<div class="demo-container demo-container--standout">
				<div class="o-card o-card--standout o-card--image-" data-o-component="o-card">					
					<div class="o-card__content">
						<h2 class="o-equity-highlight-app__header">Equity highlight</h2>
						<div class="o-equity-highlight-app__symbol o-card__meta">
							<a href="https://markets.ft.com/data/equities/tearsheet/summary?s=${symbol}" 
							class="o-card__tag">${companyName}</a>
							<span class="o-equity-highlight-app__timestamp">${symbol}</span>
						</div>
						<div class="o-equity-highlight-app__price">${lastPrice}
								<span class="o-equity-highlight-app__timestamp">${currency}</span>
						</div>
						<div class="o-equity-highlight-app__border"></div>
						<div class="o-equity-highlight-app__price-change">
							Today's Change 
							<span  class="o-equity-highlight-app__timestamp">${change1Day}/${change1DayPercent}%</span>
						</div>
						<div class="o-equity-highlight-app__price-change--1week">
							1 Week Change 
							<span  class="o-equity-highlight-app__timestamp">${change1WeekPercent}%</span>
						</div>
						<div class="o-equity-highlight-app__border"></div>
						<div class="o-teaser-collection">
							<h2 class="o-teaser-collection__heading">
								<a class="o-teaser-collection__heading-link" 
								href="https://markets.ft.com/data/equities">View more equities</a>
							</h2>
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