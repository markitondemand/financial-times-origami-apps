require('mustache');
require('./modcharts.js');
require('./symbolChart.js');

class EquityHighlightApp {

	constructor (rootEl) {
		this.rootEl = rootEl;
		const symbolParam = rootEl.getAttribute('data-o-equity-highlight-app-symbol');

		this.makeQuoteCall(symbolParam);
	}

	makeQuoteCall(sym){
		// Make a quote call and then update module with the results.
		//Need to update to get a valid source key - this one is currently the jump page key and regularly expires.
		const sourceKey = '042a7723d770ad6e';
		const quoteService = 'http://markets.ft.com/research/webservices/securities/v1/quotes?symbols=' + sym + '&source=' + sourceKey;
		const timeSeriesService = 'http://ft.wsodqa.com/research/webservices/securities/v1/time-series?symbols=' + sym + '&source=' + sourceKey;

		var quoteServiceRequest = fetch(quoteService).then(resp => resp.json());
		var timeSeriesServiceRequest = fetch(timeSeriesService).then(resp => resp.json());

		Promise.all([quoteServiceRequest, timeSeriesServiceRequest])
		.then(function(resp){
			if(resp != null && resp.length > 1) {
			var quoteData = resp[0]["data"];
			var timeSeriesData = resp[1]["data"]["items"][0]["timeSeries"]["timeSeriesData"];

			const companyName = quoteData.items[0].basic.name;
			const symbol = quoteData.items[0].basic.symbol;
			const lastPrice = quoteData.items[0].quote.lastPrice.toFixed(2);
			const currency = quoteData.items[0].basic.currency;
			const change1Day = quoteData.items[0].quote.change1Day.toFixed(2);
			const change1DayPercent = quoteData.items[0].quote.change1DayPercent.toFixed(2);
			const timeSeriesDataParams = JSON.stringify(timeSeriesData);

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
						<div id="mod-symbol-chart" data-mod-config=${timeSeriesDataParams}></div>
				</div>
				<footer class="mod-module__footer">
					<a class="mod-ui-link" href="//ft.wsodqa.com/data/equities">View more equities</a>
				</footer>
			</div>`;

			let insertionPoint = document.getElementsByClassName('o-equity-highlight-app')[0];
			insertionPoint.insertAdjacentHTML('afterbegin', htmlTemplate);
			//new MOD.SymbolChartApp('#mod-symbol-chart');
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