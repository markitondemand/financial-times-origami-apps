var $ = require('jquery');
var Modcharts = require('./modcharts.js');

(function () {
	window.MOD = window.MOD || {};
	var COLORS;

	var CONFIG = {
		staticChart: {
			url : '~/charts/tearsheet-summary?numDays={0}&symbols={1}&colors={2}'
		},
		webservice: {
			URL: '~/searchapi/security-search?query={0}'
		}
	};

	var app = function (container) {
		this.$container = $(container);
		if (this.$container.length) {
			var configString = '{"isStatic":false,"issueID":"205778"}'; //this.$container.attr('data-mod-config');
			//this.$container.removeAttr('data-mod-config');
			if (configString) {
				$.extend(CONFIG, JSON.parse(configString))
			}
			this.init();
		}
	};

	app.prototype.init = function () {
		COLORS = MOD.Colors;
		this.initChart();
	};

	// Chart
	app.prototype.initChart = function () {
		this.chartContainer = this.$container.find('.mod-ui-responsive-chart');
		if (!CONFIG.isStatic) {
			this.initNextGenChart();
		} else {
			this.initStaticChart()
		}
	};

	app.prototype.initNextGenChart = function () {
		MOD.chart = this.chart = new Modcharts("#modsymbolchart");
		this.chart.lineColors = this.comparisonColors;
		this.chart.load({
			params: {
				backfill: true,
				symbol: CONFIG.issueID,
				days: this.selectedTabNumDays || 30,
				dataPeriod: "Day",
				dataInterval: 1,
				apiPath: MOD.Common.resolveUrl('~/'),
				imgPath: MOD.Common.resolveUrl('~/content/images/modcharts/'),
				realtime: false,
				useProxyAction: false,
				localeId:'en_GB'
			},
			panels: [
				{
					params: {
						style: {
							gridColor: '#d5cdbf',
						 //   gridColorAlt: '#d5cdbf',
						 //   gridColorTicks: '#d5cdbf',
						 //   gridColorTicksAlt: '#d5cdbf',
							gridColorVertNormalize: '#333',
							gridColorHorizNormalize: '#333',
						 //   gridVertPenPxOn:1,
						 //   gridVertPenPxOff: 2,
						 //   gridHorizPenPxOn: 1,
						 //   gridHorizPenPxOff: 1,
						 //   gridVertAltPenPxOn: 2,
						 //   gridVertAltPenPxOff: 2,
						 //   gridBgColor: 'transparent',
						  //  axisFontColor: '#333',
							axisFontSize: 11,
							axisFontFamily: 'Arial, Helvetica,sans-serif',
							xaxisTextAlign: 'left',
							xaxisTickHeight: 6,
							xaxisTickHeightAlt: 6,
							xaxisPaddingLeft: 6,
							xaxisPaddingTop: 6,
							xaxisLineHeight: 15,
							yaxisPaddingTop: 0,
							yaxisPaddingBottom: 0
						},
						margin: {
							bottom:0
						},
						size: {
							heightPct: .80
						}
					},
					"indicators": [
						{
							id: "price",
							markerType: "fill",
							style: {
								lineWidth: 2,
								lineColor: COLORS.chartRainbow1,
								fillColorStart: hexToRgba(COLORS.chartRainbow1, .45),
								fillColorStop: hexToRgba(COLORS.chartRainbow1, 0)
							}
						}]
				},
				{
					indicators: [
						{
							id: 'volume',
							style: {
								fillColor: COLORS.gray1,
								lineColor: COLORS.chartRainbow1
							}
						}
					],
					params: {
						margin: {
							top: 0,
							bottom:0
						},
						padding: {
							top: 0,
							bottom: 35
						},
						size: {
							heightPct:.20
						},
						style: {
							axisFontSize: 11,
							axisFontFamily: 'Arial, Helvetica,sans-serif',
							xaxisPaddingLeft: 6,
							xaxisPaddingTop: 6,
							xaxisPaddingBottom: 0,
							xaxisLineHeight: 15,
							yaxisPaddingTop: 0,
							yaxisPaddingBottom: 0
						}
					}
					
				}
			]
		});
	};

	app.prototype.initStaticChart = function () {
		if (!this.chartContainer.attr('data-mod-chart-index')) {
			this.reloadChart();
		}
	};

	app.prototype.setChartParams = function (days) {
		this.chart.params.days = days;
		this.chart.params.dataInterval = 1;
		this.chart.exchangeDates = null;
		this.chart.params.normalizeDate = null;
		this.chart.params.dateStart = null;
		this.chart.params.dateStop = null;
		this.chart.panels[0].xAxis.scale[0].domain([0, 0]);
		if (days < 1) {
			this.chart.params.dataPeriod = "Minute";
			this.chart.params.dataInterval = 5;
		} else if (days <= 3){
			this.chart.params.dataPeriod = "Minute";
			this.chart.params.dataInterval = 15;
		} else if (days <= 7){
			this.chart.params.dataPeriod = "Minute";
			this.chart.params.dataInterval = 30;
		} else if (days <= 21){
			this.chart.params.dataPeriod = "Hour";
		} else if (days < 365 * 2){
			this.chart.params.dataPeriod = "Day";
		} else {
			this.chart.params.dataPeriod = "Week";
		}
	}
	
	app.prototype.setChartXid = function (xid) {
		CONFIG.issueID = xid;
		if (!CONFIG.isStatic) {
			this.chart.clearPanels();
			this.chart.setSymbol(xid);
		}
		this.reloadChart();
	};

	app.prototype.reloadChart = function () {
		var tabID = this.$container.find(".mod-ui-tab[aria-selected='true']").attr("aria-controls");
		dayCount = Number(tabID.split('-')[0]);

		if (!CONFIG.isStatic) {
			var chart = this.chart;
			this.setChartParams(dayCount);

			var compColors = [];

			$.each(this.comparisonColors, function (index, value) {
				compColors.push(
					{ "lineColor": value }
				);
			});

			//need to reset the comparisons because chart won't redraw if only the order changes.
			chart.setSymbolCompare([]);

			chart.setSymbolCompare(
				this.savedComparisons,
				function () {
					chart.loadData(
						function () {
						chart.clearPanels();
						chart.renderFrame();
						}
					);
				},
				compColors
			);
		} else {
			var symbols = [CONFIG.issueID];
			var colors = [COLORS.chartRainbow1];

			$.each(this.savedComparisons, $.proxy(function (index, symbol) {
				symbols.push(symbol);
				colors.push(this.comparisonColors[index].replace("#", ""));
			}, this));

			this.chartContainer.css('background-image', 'url(' + MOD.Common.format( MOD.Common.resolveUrl(CONFIG.staticChart.url), dayCount, symbols.join(','), colors.join(',')) + ')');
		}
	}
	function hexToRgba(hex, alpha) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return 'rgba(' + parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) + ', ' + alpha + ')';
	}

	MOD.SymbolChartApp = app;

})();