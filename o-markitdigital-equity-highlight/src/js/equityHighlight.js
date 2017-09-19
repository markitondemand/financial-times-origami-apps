require('mustache');

class EquityHighlightApp {

	constructor (rootEl) {
		this.rootEl = rootEl;
		const symbolParam = rootEl.getAttribute('data-o-equity-highlight-app-symbol');

		this.getData(symbolParam);
	}

	getData(sym){
		
		const sourceKey = '86c29104c1'; //using API key created for user sakshi jain
		const quoteService = 'http://markets.ft.com/research/webservices/securities/v1/quotes?symbols=' + sym + '&source=' + sourceKey;
		const chartService = 'http://ft.wsodqa.com/Research/InteractiveChart/PriceVolumeChart?symbol=' + sym + '&source=' + sourceKey;

		let quoteServiceRequest = fetch(quoteService).then(resp => resp.json());
		let chartServiceRequest = fetch(chartService).then(resp => resp.json());
		const getFormatColorClass = this.getFormatColorClass;

		Promise.all([quoteServiceRequest, chartServiceRequest])
		.then(function(resp){
			if(resp !== null && resp.length > 1) {
			let quoteData = resp[0]["data"];
			let chartData = resp[1].json.data;

			const companyName = quoteData.items[0].basic.name;
			const symbol = quoteData.items[0].basic.symbol;
			const lastPrice = quoteData.items[0].quote.lastPrice.toFixed(2);
			const currency = quoteData.items[0].basic.currency;
			const change1Day = quoteData.items[0].quote.change1Day.toFixed(2);
			const change1DayPercent = quoteData.items[0].quote.change1DayPercent.toFixed(2);
			const change1WeekPercent = quoteData.items[0].quote.change1WeekPercent.toFixed(2);

			let htmlTemplate =
			`<div class="o-grid-container demo-container">
				<div class="o-teaser" data-o-component="o-teaser">				
					<div class="o-teaser__content">
						<h2 class="o-equity-highlight-app__header">Equity highlight</h2>
						<div class="o-equity-highlight-app__symbol o-teaser__meta">
							<a href="https://markets.ft.com/data/equities/tearsheet/summary?s=${symbol}" 
							class="o-teaser__tag">${companyName}</a>
							<time data-o-component="o-date" class="o-date o-teaser__timestamp">${symbol}</time>							
						</div>
						<div class="o-equity-highlight-app__price">${lastPrice}
							<time data-o-component="o-date" class="o-date o-teaser__timestamp">${currency}</time>								
						</div>
						<div class="o-equity-highlight-app__border"></div>
						<div class="o-equity-highlight-app__price-change">
							Today's Change 
							<span  class="${getFormatColorClass(change1Day)}">
							${change1Day}/${change1DayPercent}%</span>
						</div>
						<div class="o-equity-highlight-app__price-change--1week">
							1 Week Change 
							<span  class="${getFormatColorClass(change1WeekPercent)}">
							${change1WeekPercent}%</span>
						</div>
						<img src="${chartData}" alt="demo image" class="o-equity-highlight-app__chart-image"></img>
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
			console.log("Error retrieving data for " + sym + ": " + error);
		});
	}

	getFormatColorClass(val){
		return parseFloat(val) >= 0 ? "mod-format--pos" : "mod-format--neg";
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