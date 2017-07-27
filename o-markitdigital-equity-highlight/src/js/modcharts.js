var $ = require('jquery');
var d3 = require('./d3.js');

/*!
 * Modcharts v1.0.2a 2016-06-06 
 * Copyright (c) 2016 Markit On Demand, Inc.
 */

(function($){

"use strict";

/**
 * initialize panels, params, state and overall root dom
 * @class Modcharts
 * @constructor
 * @param {string} rootSelector Root DOM selector
 * @param {object} params Custom chart params
 * @param {object} parent Optional parent object reference
 */
function Modcharts(rootSelector, params, parent) {

	this.rootModchart = d3.select(rootSelector);

	this.verifyDependencies();
	this.panels = [];
	this.parent = parent;
	this.params = this.getDefaultParams(params || {});
	this.LIMIT_INTRADAY_DAYS = 21;
	this.LIMIT_INTERDAY_DAYS = Math.floor(365.25 * 30); // 20 year data limit
	this.rootSelector = rootSelector;
	this.status = 0;
	this.xref = {};
	this.metaData = {};
	this.ticker = {};
	this.isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
	this.isIE9 = window.XDomainRequest && document.documentMode && document.documentMode === 9;
	this.state = this.getChartState();
	this.timeService = {};
	this.data = {};
	this.dataXHR = null;
	this.dataPrimary = [];
	this.lineColors = [];
	this.initDOM();

	return this;
}

/**
 * main configuration collection.  these properties can be serialized and stored.
 * @method getDefaultParams
 */
Modcharts.prototype.getDefaultParams = function(params){

	var chartParams = {

		/**
		 * following a pan/zoom event, backfill any historic data gaps with a delta data request
		 */
		backfill: (typeof params.backfill === "boolean") ? params.backfill : false,

		/**
		 * clip intraday markers to exchange sessions
		 */
		clipSessions: (typeof params.clipSessions === "boolean") ? params.clipSessions : true,

		/**
		 * enable mousemove/over crosshair event handlers and callbacks
		 */
		crosshairEnabled: (typeof params.crosshairEnabled === "boolean") ? params.crosshairEnabled : false,

		/**
		 * enable yaxis flag icon during crosshair events
		 */
		crosshairFlagEnabled: (typeof params.crosshairFlagEnabled === "boolean") ? params.crosshairFlagEnabled : false,

		/**
		 * optional css paths
		 */
		cssPath: typeof params.cssPath === "object" ? params.cssPath : [],

		/**
		 * an object containing one or more custom datasets.  datasets should be in the format:
		 * { "mydata": [{date: "2015-01-05", value: 12.4, additionalVal: 14.2, additionalVal2: 41.4, ...}] }
		 * the key of the dataset ("mydata") can be used as the custom indicator's "datasetId" param.
		 */
		customData: params.customData || null,

		/**
		 * enable custom dataInterface
		 */
		dataInterface: params.dataInterface || null,

		/**
		 * data interval (1, 3, 5, 10)
		 */
		dataInterval: params.dataInterval || null,

		/**
		 * data api should return values as normalized figures (percent change) instead of actuals
		 */
		dataNormalized: (typeof params.dataNormalized === "boolean") ? params.dataNormalized : false,

		/**
		 * data period ("Hour", "Minute", "Day")
		 */
		dataPeriod: params.dataPeriod || null,

		/**
		 * data precision - series values will return this number of decimal points
		 */
		dataPrecision: params.dataPrecision || 3,

		/**
		 * if dateStart/Stop specified, it will become the visible canvas range even if the chartapi data range is different.
		 */
		dateStart: this.getParameterByName("dateStart") || params.dateStart || null,
		dateStop: this.getParameterByName("dateStop") || params.dateStop || null,

		/**
		 * chart api - total days of data to request
		 */
		days: this.getParameterByName("days") || params.days,

		/**
		 * exchangeOffset
		 */
		exchangeOffset: (typeof params.exchangeOffset === "number") ? params.exchangeOffset : 0,

		/**
		 * feed selection group (optional)
		 */
		feedGroup: params.feedGroup || null,

		/**
		 * Enable tool handle snapping
		 */
		toolSnapOHLC: (typeof params.toolSnapOHLC === "boolean") ? params.toolSnapOHLC : false,

		/**
		 * DEPRECATED: relative image path - used for such common images as custom cursors
		 */
		imgPath: params.imgPath,

		/**
		 * locale
		 */
		localeId: (params.localeId && this.locale[params.localeId]) ? params.localeId : "en_US",

		/**
		 * normalizeDate - the date which should be used as the chartapi normalize value
		 */
		normalizeDate: (params.normalizeDate) ? new Date(params.normalizeDate) : null,

		/**
		 * normalizeValue - (deprecated) the value which should be used as the normalization starting point
		 */
		normalizeValue: params.normalizeValue,

		/**
		 * normalizeValues - the ohlc value which should be used as the normalization starting point
		 */
		normalizeValues: params.normalizeValues,

		/**
		 * optional fixed upper panel height
		 */
		panelHeightUpper: params.panelHeightUpper ? Number(params.panelHeightUpper) : null,

		/**
		 * optional fixed lower panel height
		 */
		panelHeightLower: params.panelHeightLower ? Number(params.panelHeightLower) : null,

		/**
		 * Enable panel resizing
		 */
		panelResize: (typeof params.panelResize === "boolean") ? params.panelResize : false,

		/**
		 * which panel(s) should receive an XAxis by default (can be overridden on a per-panel basis)
		 */
		panelXAxis: params.panelXAxis || "last", // "last", "first", "all", "none"

		/**
		 * left pan limit as percent of chart width
		 */
		panLeftPct: params.panLeftPct || 0.5,

		/**
		 * right pan limit as percent of chart width
		 */
		panRightPct: params.panRightPct || 0.5,

		/**
		 * number of minutes between fresh data poll (0 to turn off polling)
		 */
		poll: (typeof params.poll === "number") ? params.poll : 0,

		/**
		 * request realtime data (is enforced via feed entitlements on server-side)
		 */
		realtime: (typeof params.realtime === "boolean") ? params.realtime : false,

		/**
		 * date ranges for the timeservice call.  unit is days.  the timeservice call returns
		 * tradable days within a date range, which is used to construct the XAxis ruler.
		 */
		rulerIntradayStart: params.rulerIntradayStart || 26,
		rulerIntradayStop: params.rulerIntradayStop || 3,
		rulerInterdayStart: params.rulerInterdayStart || this.LIMIT_INTERDAY_DAYS,
		rulerInterdayStop: params.rulerInterdayStop || 365,

		/**
		 * turn on last close flag
		 */
		showFlags: (typeof params.showFlags === "boolean") ? params.showFlags : false,

		/**
		 * turn on lunch break labels
		 */
		showLunchBreakLabels: (typeof params.showLunchBreakLabels === "boolean") ? params.showLunchBreakLabels : false,

		/**
		 * turn on holiday/closure labels
		 */
		showClosureLabels: (typeof params.showClosureLabels === "boolean") ? params.showClosureLabels : false,

		/**
		 * overall chart style vars
		 */
		style: $.extend(true, {}, params.style || {}),

		/**
		 * primary symbol
		 */
		symbol: (params.symbol || this.getParameterByName("symbol") || "").toUpperCase(),

		/**
		 * array of comparison symbols
		 */
		symbolCompare: params.symbolCompare || [],

		/**
		 * test path - used for sample charts and canned data
		 */
		testPath: params.testPath || "../../test/",

		/**
		 * optional usage reporting flag
		 */
		usageReportingAppFeatureType: params.usageReportingAppFeatureType || null,

		/**
		 * Enable alternative request proxy for IE9.  Defaults to true.  Set to false if data API is on the same domain.
		 */
		useProxyAction: (typeof params.useProxyAction === "boolean") ? params.useProxyAction : true,

		/**
		 * Pass cookies in cross-domain requests for chart data
		 * Note: "true" requires MOD.Web.ChartAPI version 0.1.83-beta or higher
		 */
		xhrWithCredentials: (typeof params.xhrWithCredentials === "boolean") ? params.xhrWithCredentials : false,

		/**
		 * yAxis scale type
		 */
		yAxisScale: params.yAxisScale || "linear", // "linear", "log"

		/**
		 * the minimum number of datapoints to show when zooming fully in
		 */
		zoomInExtent: params.zoomInExtent || 10,

		/**
		 * snap to a domain limit after zoom/pan event
		 */
		zoomReset: (typeof params.zoomReset === "boolean") ? params.zoomReset : true,

		/**
		 * is the zoomReset domain limited by the dataset or the XAxis ruler?
		 */
		zoomResetBoundary: params.zoomResetBoundary || "ruler", // "ruler", "dataset"

		/**
		 * limit intraday domain to the intraday date range (~21 days)
		 */
		zoomLimitIntraday: (typeof params.zoomLimitIntraday === "boolean") ? params.zoomLimitIntraday : true,

		/**
		 * toggle ability to zoom/pan with mouse
		 */
		zoomEnabled: (typeof params.zoomEnabled === "boolean") ? params.zoomEnabled : true,

	};

	/**
	 * apiPath prefix for related API requests (save, load)
	 */
	chartParams.apiPath = params.apiPath || this.getDefaultAPIPath();

	/**
	 * api series action
	 */
	chartParams.apiSeries = params.apiSeries || "chartapi/series";

	/**
	 * location of chartAPI service
	 */
	chartParams.chartAPI = params.chartAPI || (chartParams.apiPath + chartParams.apiSeries);

	/**
	 * path to iframe proxy (only used for IE9)
	 */
	chartParams.xProxy = params.xProxy || chartParams.apiPath + "xproxy.html";

	// deprecation notice
	if (chartParams.imgPath){
		this.warn("imgPath param is deprecated.");
	}

	return chartParams;
};

/**
 * @method getDefaultAPIPath
 * default API path if none specified
 */
Modcharts.prototype.getDefaultAPIPath = function(){

	//return "//demo.markitqa.com/chartapi/";

	var environment = (/\.markitqa\.com/.test(document.domain)) ? "Acceptance" : (/^(local|boudev|boupmap|boudes)/.test(document.domain)) ? "Development" : "Production";

	switch (environment){
		case "Production": return "http://api.nasdaqomx.wallst.com/ChartApi/";
		case "Development": return "//" + (document.domain || "local.dev.local") + "/internal/chartapi/";
		default: return "//demo.markitqa.com/chartapi/";
	}
};

/**
 * @method getToolStyle
 * user-defined json styles for tools
 */
Modcharts.prototype.getToolStyle = function(/* toolId */){

	return {};
};

/**
 * @method getIndicatorStyle
 * user-defined json styles for indicators
 */
Modcharts.prototype.getIndicatorStyle = function(/* indicatorId */){

	return {};
};

/**
 * @method getFlagStyle
 * user-defined json styles for flags
 */
Modcharts.prototype.getFlagStyle = function(/* flagId */){

	return {};
};

/**
 * @method verifyDependencies
 * verify root element and jQuery are available, and fix older versions of PrototypeJS
 */
Modcharts.prototype.verifyDependencies = function(){

	// verify root dom element exists
	if (!this.rootModchart.node()){
		return this.warn("Could not find root chart element");
	}

	// set jquery reference if it wasn't available when loading modcharts JS
	if (typeof $ === "undefined" && typeof window.jQuery === "function") {
		// $ is scoped to the UMD outer function (not window) see app/src/umd/intro.js
		$ = window.jQuery;
	}

	// adjust JSON.stringify for older versions of PrototypeJS
	if (typeof window.Prototype !== "undefined" &&
		parseFloat(window.Prototype.Version.substr(0,3)) < 1.7 &&
		typeof Array.prototype.toJSON !== "undefined"
	) {

		var jsonStringify = JSON.stringify;
		JSON.stringify = function(value) {

			var arrayToJSON = Array.prototype.toJSON;
			delete Array.prototype.toJSON;

			var r = jsonStringify(value);
			Array.prototype.toJSON = arrayToJSON;
			return r;
		};
	}
};

/**
 * create dom elements and some bindings
 * @method initDOM
 */
Modcharts.prototype.initDOM = function(){

	var self = this;

	if (this.params.size) {

		this.rootModchart.style("width", this.params.size.width + "px");
		this.rootModchart.style("height", this.params.size.height + "px");
	}

	// hide dom tree from screen readers
	this.rootModchart.attr("aria-hidden", true);

	this.rootModchart.classed("modcharts-root modcharts-noselect", true);

	this.size = {
		"width": this.rootModchart.node().clientWidth,
		"height": this.rootModchart.node().clientHeight
	};

	d3.select("body").on("keydown", function(){ return self.onKeyDown(); });

	// root messages
	this.rootMessages = this.rootModchart
		.append("div")
		.attr("class", "modcharts-rootmessages");

	// zoom behavior
	this.zoom = d3.behavior.zoom()
		.size([this.size.width, this.size.height])
		.on("zoom", $.proxy(this.onZoom, this))
		.on("zoomstart", $.proxy(this.onZoomStart, this))
		.on("zoomend", $.proxy(this.onZoomEnd, this));

	// root mouse
	this.rootMouse = this.rootModchart
		.append("div")
		.attr("class", "modcharts-rootmouse")
		.style("width", this.size.width + "px")
		.style("height", this.size.height + "px")
		.attr("pointer-events", "all")
		.on("mouseover", function(){ return self.onMouseover(); })
		.on("mouseout", function(){ return self.onMouseout(); })
		.on("mousemove", function(){ return self.onMousemove(this); })
		.on("click", function(){ return self.onClick(this); })
		.on("dblclick", function(){ return self.onDoubleClick(this); })
		.on("contextmenu", function(){ return self.onRightClick(this); })
		.on("mousedown", function(){ return self.onMousedown(this); })
		.on("mouseup", function(){ return self.onMouseup(); })
		.on("touchstart", function(){ /*console.log("onTouchStart");*/ return self.onMousedown(this); })
		.on("touchend", function(){ /*console.log("onTouchEnd");*/ return self.onMouseup(); })
		.on("touchmove", function(){ /*console.log("onTouchMove");*/ return self.onMousemove(this); });

	// resize handler
	$(window).resize(function(){

		window.clearTimeout(self.resizeTimeout);

		self.resizeTimeout = window.setTimeout(function(){

			self.resize();
			self.render();

		}, 10);

	});

	// hash debugger
	if (document.location.hash && document.location.hash.length){

		var hash = window.location.hash.substring(1).split("=");
		if (hash.length === 2 && hash[0] === "..modchartsdebug.." && hash[1] === "on"){
			if (!window.ModchartsDebug){
				window.ModchartsDebug = {};
			}
			window.ModchartsDebug[this.rootSelector] = this;
		}
	}
};

/**
 * track temporary app states
 * @method getChartState
 */
Modcharts.prototype.getChartState = function(){

	return {

		/**
		 * optional OAuth bearer token to be added to ajax request headers.  use setAuthToken() to set.
		 * used when accessing a data API through the APIMAN gateway.
		 */
		authToken: null,

		/**
		* optional X-MOD-ACCESS-TOKEN header to be added to ajax request headers.  use setAccessToken() to set.
		* used when accessing an ApiAuthModule-based data API directly, bypassing the APIMAN gateway.
		*/
		accessToken: null,

		/**
		 * if we're about to start drawing a tool or in the middle of drawing it, this will contain the tool's type (eg. "line")
		 * note - this does not affect the selected state of the tool.
		 */
		toolmode: null,

		/**
		 * the currently-active tool
		 */
		tool: null,

		/**
		 * the currently-dragged tool before mouseup
		 */
		dragTool: null,

		/**
		 * the panel currently being resized (the one below the currently-active resize bar)
		 */
		resizePanel: null,

		/**
		 * in the middle of hovering over a panel resize bar
		 */
		hoverResizePanel: null,

		/**
		 * current y value of mouse during panel resizing
		 */
		resizePanelY: null,

		/**
		 * in the middle of a d3 zoom event
		 */
		zooming: null
	};
};

/**
 * store locale information - this will be populated during build with content from src/locale
 */
Modcharts.prototype.locale = {};

/**
 * d3 timeFormat with locale rules
 */
Modcharts.prototype.timeFormat = function(specifier) {

	if (!this.state.locale){
		this.state.locale = d3.locale(this.locale[this.params.localeId]);
	}

	return this.state.locale.timeFormat(specifier);
};

/**
 * return position information for chart elements
 */
Modcharts.prototype.getChartDimensions = function() {

	var output = {
		panels: []
	};

	this.eachPanel(function(panel){

		output.panels.push({
			top: panel.size.top + panel.size.padding.top,
			left: panel.size.padding.left,
			height: panel.size.height,
			width: panel.size.width,
		});

	});

	return output;
};

/**
 * get first non-transparent backgroundcolor from dom ancestors
 */
Modcharts.prototype.getVisibleBackgroundColor = function ($el) {

	var color, bgColor = null;

	while (!bgColor && $el.parent()) {

		color = $el.css("background-color");

		if (color.split(",").length !== 4 && color !== "transparent"){
			bgColor = color;
		}

		$el = $el.parent();
	}

	return bgColor;
};

/**
 * combine all panel canvas elements into a single canvas
 */
Modcharts.prototype.getExportCanvas = function (width, height) {

	var size = this.panels[0].size,
		y = size.padding.top,
		self = this,
		$root = $(this.rootModchart.node()),
		isStyled = $root.prop("style")["width"].length > 0,
		origHeight = $root.height(),
		origWidth = $root.width(),
		thisIndicator, inputs,
		bgColor = this.getVisibleBackgroundColor($(this.rootModchart.node())),
		devicePixelRatio = window.devicePixelRatio || 1,
		rootContext = this.panels[0].rootContext,
        backingStoreRatio = rootContext.webkitBackingStorePixelRatio || rootContext.mozBackingStorePixelRatio || rootContext.msBackingStorePixelRatio || rootContext.oBackingStorePixelRatio || rootContext.backingStorePixelRatio || 1,
		ratio = devicePixelRatio / backingStoreRatio;

	if (!height) { height = 0; }
	if (!width){ width = size.width + size.padding.left + size.padding.right; }

	if (height === 0) {
		// get total height
		this.eachPanel(function (panel) {

			height += panel.size.height + panel.size.padding.top + panel.size.padding.bottom;

		});
	}

	// set new dimensions
	$root.css("height", height).css("width", width);

	this.resize();
	this.render();

	// create canvas inside iframe
	var canvas = $("<canvas/>")
		.attr("width", width * ratio)
		.attr("height", height * ratio)
		.css("width", width)
		.css("height", height),
		context = canvas[0].getContext("2d");

	context.rect(0,0,width * ratio, height * ratio);
	context.fillStyle = bgColor;
	context.fill();

	// draw panels into canvas using drawImage (faster than base64ing)
	this.eachPanel(function (panel) {

		var ctx = panel.rootContext,
			indicators = panel.indicators,
			xLeft = panel.size.padding.left + 10,
			label, wsodIssue;

		for (var x = 0; x < indicators.length; x++) {

			thisIndicator = indicators[x];
			inputs = [];

			for (var i = 0; i < thisIndicator.params.inputs.length; i++) {
				inputs.push(thisIndicator.params.inputs[i].value);
			}

			// text label
			if (thisIndicator.params.id === "price") {

				// price labels should include company name
				wsodIssue = self.getWSODIssueByTicker(thisIndicator.params.symbol);

				label = (wsodIssue) ? self.xref[wsodIssue].companyName : thisIndicator.params.symbol;

			} else {

				// all other indicators
				label = (thisIndicator.params.name || "") + ((inputs.length !== 0) ? " (" + inputs.join(",") + ")" : "");

			}

			ctx.font = "11px Arial";
			ctx.textBaseline = "top";
			ctx.fillStyle = thisIndicator.params.style.lineColor || thisIndicator.params.style.fillColor || "#666";
			ctx.fillText(label, xLeft, 10);

			xLeft += ctx.measureText(label).width + 10;

		}

		context.drawImage(panel.rootCanvas.node(), 0, y);
		context.drawImage(panel.rootTools.node(), 0, y);

		y += (Math.floor(panel.size.height) + panel.size.padding.top + panel.size.padding.bottom + panel.size.margin.bottom) * ratio;

	});

	// reset dimensions back to original
	$root
		.css("height", (isStyled) ? origHeight : "")
		.css("width", (isStyled) ? origWidth : "");

	this.resize();
	this.render();

	return canvas;
};

/**
 * cross-browser fullscreen
 * @method toggleFullScreen
 */
Modcharts.prototype.toggleFullScreen = function() {

	var element = document.body;

    // Supports most browsers and their versions.
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
    } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
        var wscript = new window.ActiveXObject("WScript.Shell");
        if (wscript !== null) {
            wscript.SendKeys("{F11}");
        }
    }
};

/**
 * Send warning to browser console
 */
Modcharts.prototype.warn = function(msg) {

	try{

		if (window.console && window.console.warn){
			window.console.warn(msg);
		}

	} catch(e){}

	/*
	try{

		if (window.console && window.console.trace){
			window.console.trace();
			window.console.log("");
		}

	} catch(e){}
	*/
};

/**
 * cross-browser window origin
 * @method getWindowOrigin
 */
Modcharts.prototype.getWindowOrigin = function(){

	var windowOrigin = window.location.origin;

	if (!windowOrigin) {
		windowOrigin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port: "");
	}

	return windowOrigin;
};

/**
 * registers the zoom events for a given d3 element
 * @method registerZoom
 */
Modcharts.prototype.registerZoom = function(el) {

	//console.log("registerzoom");

	el = el || this.rootMouse;

	if (this.params.zoomEnabled && this.state.toolmode === null){
		this.zoom(el);
	}

	// disable d3 zoom double-click
	this.rootMouse.on("dblclick.zoom", null);
};

/**
 * unregisters the zoom events from a given d3 element
 * @method unregisterZoom
 */
Modcharts.prototype.unregisterZoom = function(el) {

	//console.log("unregisterzoom");

	el = el || this.rootMouse;

	el.on(".zoom", null);

	this.state.zooming = false;
};

/**
 * return panel currently under mouse
 * @method getActivePanel
 */
Modcharts.prototype.getActivePanel = function(mouse) {

	var activePanel = null;

	this.eachPanel(function(panel){

		if (!activePanel && panel.isWithin(mouse)) {
			activePanel = panel;
		}
	});

	return activePanel;
};

/**
 * @method getSelectedTool
 */
Modcharts.prototype.getSelectedTool = function() {

	var selectedTool = null, panel = {};

	for (var p=0; p < this.panels.length; p++){

		panel = this.panels[p];

		for (var i = 0; i < panel.tools.length; i++) {
			if (panel.tools[i].state.selected){

				selectedTool = panel.tools[i];
			}
		}
	}

	return selectedTool;
};


/**
 * get primary indicator
 * @method getPrimaryIndicator
 */
Modcharts.prototype.getPrimaryIndicator = function() {

	var indicator = null;
	var self = this;

	this.eachPanel(function(panel){

		if (!indicator){

			$.each(panel.indicators, function(){

				if (this.params.id === "price" && this.params.symbol === self.params.symbol){

					indicator = this;
					return false;
				}
			});
		}
	});

	return indicator;
};

Modcharts.prototype.isWithinTool = function(mouse) {

	//console.log("isWithinTool");

	var tool = null, mousePanel = [];

	this.eachPanel(function(panel){

		mousePanel = [mouse[0], mouse[1] - panel.size.top];

		for (var t=0; t < panel.tools.length; t++){

			// is within tool shape
			if (panel.tools[t].isWithin(mousePanel)){

				tool = panel.tools[t];

				return false;
			}
		}
	});

	return tool;
};

/**
 * set all panel domains to the first panel's domain
 * @method normalizePanelDomains
 */
Modcharts.prototype.normalizePanelDomains = function() {

	var firstPanel = this.panels[0],
		firstDomain = firstPanel.xAxis.scale[0].domain();

	this.eachPanel(function(panel){

		if (panel !== firstPanel){
			panel.xAxis.scale[0].domain(firstDomain);
		}

	});
};

/**
 */
Modcharts.prototype.getNextIntervalMinute = function(date) {

	while (date.getMinutes() % this.params.dataInterval !== 0) {
		date.setMinutes(date.getMinutes() + 1);
	}

	return date;
};

/**
 * receive a datapoint from external streamserver.
 * datapoint should be in format:
	{
		date: 1404230760000,
		last: "26.4"
	}
 * @method onStreamTrade
 */
Modcharts.prototype.onStreamTrade = function(datapoint){

	if (!this.data[this.params.symbol]) { return; }

	var localDate = new Date(datapoint.date),
		panelNormalized = this.panels[0].isNormalized(),
		newDate;

	if (!this.state.isIntraday){

		newDate = new Date(localDate);

		newDate.setHours(0);
		newDate.setMinutes(0);
		newDate.setSeconds(0);

	} else {

		// adjust for local tz offset
		localDate.setMinutes(localDate.getMinutes() + localDate.getTimezoneOffset());

		newDate = new Date(this.exchangeDates[this.closestExchangeIndex(localDate)]);

		if (this.params.dataInterval > 1){

			newDate = this.getNextIntervalMinute(newDate);
		}
	}

	var newClose = Number(datapoint.last),
		datasetOHLC = this.dataPrimary,
		currOHLC = datasetOHLC[datasetOHLC.length - 1],
		currDate = currOHLC.date,
		diffSec = Number(((newDate - currDate) / 1000).toFixed(2));

	// if panel is normalized, convert value
	if (panelNormalized){
		newClose = this.getNormalizedFromActual(newClose);
	}

	if (newDate >= currDate){

		// if within current interval, replace last data point's HLC (Open stays the same)
		if (
			(this.params.dataPeriod === "Minute" && diffSec < 60 * this.params.dataInterval) ||
			(this.params.dataPeriod === "Day" && diffSec < 86400)
		){

			currOHLC.high = Math.max(currOHLC.high, newClose);
			currOHLC.low = Math.min(currOHLC.low, newClose);
			currOHLC.close = newClose;

			console.log("REPLACE, new=" + newClose);

		} else {

			// add brand new ohlc point
			datasetOHLC.push({
				date: newDate,
				close: newClose,
				open: newClose,
				high: newClose,
				low: newClose
			});

			console.info("APPEND, sec=" + diffSec);
		}
	}

console.log("   stream date", localDate);
console.log("last ohlc date", currDate);
console.log("      new date", newDate);
console.log("");

	this.renderQueue();
};

/**
 * @method startTestStream
 */
Modcharts.prototype.startTestStream = function(dateStart, ms){

	if (!dateStart){

		dateStart = new Date();
		dateStart.setDate(dateStart.getDate());
		dateStart.setHours(13 - (dateStart.getTimezoneOffset() / 60));
		dateStart.setMinutes(30);
		dateStart.setSeconds(0);
		dateStart.setMilliseconds(250);
	}

	var lastTrade = this.dataPrimary[this.dataPrimary.length - 1].close,
		self = this,
		tradeCount = 0,
		speed = 4;

	this.stopTestStream();

	this.testStreamInterval = window.setInterval(function(){

		lastTrade = lastTrade * ((Math.random() > 0.5) ? 1.0001 : 0.9999);

		self.onStreamTrade({
			date: new Date(dateStart.setMilliseconds(speed * tradeCount++)),
			last: lastTrade
		});

	}, ms || 1000);
};

/**
 * @method stopTestStream
 */
Modcharts.prototype.stopTestStream = function(){

	if (this.testStreamInterval){
		window.clearInterval(this.testStreamInterval);
	}
};

/**
 * @method resetDomain
 * empty out the primary domain.  this is usually done ahead of a data request that will require an entirely new timeframe or symbol with different tradingdays.
 * the domain will then be reconstructed against the new data in getDefaultDomain.
 */
Modcharts.prototype.resetDomain = function(){

	if (this.panels.length){
		this.panels[0].xAxis.scale[0].domain([0,0]);
	}
};

/**
 * @method resetTools
 * clear out any existing tools and reset the chart state
 */
Modcharts.prototype.resetTools = function(){

	this.eachPanel(function(panel){

		for (var t=panel.tools.length - 1; t >= 0; t--){

			panel.tools[t].remove();

		}
	});

	this.state.toolmode = null;
	this.registerZoom();
};

/**
 * @method setToolMode
 * set or exit tool mode (note: does not affect selected tool state)
 */
Modcharts.prototype.setToolMode = function(id){

	//console.log("setToolMode", arguments);

	if (typeof id === "string"){

		this.state.toolmode = id;
		this.unregisterZoom();

	} else {

		// exit tool mode
		this.state.toolmode = null;

		this.registerZoom();
		this.updateZoom();

		// render tools
		this.eachPanel(function(panel){

			panel.clearTools();
			panel.renderTools();

		});
	}

	if (this.onSetToolModeCallback){

		this.onSetToolModeCallback(id);

	}
};

// select specified tool and unselect others
Modcharts.prototype.selectTool = function(tool) {

	//console.log("selectTool", tool);

	if (tool === null){

		this.state.tool = null;

	} else {

		this.state.tool = tool;
	}

	this.onToolSelect(tool);

	// select the tool object that matches input tool
	this.eachPanel(function(panel){

		for (var x=0; x < panel.tools.length; x++){

			panel.tools[x].state.selected = panel.tools[x] === tool;

		}
	});
};

/**
 * @method setLocale
 */
Modcharts.prototype.setLocale = function(id){

	if (this.locale[id]){

		this.params.localeId = id;
		this.state.locale = null;

		// regenerate labels
		this.panels[0].xAxis.labeler.createLabels();
	}
};

/**
 * @method setAuthToken
 * sets an authorization token to be added to ajax request headers
 */
Modcharts.prototype.setAuthToken = function(token){

	this.state.authToken = token;
};

/**
* @method setAccessToken
* sets an authorization token to be added to ajax request headers
*/
Modcharts.prototype.setAccessToken = function(token){

   this.state.accessToken = token;
};

/**
 * @method setCursor
 */
Modcharts.prototype.setCursor = function(id){

	//console.log("setCursor",id);

	var cursor, self = this, $el = $(self.rootModchart.node());

	if (this.cursor === id){ return; }

	// don't use cross cursors when crosshair is disabled
	if (id === "cross" && !this.params.crosshairEnabled){
		id = "default";
	}

	this.cursor = id;

	if (this.params.imgPath) { // deprecated

		if (this.status === 0){
			cursor = "default";
		} else if (id === "default" || id === "pointer" || id === "ns-resize"){
			cursor = id;
		} else {
			cursor = "url(" + this.params.imgPath + "cursor_" + id + ".cur), default";
		}

		this.rootModchart.style("cursor", cursor);

	} else {

		if (!$el.hasClass("modcharts-cursor-" + id)){
			// remove old class
			$.each(["default","pointer","ns-resize","cross","closed_hand"], function(){
				$el.removeClass("modcharts-cursor-" + this);
			});

			$el.addClass("modcharts-cursor-" + id);
		}
	}
};

/**
 * clear out old symbolCompare values and indicators and add new ones
 * @method setSymbolCompare
 * @param {array} symbolCompare
 */
Modcharts.prototype.setSymbolCompare = function(symbolCompare, callback, compareStyles) {

	// optional compare styles
	if (!compareStyles){
		compareStyles = [];
	}

	if (typeof symbolCompare !== "object"){

		this.warn("Invalid comparison symbols");
		return;
	}

	// enforce strings
	symbolCompare = symbolCompare.map(function(s){
		return String(s);
	});

	// remove from this.params.symbolCompare collection if not symbolCompare collection
	for (var x = this.params.symbolCompare.length - 1; x >= 0; x--) {

		// if old symbol not in new collection, remove
		if ($.inArray(this.params.symbolCompare[x], symbolCompare) === -1){

			var removedSymbol = this.params.symbolCompare.splice(x, 1)[0];

			// also remove any price indicators with this symbol
			this.eachPanel(function(panel){

				// remove old indicators
				for (var i = panel.indicators.length -1; i >= 0; i--){

					if (panel.indicators[i].params.symbol && panel.indicators[i].params.symbol === removedSymbol){

						panel.removeIndicator(panel.indicators[i]);

					}
				}
			});
		}
	}

	// add new ones in
	var newIndicators = [];

	for (x = 0 ; x < symbolCompare.length; x++){

		if ($.inArray(symbolCompare[x], this.params.symbolCompare) === -1){

			this.params.symbolCompare.push(symbolCompare[x]);

			var compareStyle = { lineColor: this.getNewLineColor(newIndicators), lineWidth: 1.5 };

			// optional per-indicator styles
			if (compareStyles[x]) {

				$.each(["lineColor", "lineWidth"], function(){

					if (compareStyles[x][this]) {
						compareStyle[this] = compareStyles[x][this];
					}
				});
			}

			newIndicators.push(
				{
					id: "price",
					style: compareStyle,
					symbol: symbolCompare[x]
				}
			);
		}
	}

	this.panels[0].addIndicators(newIndicators, callback);

	// reset the domain since the new request can have different exchangeDates and will make the old domain invalid
	this.resetDomain();
};

/**
 */
Modcharts.prototype.setDateRange = function(dateStart, dateStop) {

	dateStart = new Date(dateStart);
	dateStop = new Date(dateStop);

	// enforce that start is always earlier than stop
	var minDate = new Date(Math.min(dateStart, dateStop)),
		maxDate = new Date(Math.max(dateStart, dateStop)),
		dateLimit = new Date().setDate(new Date().getDate() - this.LIMIT_INTERDAY_DAYS);

	minDate = new Date(Math.max(minDate, dateLimit));
	maxDate = new Date(Math.min(maxDate, new Date()));

	// adjust for local tz offset
	minDate.setMinutes(minDate.getMinutes() + minDate.getTimezoneOffset());
	maxDate.setMinutes(maxDate.getMinutes() + maxDate.getTimezoneOffset());

	// custom intraday ranges should extend to midnight of max day (NXC-572)
	if (new Date().getDate() - minDate.getDate() <= this.LIMIT_INTRADAY_DAYS){
		maxDate.setMilliseconds(0);
		maxDate.setSeconds(0);
		maxDate.setMinutes(0);
		maxDate.setHours(0);
		maxDate.setDate(maxDate.getDate() + 1);
	}

	this.params.dateStart = minDate;
	this.params.dateStop = maxDate;
	this.params.days = null;

	// unselect tools and exit tool mode
	this.selectTool(null);
	this.setToolMode(false);

	// reset zoom
	this.unregisterZoom();
	this.updateZoom();
	this.registerZoom();

	// reset domain - will be repopulated next time getDefaultDomain runs
	this.resetDomain();
};

/**
 * setter for params.days
 */
Modcharts.prototype.setDays = function(days) {

	// unselect tools and exit tool mode
	this.selectTool(null);
	this.setToolMode(false);

	this.resetDomain();
	this.params.dateStart = null;
	this.params.dateStop = null;
	this.params.days = days;
};

/**
 * setter for params.dataInterval
 */
Modcharts.prototype.setDataInterval = function(interval) {

	this.params.dataInterval = interval;
};

/**
 * setter for params.dataPeriod
 */
Modcharts.prototype.setDataPeriod = function(period) {

	this.params.dataPeriod = period;
};

/**
 * set new primary symbol and reset price indicators params.symbol
 * @method setSymbol
 * @param {string} symbol
 */
Modcharts.prototype.setSymbol = function(symbol) {

	symbol = String(symbol || "");

	if (this.params.symbol === symbol || !this.panels.length){
		return;
	}

	this.resetDomain();

	var i, ind = this.panels[0].indicators;

	for (i = ind.length - 1; i >= 0; i--){

		if (ind[i].params.symbol === symbol){

			// remove old comparison if it is of the new symbol
			this.panels[0].indicators.splice(i, 1);

		} else if (ind[i].params.symbol === this.params.symbol){

			// switch older primary symbol in applicable indicators to the new symbol
			ind[i].params.symbol = symbol;
		}
	}

	var index = this.params.symbolCompare.indexOf(symbol);

	if (index > -1){
		this.params.symbolCompare.splice(index, 1);
	}

	this.params.symbol = symbol;

	// unselect tools and exit tool mode
	this.selectTool(null);
	this.setToolMode(false);

	this.unregisterZoom();
	this.updateZoom();
	this.registerZoom();
};

/**
 * set zoom enabled param and register/unregister d3 zoom handler
 */
Modcharts.prototype.setZoomEnabled = function(isEnabled) {

	this.params.zoomEnabled = (typeof isEnabled === "boolean") ? isEnabled : true;

	if (this.params.zoomEnabled){
		this.registerZoom();
	} else {
		this.unregisterZoom();
	}
};

/**
 * setter for params.toolSnapOHLC which also removes the snapHandle reference
 */
Modcharts.prototype.setToolSnapOHLC = function(isEnabled) {

	this.params.toolSnapOHLC = (typeof isEnabled === "boolean") ? isEnabled : true;

	if (!this.params.toolSnapOHLC){
		this.state.snapHandle = null;
	}
};

/**
 * given a selector and property, walk styleSheets to determine value
 * @method getStyle
 * @param {string} selector
 * @param {string} property
 * @return {string} match
 */
Modcharts.prototype.getStyle = function(selector, property) {

	var sheets = document.styleSheets,
		matches = [],
		match = null,
		selRegex = new RegExp(selector.replace(".","\\.") + "$"),
		s = 0, x = 0, text = "", rules = [], importRules = [],
		regex = new RegExp(property + ":\\s*([^;]+)");

	for (s=0; s < sheets.length; s++){

		if (!this.params.cssPath){

			// don't look for any css styles (JSON-provided styles only)
			continue;

		} else if (this.params.cssPath.length && sheets[s].href){

			var sheetMatch = false;

			for (var c=0; c < this.params.cssPath.length; c++){
				if (new RegExp(this.params.cssPath[c].replace(/\./g,"\\.").replace(/\//g,"\\/")).test(sheets[s].href)){
					sheetMatch = true;
				}
			}

			if (!sheetMatch){ continue; }

		}

		rules = [];

		try{ // firefox will throw a SecurityException w/o the try/catch
			rules = sheets[s].cssRules || sheets[s].rules || [];
		} catch(e){}

		for (x=0; x < rules.length; x++) {

			if (rules[x].styleSheet){

				// dive into any @imported rules
				importRules = [];

				try{ // firefox will throw a SecurityException w/o the try/catch
					importRules = rules[x].styleSheet.cssRules || rules[x].styleSheet.rules || [];
				} catch(e){}

				for (var y=0; y < importRules.length; y++){

					if (selRegex.test(importRules[y].selectorText)) {

						text = importRules[y].cssText || importRules[y].style.cssText || "";

						if (regex.test(text)){
							matches.push(RegExp.$1);
						}
					}
				}

			} else {

				// check regular rule
				if (selRegex.test(rules[x].selectorText)) {

					text = rules[x].cssText || rules[x].style.cssText || "";

					if (regex.test(text)){
						matches.push(RegExp.$1);
					}
				}
			}
		}
	}

	match = (matches.length > 0) ? matches[matches.length - 1] : null;

	// trim "px"
	if (match !== null){

		match = match
			.replace("px", "")
			.replace(/\'/g, "");
	}

	// cast numbers
	if (/^[\d\.]+$/.test(match)){
		match = Number(match);
	}

	//console.log(selector, property, match);

	return match;
};

/**
 * get all datasets for a given symbol and data type (price, sma etc.)
 * one use of this is to grab the first price dataset for the primary chart symbol so that a legend can display OHLC info.
 * @method getDataByType
 * @returns {array}
 */
Modcharts.prototype.getDataByType = function(symbol, type, symbolData){

	if (!this.data){
		return [];
	}

	var indicators = [];

	if (!symbolData){

		symbolData = this.data[symbol || this.params.symbol] || {};

	}

	$.each(symbolData[type] || {}, function(){

		indicators.push(this);

	});

	return indicators;
};

/**
 * add a new panel object to panels collection
 * @param {object} params
 * @method addPanel
 * @return {Panel}
 */
Modcharts.prototype.addPanel = function(params){

	var panel = new Modcharts.Panel();

	if (!params){ params = {}; }

	this.panels.push(panel);

	panel.init(this, params);

	this.combineXAxes();

	if (!params.size || !params.size.heightPct){

		this.updatePanelHeightPercents();

	}

	this.updateZoom();

	return panel;
};

/**
 * remove panel object from panels collection
 * @method removePanel
 * @param {Panel} panel
 */
Modcharts.prototype.removePanel = function(panel){

	for (var x = this.panels.length-1; x >=0; x--){

		if (this.panels[x] === panel) {

			panel.remove();

			this.panels.splice(x,1);

			break;
		}
	}

	this.combineXAxes();

	this.updatePanelHeightPercents();

	this.updateZoom();
};

/**
 * @method updatePanelHeightPercents
 */
Modcharts.prototype.updatePanelHeightPercents = function(){

	var self = this,
		idx,
		numPanels = self.panels.length,
		lowerHeight = 1.0 / (numPanels + 1),
		upperHeight = lowerHeight * 2;

	this.eachPanel(function(panel){

		idx = self.getPanelIndex(panel);

		if (idx === 0 && numPanels === 1){

			panel.size.heightPct = 1;
			panel.params.size.heightPct = null;
			return false;
		}

		if (idx === 0){

			panel.size.heightPct = upperHeight;

		} else {

			panel.size.heightPct = lowerHeight;
		}
	});
};

/**
 * modify the padding of all panels so that only
 * specified panels contains an x-axis
 * @method combineXAxes
 */
Modcharts.prototype.combineXAxes = function(){

	this.eachPanel(function(panel){

		if (panel.xAxis.hasAxis()){

			panel.size.padding.bottom = panel.params.padding.bottom;

		} else {

			panel.size.padding.bottom = 0;
		}
	});
};

/**
 * get the numeric index of Panel from the panels collection
 * @method getPanelIndex
 * @param {Panel} panel
 * @return {int}
 */
Modcharts.prototype.getPanelIndex = function(panel){

	for (var i = 0; i < this.panels.length; i++) {

		if (this.panels[i] === panel){
			return i;
		}
	}
};

/**
 * @method loadingStart
 * reveal loading spinner
 */
Modcharts.prototype.loadingStart = function() {

	window.clearTimeout(this.loadingStartTimeout);

	var self = this;

	this.loadingStartTimeout = window.setTimeout(function(){

		if (!self.loading) {
			self.loading = $("<div class=\"modcharts-loading\" />")
			.appendTo($(self.rootModchart.node()));
		}

		self.clearMessage();
		self.loading.show();
		self.loading.css("left", self.size.width / 2 - (self.loading.width() / 2));
		self.loading.css("top", self.size.height / 2 - self.loading.height());

		$(self.rootModchart.node()).css("opacity", 0.6);
		$(self.rootModchart.node()).addClass("modcharts-root-loading");

	}, 150);
};

/**
 * @method loadingStop
 * conceal loading spinner
 */
Modcharts.prototype.loadingStop = function() {

	window.clearTimeout(this.loadingStartTimeout);

	$(this.rootModchart.node()).find(".modcharts-loading").remove();
	this.loading = null;
	$(this.rootModchart.node()).css("opacity", "1");
	if (this.rootTools){
		this.rootTools.show();
	}

	$(this.rootModchart.node()).removeClass("modcharts-root-loading");
};

/**
 * combine canvas panels and print hidden iframe
 */
Modcharts.prototype.print = function(args){

	// unselect tools and exit tool mode
	this.selectTool(null);
	this.setToolMode(false);

	args = args || {};

	this.render();

	var self = this;

	document.domain = document.domain;

	this.printFrame = $("<iframe/>")
		.attr("src", (args.urlPrefix || "") + "blank.html#" + document.domain)
		.attr("height", this.size.height)
		.attr("width", this.size.width)
		.css("visibility", "hidden")
		.css("z-index", -1)
		.on("load", function(){

			var iDoc = self.printFrame[0].contentDocument,
				iBody = $(iDoc).find("body"),
				yChart = 80,
				canvas = self.getExportCanvas(args.width, args.height),
				printHeader = self.getPrintHeader({symbol: self.params.symbol});

			// append custom print-only header, if it exists
			if (printHeader){
				iBody.append(printHeader);
			}

			// append new canvas
			canvas.css("position", "absolute");
			canvas.css("top", yChart);
			iBody.append(canvas);

			// firefox likes a setTimeout here
			window.setTimeout(function(){

				// invoke print from within iframe

				self.printFrame[0].contentWindow.focus();

				if (!self.printFrame[0].contentWindow.document.execCommand("print", false, null)){
					self.printFrame[0].contentWindow.print();
				}

				// remove hidden iframe
				self.printFrame.remove();
				self.printFrame = null;

			}, 0);

		});

	$("body").append(this.printFrame);
};

/**
 * custom print header - can be overridden locally
 */
Modcharts.prototype.getPrintHeader = function(/* args */){

	return false;
	// return "<h1>Chart for " + args.symbol + "</h1>";
};

/**
 * store down image on server
 */
Modcharts.prototype.saveImage = function(args){

	// unselect tools and exit tool mode
	this.selectTool(null);
	this.setToolMode(false);

	args = args || {};

	var canvas = this.getExportCanvas(args.width || this.size.width, args.height || this.size.height)[0],
		canvasB64 = canvas.toDataURL(),
		self = this;

	$.ajax({
		type: "post",
		url: this.params.apiPath + "chartapi/saveimage",
		dataType: "json",
		data: {
			json: canvasB64,
			name: args.name
		},
		complete: function(resultIn){

			var result = self.parseDebugInfo(resultIn.responseText);

			if (result && result.Id){
				window.prompt("The shared chart is now available at the following location:", self.params.apiPath + "chartapi/loadimage/" + result.Id);
			} else {
				window.alert("An error occurred.\n\n" + JSON.stringify(result));
			}

		}
	});
};

/**
 * old method name for backward compatibility
 */
Modcharts.prototype.shareImage = function() {

	this.warn("The \"shareImage\" method has been renamed to \"saveImage\".");
	return this.saveImage(arguments);
};

/**
 * temporarily store image, send down with custom filename, then delete image.
 */
Modcharts.prototype.downloadImage = function(args){

	// unselect tools and exit tool mode
	this.selectTool(null);
	this.setToolMode(false);

	args = args || {};

	var canvas = this.getExportCanvas(args.width, args.height)[0],
		canvasB64 = canvas.toDataURL(),
		self = this;

	$.ajax({
		type: "post",
		url: this.params.apiPath + "chartapi/saveimage",
		dataType: "json",
		data: {
			json: canvasB64
		},
		complete: function(resultIn){

			var result = self.parseDebugInfo(resultIn.responseText);

			if (result && result.Id){

				window.location = self.params.apiPath + "chartapi/loadimage/" + result.Id + "?download=true&remove=true";

			} else {

				window.alert("An error occurred.\n\n" + JSON.stringify(result));
			}

		}
	});
};

Modcharts.prototype.renderErrorData = function(msg) {

	$(this.rootModchart.node()).html(msg);
};

/**
 * grab arbitrary GET value from querystring
 * @method getParameterByName
 * @param {string} name
 * @return {string}
 */
Modcharts.prototype.getParameterByName = function(name) {

	var match = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
	return match && decodeURIComponent(match[1].replace(/\+/g, " "));
};

/**
 * update any component with a dynamic size
 * @method resize
 */
Modcharts.prototype.resize = function() {

	this.concealCrosshairs();

	if (!this.params.size){ // stretch to full element dimensions if no size specified

		var w0 = $(this.rootModchart.node()).width(),
			h0 = $(this.rootModchart.node()).height();

		this.rootMouse.style("width", w0 + "px");
		this.rootMouse.style("height", h0 + "px");

		this.size.width = w0;
		this.size.height = h0;

		this.zoom.size([w0, h0]);
	}

	this.combineXAxes();

	this.eachPanel(function(panel){

		panel.resize();

	});

	if (!this.state.resizePanel){

		this.unregisterZoom();
		this.updateZoom();
		this.registerZoom();
	}

	// optional callback
	if (this.onResizeCallback){
		this.onResizeCallback();
	}
};

/**
 * filter main dataset by current timerange
 * update all panel scales against primary scale
 * render panels
 * @method render
 */
Modcharts.prototype.render = function() {

	if (!this.panels.length) { /*this.warn("No panels to render");*/ return; }
	if (!this.dataPrimary) { /*this.warn("No data available to panels");*/ return; }
	if (!this.exchangeDates || !this.exchangeDates.length) { /*this.warn("No exchange dates");*/ return; }

	// get min/max idx for data itself (not dates)
	var panel, domain, left, right,
		data = (this.params.customData) ? this.getCustomFrameData() : this.getFrameData();

	// update panels x domain / ranges
	this.normalizePanelDomains();

	// update panels y domain / range
	for (var i = 0, iLen = this.panels.length; i < iLen; i++) {

		panel = this.panels[i];

		if (panel.params.yAxisRange && panel.params.yAxisRange.length === 2){

			// user-specified yaxis domain
			domain = {
				min: panel.params.yAxisRange[0],
				max: panel.params.yAxisRange[1]
			};

		} else {

			// get min/max values for every indicator in filtered set
			domain = (this.params.customData) ? panel.getCustomDataRange(data) : panel.getDataRange(data);

		}

		left = panel.size.padding.left;
		right = left + panel.size.width;

		// set all xScales to the primary xScale
		panel.xAxis.scale[0]
			.range([left, right]);

		// only apply .nice() if domain doesn't intersect 0
		if (domain.max !== 0 && domain.min !== 0){

			var rangeMin = panel.size.padding.top,
				rangeMax = panel.size.padding.top + panel.size.height;

			// altering the scale's bottom range is the best way to enforce bottom yaxis padding on log scales.
			// (linear scales will be done by expanding the actual domain in getDataRange)
			if (i === 0 && panel.core.params.yAxisScale === "log"){
				rangeMax -=panel.params.style.yaxisPaddingBottom;
			}

			panel.yAxis.scale[0]
				.nice()
				.domain([domain.max,domain.min])
				.range([rangeMin, rangeMax]);

		} else {

			panel.yAxis.scale[0]
				.domain([domain.max,domain.min])
				.range([panel.size.padding.top, panel.size.padding.top + panel.size.height]);
		}
	}

	// generate subset of labels to draw
	var filteredLabels = this.panels[0].xAxis.labeler.filterLabels();

	this.clearPanels();

	// render holiday/lunch labels
	if (this.state.isIntraday && this.params.showLunchBreakLabels && this.panels.length){
		this.panels[0].renderLunchBreaks(data);
	}

	// render panels
	for (i = 0; i < iLen; i++) {
		this.panels[i].render(data, filteredLabels);
	}

	// render callback
	if (this.onRenderCallback){
		this.onRenderCallback(panel.xAxis.scale[0].domain());
	}

	// store data subset for quick lookups later (crosshair uses this)
	if (data[this.params.symbol] && data[this.params.symbol].price) {
		this.dataFrame = this.getFirstDataset(data[this.params.symbol].price);
	}
};

/**
 * wrapping the render in a requestAnimationFrame or 0ms setTimeout
 */
Modcharts.prototype.renderQueue = function() {

	var self = this;

	if (this.isFirefox){

		// firefox seems more responsive with a setTimeout here.
		window.clearTimeout(this.renderQueueId);

		this.renderQueueId = window.setTimeout(function(){
			self.render();
		},0);

	} else if(window.requestAnimationFrame){

		window.requestAnimationFrame(function(){ self.render(); });

	} else {

		this.render();
	}
};

/**
 * old method name for backward compatibility
 */
Modcharts.prototype.renderFrame = function() {
	this.warn("The \"renderFrame\" method is deprecated.  Please use \"render\" or \"renderQueue\".");
	return this.render(arguments);
};

/**
 * run a callback on each panel
 * @method eachPanel
 * @param {Function} fn
 */
Modcharts.prototype.eachPanel = function(fn) {

	for (var panelIdx=0; panelIdx < this.panels.length; panelIdx++){

		var fnContinue = fn(this.panels[panelIdx], panelIdx);

		if (fnContinue === false){
			break;
		}
	}
};

/**
 * delete all panels from panels collection
 * @method removePanels
 * @param {Function} fn
 */
Modcharts.prototype.removePanels = function() {

	var self = this;

	for (var i = this.panels.length - 1; i >= 0; i--) {
		self.removePanel(this.panels[i]);
	}
};

/**
 * clear all panel canvases
 * @method clearPanels
 */
Modcharts.prototype.clearPanels = function() {

	this.eachPanel(function(panel){
		panel.clearPanel();
	});
};

/**
 * @method concealLegends
 */
Modcharts.prototype.concealLegends = function() {

	this.eachPanel(function(panel){
		panel.concealLegend();
	});
};

/**
 * @method revealLegends
 */
Modcharts.prototype.revealLegends = function() {

	this.eachPanel(function(panel){
		panel.revealLegend();
	});
};

/**
 * this is a somewhat experimental feature to export SVG priceline vector shapes to be imported into Illustrator.
 * @method exportSVG
 */
Modcharts.prototype.exportSVG = function(viewOnly) {

	try{

		var panel = this.panels[0],
			filtered = this.getFrameData(),
			style = panel.indicators[0].params.style,
			coords = panel.indicators[0].getLineCoords(
				panel.indicators[0].getDataMap(this.getFirstDataset(filtered[this.params.symbol].price))
			);

		var lineFunction = d3.svg.line()
			.x(function(d) { return d[0]; })
			.y(function(d) { return d[1]; })
			.interpolate("linear");

		var svg = ["<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" width=\"" + panel.size.width + "\" height=\"" + panel.size.height+30 + "\">"];

		svg.push("<path d=\"" + lineFunction(coords) + "\" stroke=\""+style.lineColor+"\" stroke-width=\""+style.lineWidth+"\" fill=\"none\" />");
		svg.push("<g>");

		var row = 0,
			frameDateLabels = this.panels[0].xAxis.labeler.filterLabels();

		for (var i in frameDateLabels) { if (frameDateLabels.hasOwnProperty(i)){

			if (frameDateLabels[i].length){

				for (var x = 0; x < frameDateLabels[i].length; x++){

					var label = frameDateLabels[i][x];

					svg.push("<text x=\""+label.x0+"\" y=\""+(panel.size.height+(row*15))+"\" font-family=\""+this.panels[0].params.style.axisFontFamily+"\" font-size=\""+this.panels[0].params.style.axisFontSize+"\" fill=\"black\" >"+((row === 1 && x === 0) ? label.format["alt"] || label.format["default"] : label.format["default"])+"</text>");
				}

				row++;
			}
		}}

		svg.push("</g>");
		svg.push("</svg>");

		console.log("svg",svg.join(""));

		var url = "data:image/svg+xml;utf8," + encodeURIComponent(svg.join(""));

		if (viewOnly){

			window.location = url;

		} else {

			var link = document.createElement("a");
				link.download = "Chart Export " + new Date().toString().replace(/GMT.*/,"") + ".svg";
				link.href = url;
				link.click();
		}

	} catch(e){

		window.alert("An error has occurred.\n"+e.message);

	}
};

/**
 * save all customized chart params to a portable JSON string
 * @method save
 * @return {string}
 */
Modcharts.prototype.save = function(noStore, name) {

	var chartParams = $.extend(true, {}, this.params),
		save = {
			params: chartParams,
			panels: [],
			metaData: {}
		},
		saveParams = {},
		ind = {},
		skipIndicatorParams = ["description"], // don't save these indicator params
		skipIndicators = ["horizontalannotation"]; // don't save these indicators

	// saved panels
	for (var p = 0; p < this.panels.length; p++) {

		var newPanel = {
			params: $.extend(true, {}, this.panels[p].params),
			indicators: [],
			tools: [],
			events: [],
			size: {}
		};

		// saved indicators
		for (var i=0; i < this.panels[p].indicators.length; i++) {

			ind = this.panels[p].indicators[i];

			// don't save certain indicators // see NXC-581
			if ($.inArray(ind.params.id, skipIndicators) !== -1){
				continue;
			}

			saveParams = {};

			$.each(ind.params, function(key, value){

				if (value === null){

					return true;

				} else if (typeof value === "object"){

					if (value.length){

						saveParams[key] = $.extend(true, [], value);

					} else {

						saveParams[key] = $.extend(true, {}, value);
					}

				} else if ($.inArray(key, skipIndicatorParams) === -1){

					saveParams[key] = value;
				}

			});

			newPanel.indicators.push(saveParams);
		}

		// saved tools & handles
		for (var t=0; t < this.panels[p].tools.length; t++) {

			var handles = [],
				thisHandle = this.panels[p].tools[t].handle;

			for (var h = 0; h < thisHandle.length; h++) {

				if (typeof thisHandle[h].params.pairedHandle === "number"){

					// some tools (text) use a paired handle
					handles.push({
						pairedHandle: thisHandle[h].params.pairedHandle,
						pairedOffsetX: thisHandle[h].params.pairedOffsetX,
						pairedOffsetY: thisHandle[h].params.pairedOffsetY
					});

				} else {

					// default tool handle
					handles.push({
						date: thisHandle[h].params.date,
						value: thisHandle[h].params.value
					});
				}
			}

			var newTool = {
				params: $.extend(true, {}, this.panels[p].tools[t].params),
				handle: handles
			};

			// encode text tool values (notably "+" characters)
			if (newTool.params.id === "text"){
				newTool.params.value = encodeURIComponent(newTool.params.value);
			}

			newPanel.tools.push(newTool);

		}

		// saved events
		for (var e=0; e < this.panels[p].events.length; e++) {

			var eventParams = this.panels[p].events[e].params;

			if (eventParams.id !== "custom"){

				newPanel.events.push({
					params: eventParams
				});

			}
		}

		// heightPct
		if (typeof this.panels[p].size.heightPct === "number"){
			newPanel.params.size.heightPct = this.panels[p].size.heightPct;
		}

		save.panels.push(newPanel);
	}

	// meta data
	save.metaData = $.extend(true, {}, this.metaData);

	//console.log(JSON.stringify(save));

	if (!noStore){

		this.saveData(save, name);
	}

	return save;
};

Modcharts.prototype.saveData = function(save, name){

	var message = window.escape(JSON.stringify(save)),
		self = this;

	if (!name){
		name = "Saved chart";
	}

	name = encodeURIComponent(name);

	if (this.isIE9 && this.params.useProxyAction){

		// ie9 on different domain must make xhr request via proxy iframe
		this.getProxyAction("save", {"json":message, "name":name});

	} else {

		d3.xhr(this.params.apiPath + "ChartApi/Save")
			.header("Content-Type","application/x-www-form-urlencoded")
			.header("Authorization", this.state.authToken ? "Bearer " + this.state.authToken : null)
			.response(function(xhr){

				return self.parseDebugInfo(xhr.responseText);

			})
			.send("POST", "name=" + name + "&json=" + message, function(error, saved){

				if (self.onSaveCompleteCallback){

					self.onSaveCompleteCallback(saved.Id, save);

				} else {

					var windowOrigin = self.getWindowOrigin();

					window.prompt("The shared chart is now available at the following location:", windowOrigin + window.location.pathname + "?saved=" + saved.Id);

				}
			});
	}
};

Modcharts.prototype.saveTemplateData = function(save, name){

	var message = window.escape(JSON.stringify(save)),
		self = this;

	if (!name){
		name = "Saved template";
	}

	name = encodeURIComponent(name);

	if (this.isIE9 && this.params.useProxyAction){

		// ie9 on different domain must make xhr request via proxy iframe
		this.getProxyAction("savetemplate", {"json":message, "name":name});

	} else {

		d3.xhr(this.params.apiPath + "ChartApi/SaveTemplate")
			.header("Content-Type","application/x-www-form-urlencoded")
			.header("Authorization", this.state.authToken ? "Bearer " + this.state.authToken : null)
			.response(function(xhr){

				return self.parseDebugInfo(xhr.responseText);

			})
			.send("POST", "name=" + name + "&json=" + message, function(error, saved){

				if (self.onSaveTemplateCompleteCallback){

					self.onSaveTemplateCompleteCallback(saved.Id, save);

				} else {

					window.alert("Template saved. " + saved.Id);

				}
			});
	}
};

/**
 * save chart template
 */
Modcharts.prototype.saveTemplate = function(name, args) {

	var saveData = this.save(true),
		self = this,
		skipIndicators = ["horizontalannotation"],
		panelStyle = {};

	if (!args){
		args = {};
	}

	// only save selected params
	var templateParams = {
		dataInterval: saveData.params.dataInterval,
		dataPeriod: saveData.params.dataPeriod,
		symbolCompare: saveData.params.symbolCompare,
		panelHeightUpper: saveData.params.panelHeightUpper,
		panelHeightLower: saveData.params.panelHeightLower,
		yAxisScale: saveData.params.yAxisScale
	};

	// save either date range or days
	if (saveData.params.dateStart && saveData.params.dateStop){

		templateParams.dateStart = new Date(saveData.params.dateStart);
		templateParams.dateStop = new Date(saveData.params.dateStop);

	} else if (saveData.params.days){

		templateParams.days = saveData.params.days;
	}

	saveData.params = {};

	// meta data
	saveData.metaData = $.extend(true, {}, this.metaData);

	// templateParams
	$.each(templateParams, function(param){

		saveData.params[param] = this;
	});

	// panels
	$.each(saveData.panels, function(){

		if (args.panelStyles === "all"){

			// save all panel styles (useful if chart was not relying on CSS for styling)
			panelStyle = $.extend(true, {}, this.params.style);

		} else {

			// only save selected panel styles
			panelStyle = {
				yaxisPaddingBottom: this.params.style.yaxisPaddingBottom,
				yaxisPaddingTop: this.params.style.yaxisPaddingTop
			};
		}

		this.params.style = panelStyle;

		// set (only) primary symbol params to -1 so they will be dynamic when loadTemplate is called.
		// non-primary symbols will be retained as comparisons. (see NXC-566)
		for (var x = this.indicators.length - 1; x >= 0; x--){

			// don't save certain indicators
			if ($.inArray(this.indicators[x].id, skipIndicators) !== -1){
				this.indicators.splice(x, 1);
				continue;
			}

			if (this.indicators[x].symbol === self.params.symbol){
				this.indicators[x].symbol = -1;
			}

		}

		// don't save tools on templates
		delete this.tools;

	});

	//console.log("saved template data",data);

	this.saveTemplateData(saveData, name);
};

Modcharts.prototype.loadSaved = function(id) {

	var self = this;
	this.showMessage("Loading " + id + "...");

	this.exchangeDates = [];

	if (this.isIE9 && this.params.useProxyAction){

		// ie9 on different domain must make xhr request via proxy iframe
		this.getProxyAction("load", {"id":id});

	} else {

		d3.xhr(this.params.apiPath + "chartapi/load/" + id)
			.header("Content-Type", "application/json")
			.header("Authorization", this.state.authToken ? "Bearer " + this.state.authToken : null)
			.response(function(xhr){

				return self.parseDebugInfo(xhr.responseText);

			})
			.send("POST", function(error, data){

				return self.load(window.unescape(data).replace(/&quot;/g,"\""));

			});
	}
};

Modcharts.prototype.loadTemplate = function(id, args) {

	var self = this;
	//this.showMessage("Loading template " + id + "...");

	if (this.isIE9 && this.params.useProxyAction){

		// ie9 on different domain must make xhr request via proxy iframe
		this.getProxyAction("loadtemplate", {"id":id});

	} else {

		d3.xhr(this.params.apiPath + "chartapi/loadtemplate/" + id)
			.header("Content-Type", "application/json")
			.header("Authorization", this.state.authToken ? "Bearer " + this.state.authToken : null)
			.response(function(xhr){

				return self.parseDebugInfo(xhr.responseText);

			})
			.send("POST", function(error, data){

				if (!data || !/params/.test(data)){

					self.showMessageChartNotAvailable("Saved template not available");

				} else {

					self.loadingStart();

					data = JSON.parse(window.unescape(data).replace(/&quot;/g,"\""));

					self.applyTemplate(data, args);

					if (self.onLoadTemplateCompleteCallback){

						self.onLoadTemplateCompleteCallback(id, data, args);
					}

					self.loadData();
				}

			});
	}
};

Modcharts.prototype.applyTemplate = function(data, args) {

	var eventParams, self = this;

	args = args || {};

	$.each(data.params || {}, function(param){
		self.params[param] = this;
	});

	this.params.dateStart = (data.params.dateStart) ? new Date(data.params.dateStart) : null;
	this.params.dateStop = (data.params.dateStop) ? new Date(data.params.dateStop) : null;

	self.removePanels();

	$.each(data.panels, function(){

		// if panelParams was passed in, merge it into new panel params.
		var panelParams = $.extend(true, this.params, args.panelParams || {}),
			panel = self.addPanel(panelParams);

		// restore indicators
		$.each(this.indicators, function(){

			// symbols of -1 were previously the primary symbol - replace with the current primary symbol
			if (this.symbol === -1){
				this.symbol = self.params.symbol;
			}

			panel.addIndicator(this.id, this);

		});

		// restore events
		for (var i = 0; i < (this.events || []).length; i++) {

			eventParams = this.events[i].params;
			panel.addEvent(this.events[i].id || eventParams.id, eventParams || {});
		}
	});

	// scale
	if (this.panels.length && this.params.yAxisScale){
		this.panels[0].setScale(this.params.yAxisScale);
	}

	// restore metadata
	if (data.metaData){
		this.metaData = $.extend(true, {}, data.metaData);
	}
};

/**
 * load a previously-saved chart via JSON string
 * @method load
 * @params {string} json
 * @return {Modcharts}
 */
Modcharts.prototype.load = function(json, callback, args){

	var self = this,
		savedChart = $.extend(true, {}, (typeof json === "string") ? $.parseJSON(json) : json),
		savedTool,
		tool,
		panel,
		savedPanel,
		indicators,
		tools;

	if (!args){

		args = { loadData: true };
	}

	if (!savedChart.params){
		this.showMessageChartNotAvailable("Saved chart not available");
		return;
	}

	this.removePanels();
	this.params = this.getDefaultParams(savedChart.params || {});

	// convert dateStart/Stop back to date object
	if (this.params.dateStart){
		this.params.dateStart = new Date(this.params.dateStart);
	}

	if (this.params.dateStop){
		this.params.dateStop = new Date(this.params.dateStop);
	}

	// restore panels
	for (var p = 0; p < savedChart.panels.length; p++) {

		savedPanel = savedChart.panels[p];
		panel = this.addPanel(savedPanel.params || {});

		// scale
		if (p === 0 && this.params.yAxisScale){
			panel.setScale(this.params.yAxisScale);
		}

		// restore indicators
		indicators = [];

		for (var i = 0; i < savedPanel.indicators.length; i++) {
			indicators.push($.extend(true, {}, savedPanel.indicators[i]));
		}

		panel.addIndicators(indicators);

		// restore tools
		tools = [];

		for (var t = 0; t < (savedPanel.tools || []).length; t++) {

			savedTool = savedPanel.tools[t];

			switch(savedTool.params.id){

				case "line" : { tool = new Modcharts.LineTool(); break; }
				case "ray" : { tool = new Modcharts.RayLineTool(); break; }
				case "arrow" : { tool = new Modcharts.ArrowLineTool(); break; }
				case "extended" : { tool = new Modcharts.ExtendedLineTool(); break; }
				case "horizontal" : { tool = new Modcharts.HorizontalLineTool(); break; }
				case "fibonacci" : { tool = new Modcharts.FibonacciLineTool(); break; }
				case "ellipse" : { tool = new Modcharts.EllipseLineTool(); break; }
				case "fibarc" : { tool = new Modcharts.FibArcTool(); break; }
				case "fibcircle" : { tool = new Modcharts.FibCircleTool(); break; }
				case "gannfan" : { tool = new Modcharts.GannFanLineTool(); break; }
				case "rect" : { tool = new Modcharts.RectLineTool(); break; }
				case "text" : { tool = new Modcharts.TextTool(); break; }
			}

			tool.init(panel, savedTool.params);

			for (var h=0; h < savedTool.handle.length; h++){

				tool.handle.push(new Modcharts.Handle(tool, {
					date: savedTool.handle[h].date,
					value: savedTool.handle[h].value,
					pairedHandle: savedTool.handle[h].pairedHandle,
					pairedOffsetX: savedTool.handle[h].pairedOffsetX,
					pairedOffsetY: savedTool.handle[h].pairedOffsetY
				}));

			}

			panel.tools.push(tool);

			tools.push($.extend(true, {}, savedPanel.tools[t]));
		}

		// restore events
		for (i = 0; i < (savedPanel.events || []).length; i++) {

			var eventParams = savedPanel.events[i].params;
			panel.addEvent(savedPanel.events[i].id || eventParams.id, eventParams || {});
		}
	}

	// restore metadata
	if (savedChart.metaData){
		this.metaData = $.extend(true, {}, savedChart.metaData);
	}

	if (args.loadData){

		if (this.params.customData){
			self.loadCustomData(callback, {loadSaved: true});
		} else {
			self.loadData(callback, {loadSaved: true});
		}
	}

	return this;
};

/**
 * Override this method locally to do something after load is complete
 * @method onLoadComplete
 */
Modcharts.prototype.onLoadComplete = function(args) {

	return args;
};

/**
 * console shim
 */
(function () {
    var f = function () {};
    if (!window.console) {
        window.console = {
            log:f, info:f, warn:f, debug:f, error:f
        };
    }
}());

/**
 * http://javascript.crockford.com/remedial.html
 * @method supplant
 */
Modcharts.prototype.supplant = function(str, args) {

	return str.replace(
		/\{([^{}]*)\}/g,
		function (a, b) {
			var r = args[b];
			return typeof r === "string" || typeof r === "number" ? r : a;
		}
	);
};

/**
 * return the number of trading days within calendar date range based on the exchangeDates ruler
 */
Modcharts.prototype.getTradingDays = function(dateStart, dateStop){

	var idxStart = this.closestExchangeIndex(dateStart),
		idxStop = this.closestExchangeIndex(dateStop),
		idx = idxStart,
		days = this.state.isIntraday ? 0 : 1,
		thisDay = new Date(),
		currDay = new Date(this.exchangeDates[idx]).getDate();

	while(idx <= idxStop) {

		thisDay = new Date(this.exchangeDates[idx++]).getDate();

		if (currDay !== thisDay){
			days++;
			currDay = thisDay;
		}
	}

	return Math.max(days, 1);
};

/**
 * return the number days in the year to date
 */
Modcharts.prototype.getYTDDays = function(){

	var date = new Date(),
		jan = new Date(date.getFullYear(), 0, 1);

	return Math.ceil((date - jan) / 1000 / 60 / 60 / 24);
};

/**
 * begin polling - pass pollMin of 0 to turn off poll
 * @method pollData
 */
Modcharts.prototype.pollData = function(pollMin) {

	var self = this;

	if (!pollMin){

		pollMin = this.params.poll;

	} else {

		this.params.poll = pollMin;

	}

	if (this.state.pollTimeout){

		window.clearTimeout(this.state.pollTimeout);
		this.state.pollTimeout = null;

	}

	if (pollMin > 0){

		this.state.pollTimeout = window.setTimeout(function(){

			// don't poll while suppressed - try again after next poll interval
			if (self.suppressPollData()){

				// short delay before retry
				window.setTimeout(function(){

					return self.pollData();

				}, 3000);

			} else {

				// load new data
				self.loadData(

					function(){

						// resume polling after data load completes
						self.pollData();

						// if an intraday chart is left up overnight we could potentially blow away the previous
						// days' data with the first poll on the new day.  so add a backfill check here.
						if (self.params.days < self.LIMIT_INTRADAY_DAYS){
							self.backfillData();
						}

					}, { silent:true }
				);
			}

		}, pollMin * 60 * 1000);
	}
};

/**
 * detect whether to suppress polling at this moment
 * @method suppressPollData
 */
Modcharts.prototype.suppressPollData = function() {

	// don't poll for data while in the middle of loading data, resizing panels, or drawing tools
	// also wait 1000ms after last zoom to make sure mousewheel is done firing

	if (this.state.zooming){

		return true;

	} else if (this.dataXHR){

		return true;

	} else if (typeof this.state.zoomDate === "number" && new Date() - this.state.zoomDate < 1000){

		return true;

	} else if (this.state.toolmode){

		return true;

	} else if (this.state.resizePanel){

		return true;

	}

	return false;
};

/**
 * make an XHR request for chart data and process it into a standardized data structure.
 * typically this will be a request to <api domain>/ChartApi/DataSeries but it can support other calls as well
 * @method loadData
 */
Modcharts.prototype.loadData = function(callback, args) {

	var self = this,
		url = this.params.chartAPI,
		limitIntradayMs = this.LIMIT_INTRADAY_DAYS * 1000 * 60 * 60 * 24,
		isYTD = this.params.days === -1;

	if (!args) {
		args = {};
	}

	if (this.dataXHR){
		this.dataXHR.abort();
	}

	// enforce linear scale on normalized charts
	if (this.params.yAxisScale === "log" && this.panels.length && this.panels[0].isNormalized()){
		this.panels[0].setScale("linear");
	}

	// show loading graphic and reset notable vars
	if (!args.silent) {

		this.concealCrosshairs();

		this.loadingStart();

		// a fresh data request should clear out the normalizedate.
		if (!args.prepend && !args.silent) {
			this.params.normalizeDate = null;
			this.params.normalizeValue = null;
			this.params.normalizeValues = null;
			this.exchangeDates = [];
		}
	}

	// set days for YTD charts
	if (isYTD) {

		this.params.days = this.getYTDDays();
	}

	// determine state.isIntraday
	if (this.params.days){

		this.state.isIntraday = this.params.days * 1000 * 60 * 60 * 24 <= limitIntradayMs;

	} else if (this.params.dateStart && this.params.dateStop){

		this.state.isIntraday = /Hour|Minute/.test(this.params.dataPeriod); // new Date() - this.params.dateStart <= limitIntradayMs;

	} else if (this.dataPrimary && this.dataPrimary.length){

		this.state.isIntraday = new Date() - this.dataPrimary[0].date <= limitIntradayMs && this.dataPrimary[this.dataPrimary.length - 1].date - this.dataPrimary[0].date <= limitIntradayMs;
	}

	var inputs = this.getChartAPIInputs(args);

	if (/\.json$/.test(url)){

		d3.json(url)
			.get(JSON.stringify(inputs), function(error, data){
				return self.processChartAPIResponse(data, error, callback);
			});

	} else {

		var debugInfo = this.getParameterByName("..showdebuginfo.."),
			noCache = this.getParameterByName("..nocache.."),
			kvp = [];

		if (debugInfo && debugInfo.length){
			kvp.push("..showdebuginfo..=" + debugInfo);
		}

		if (noCache && noCache.length){
			kvp.push("..nocache..=" + noCache);
		}

		if (kvp.length){
			url += "?" + kvp.join("&");
		}

		if (this.isIE9 && this.params.useProxyAction){

			// ie9 on different domain must make xhr request via proxy iframe
			if (this.params.apiSeries === "chartapi/series"){
				this.getProxyAction(this.params.apiSeries, inputs, args);
			} else {
				this.getProxyAction("series", inputs, args);
			}

		} else {

			self.dataXHR = d3.xhr(url)
				.header("Content-Type", "application/json")
				.header("Authorization", this.state.authToken && !this.state.accessToken ? "Bearer " + this.state.authToken : null)
				.header("X-MOD-ACCESS-TOKEN", this.state.accessToken || null)
				.on("beforesend", function(request) {
					if (self.params.xhrWithCredentials){
						request.withCredentials = true;
					}
				})
				.response(function(xhr){

					return self.parseDebugInfo(xhr.responseText);
				})
				.send("post", JSON.stringify(inputs), function ModchartsLoadDataXHRCallback(errorXHR, data){

					var error = null;

					if (errorXHR){

						error = {
							responseText: self.parseDebugInfo(errorXHR.responseText),
							status: errorXHR.status,
							statusText: errorXHR.statusText,
							responseType: errorXHR.responseType
						};
					}

					self.dataXHR = null;

					return self.processChartAPIResponse(data, error, callback, args);

				});
		}
	}

	if (isYTD) {

		this.params.days = -1;
	}
};

/**
 * split off the debuginfo part of response, add it to dom so it fires the debug popup,
 * then return just the json part of the response
 * @method parseDebugInfo
 */
Modcharts.prototype.parseDebugInfo = function(text){

	var rows = (text || "").split("\n"),
		json = {};

	try {
		json = JSON.parse(rows.shift());
	} catch(e){}

	if (rows.length){

		if (!$("#debuginfo-container").length){
			$("body").append("<div id=\"debuginfo-container\"/>");
		}

		$("#debuginfo-container").empty();

		var flat = rows.join("\n");

		if (!/^<script/.test(rows[0])){
			flat = "<script>" + flat + "</script>";
		}

		// switch to different debug.js location if we're a NodeJS site
		if (typeof window.Debug !== "undefined" && /index\.html/.test(window.Debug.url || "")){
			flat = flat.replace("/includes/Jslib/WSDOM/Debug/debug.js","/includes/showdebuginfo/debug.js");
		}

		try{
			$(flat).appendTo("#debuginfo-container");
		} catch(e){
			this.warn(e.message);
		}
	}

	return json;
};

/**
 * similar to loadData except it doesn't do an ajax request as it already has data.
 * initialize some variables and kick off the processCustomResponse call.
 * @method loadCustomData
 */
Modcharts.prototype.loadCustomData = function(callback, args) {

	if (!args) {
		args = {};
	}

	// show loading graphic and reset notable vars

	this.concealCrosshairs();

	this.loadingStart();

	this.exchangeDates = [];

	// determine state.isIntraday
	this.state.isIntraday = false;

	return this.processCustomResponse(this.params.customData, callback);
};

/**
 * this method determines the proper new domain to use.
 * by default the domain will stretch to the full dataset width.
 */
Modcharts.prototype.getDefaultDomain = function() {

	var left = 0, right = 0, primary = this.dataPrimary, dist = 0, panelDomain = this.panels[0].xAxis.scale[0].domain();

	// if we found a saved dateStart and dateStop with no domain, try to use it (saved charts)
	// else use existing domain if neq [0,0]
	// else default to full range of loaded dataset
	if (this.params.dateStart && this.params.dateStop && panelDomain[1] - panelDomain[0] === 0){

		left = this.closestExchangeIndex(new Date(this.params.dateStart));
		right = this.closestExchangeIndex(new Date(this.params.dateStop));

		// same left/right domain
		if (right - left === 0) {

			// valid domain (ex: [45,45]), but the stop must at least be +1 start
			if (left !== 0 && right !== 0 && left < this.exchangeDates.length - 1){

				right = left + 1;

			} else {

				// domain wasn't valid or [0,0]
				// fall back to full dataset range instead
				left = this.closestExchangeIndex(primary[0].date);
				right = this.closestExchangeIndex(primary[primary.length - 1].date);
			}
		}

	} else {

		// attempt to use existing domain
		var domain = this.panels[0].xAxis.scale[0].domain(),
			isMarkerAdjusted = this.isMarkerDomainAdjusted();

		// if domain is valid (not [0,0])
		if (domain && domain[1] - domain[0] > 0){

			left = Math.max(0, domain[0]);
			right = Math.min(this.exchangeDates.length - 1, domain[1]);

			// don't do domain adjustment if we have an exact domain already
			isMarkerAdjusted = false;

		} else if (this.params.days && this.params.days <= this.LIMIT_INTRADAY_DAYS && this.state.typicalSessions){

			// intraday charts should begin at the session start time (eg 9:30)
			// and end at the session stop time (eg. 16:00)

			// start on open/close days
			var typicalOpen = new Date(primary[0].date),
				typicalClose = new Date(primary[primary.length - 1].date),
				exchangeId = this.xref[this.params.symbol].exchangeId;

			// snap to first session open
			typicalOpen.setHours(0);
			typicalOpen.setSeconds(0);
			typicalOpen.setMilliseconds(0);
			typicalOpen.setMinutes(this.state.typicalSessions.min);

			// if primary session crossed into previous day, add a day (see symbols such as 1045492 and 1070572)
			if (this.state.typicalSessions.rulerSessions[exchangeId].open < 0){
				typicalOpen.setDate(typicalOpen.getDate() + 1);
			}

			// snap to last session close
			typicalClose.setHours(0);
			typicalClose.setSeconds(0);
			typicalClose.setMilliseconds(0);
			typicalClose.setMinutes(this.state.typicalSessions.max);

			left = this.closestExchangeIndex(typicalOpen);
			right = this.closestExchangeIndex(typicalClose);

		} else if (this.params.days && this.params.days > this.LIMIT_INTRADAY_DAYS){

			// "cinch" x-axis to available data
			left = this.closestExchangeIndex(primary[0].date);
			right = this.closestExchangeIndex(primary[primary.length - 1].date);

			// no cinching - set XAxis to exact params.days range
			/*
			left = this.closestExchangeIndex(new Date(new Date() - (1000 * 60 * 60 * 24 * this.params.days)));
			right = this.closestExchangeIndex(new Date());
			*/

		} else {

			// fall back to full dataset range instead with extra padding
			left = Math.max(0, this.closestExchangeIndex(primary[0].date) - 1);
			right = Math.min(this.closestExchangeIndex(primary[primary.length - 1].date) + 1, this.exchangeDates.length - 1);
		}

		// pad the left/right domain if we have a candle/ohlc/bar marker to prevent marker cropping
		if (isMarkerAdjusted){

			dist = (this.params.days > this.LIMIT_INTRADAY_DAY && this.params.days < 100) ? 0.5 : 1;

			if (this.state.isIntraday){

				right += dist;

			} else {

				left -= dist;
				right += dist;
			}
		}
	}

	return [left, right];
};

Modcharts.prototype.getFirstValid = function(data, column) {

	for (var x=0, xLen = data.length; x < xLen; x++){
		if (data[x][column] !== undefined){
			//console.log("first valid was ", x, data[x][column]);
			return x;
		}
	}
};

/**
 * return first dataset available
 */
Modcharts.prototype.getFirstDataset = function(data) {

	for (var x in data){ if (data.hasOwnProperty(x)){

		return data[x];
	}}
};

/**
 * returns a new uid for use in disambiguating chartapi elements
 * @method getIndicatorUId
 * @returns {string}
 */
Modcharts.prototype.getIndicatorUID = function(){

	return this.getUID();
};

/**
 * returns a random 8-char id
 * @method getUID
 * @returns {string}
 */
Modcharts.prototype.getUID = function(){

	var uid = [];

	for (var x=0; x < 8; x++){
		uid.push((Math.random()*16|0).toString(16));
	}

	return uid.join("");
};

/**
 * search panels for indicator uid ("9ffeb4e", "7ac3c3a")
 */
Modcharts.prototype.getIndicatorByUID = function(uid){

	var indicator;

	this.eachPanel(function(panel){

		for (var x=0; x < panel.indicators.length; x++){

			if (!indicator && uid === panel.indicators[x].params.uid){

				indicator = panel.indicators[x];

			}
		}
	});

	return indicator;
};

/**
 * search panels for indicator id ("sma", "bollinger")
 */
Modcharts.prototype.getIndicatorsByID = function(id){

	var indicators = [];

	this.eachPanel(function(panel){

		for (var x=0; x < panel.indicators.length; x++){

			if (id === panel.indicators[x].params.id){

				indicators.push(panel.indicators[x]);

			}
		}
	});

	return indicators;
};

/**
 * search panels for tool uid ("9ffeb4e", "7ac3c3a")
 */
Modcharts.prototype.getToolByUID = function(uid){

	var tool;

	this.eachPanel(function(panel){

		for (var x=0; x < panel.tools.length; x++){

			if (!tool && uid === panel.tools[x].params.uid){

				tool = panel.tools[x];

			}
		}
	});

	return tool;
};

/**
 * search panels for event uid
 */
Modcharts.prototype.getEventByUID = function(uid){

	var eventObj;

	this.eachPanel(function(panel){

		for (var x=0; x < panel.events.length; x++){

			if (!eventObj && uid === panel.events[x].params.uid){

				eventObj = panel.events[x];

			}
		}
	});

	return eventObj;
};

/**
 * search panels for event datapoint uid
 */
Modcharts.prototype.getEventDatapointByUID = function(uid){

	var dataObj;

	this.eachPanel(function(panel){

		for (var x=0; x < panel.events.length; x++){

			if (panel.events[x].params.dataset){

				for (var d=0; d < panel.events[x].params.dataset.length; d++){

					if (uid === panel.events[x].params.dataset[d].uid){

						dataObj = panel.events[x].params.dataset[d];

					}
				}
			}
		}
	});

	return dataObj;
};

/**
 * convert a normalized (%) figure into its respective actual (requires the starting value)
 */
Modcharts.prototype.getActualFromNormalized = function(normalizedValue, normalizedStart){

	if (!normalizedStart && this.params.normalizeValues){
		normalizedStart = this.params.normalizeValues.Close;
	}

	if (!normalizedStart){
		return normalizedValue;
	}

	var val = normalizedStart * (1 + (normalizedValue / 100));
	val = Number(val.toFixed(2));

	return val;
};

/**
 * convert an actual figure ($) into its respective normalized value (requires the starting value)
 */
Modcharts.prototype.getNormalizedFromActual = function(value, normalizedStart){

	if (!normalizedStart && this.params.normalizeValues){
		normalizedStart = this.params.normalizeValues.Close;
	}

	if (!normalizedStart){
		return value;
	}

	return ((value - normalizedStart) / Math.abs(normalizedStart)) * 100;
};

/**
 * returns true if we have a bar-type marker (ohlc, candle, bar)
 * @method isMarkerDomainAdjusted
 * @returns {bool}
 */
Modcharts.prototype.isMarkerDomainAdjusted = function(){

	var isAdjusted = false;

	this.eachPanel(function(p){

		$.each(p.indicators, function(){

			if (/price|custom/.test(this.params.id) && /bar|candlestick|ohlc/.test(this.params.markerType)){

				isAdjusted = true;

			}
		});

		// break
		if (isAdjusted){ return false; }

	});

	return isAdjusted;
};

/**
 * given an indicator uid, return the symbol associated with it
 * if none, return the primary chart symbol
 * @method getSymbolByIndicatorUID
 * @returns {string}
 */
Modcharts.prototype.getSymbolByIndicatorUID = function(uid){

	var symbol = this.params.symbol;

	this.eachPanel(function(panel){

		for (var x=0; x < panel.indicators.length; x++){

			if (panel.indicators[x].params.symbol && panel.indicators[x].params.uid === uid){

				symbol = panel.indicators[x].params.symbol;
				return false;

			}
		}
	});

	return symbol;
};

/**
 * search panels for uid or id
 */
Modcharts.prototype.getPanelByUID = function(uid){

	var panelMatch;

	this.eachPanel(function(panel){

		if (panel.uid === uid || panel.id === uid) {

			panelMatch = panel;
			return false;
		}

	});

	return panelMatch;
};

/**
 * deprecated - search panels for id
 */
Modcharts.prototype.getPanelById = function(id){

	return this.getPanelByUID(id);
};

/**
 * define standard palette of contrasting colors primarly for use in comparison lines
 * @method getNewLineColor
 */
Modcharts.prototype.getNewLineColor = function(indicators){

	var color,
		colorCompare,
		isValid,
		indicator,
		index = 0,
		indicatorsCompare = (indicators || []).concat(this.panels.length ? this.panels[0].indicators : []);

	// search css for linecolors
	if (this.lineColors.length === 0){

		isValid = true;

		// grab any linecolors found in css
		while (isValid){

			color = this.getStyle(".modcharts-marker-linecolor-" + index++, "color");

			if (color && color.length){

				this.lineColors.push(color);

			} else {

				isValid = false;
			}
		}

		// default linecolors if none specified
		if (this.lineColors.length === 0){

			this.lineColors = ["#df9224", "#1a70c7", "#c71ac1", "#d4c521", "#1ac77c", "#7c24df"];
		}
	}

	// return next unused linecolor
	if (this.lineColors.length){

		for (var x=0; x < this.lineColors.length; x++){

			color = this.lineColors[x];
			isValid = true;

			for (var i=0; i < indicatorsCompare.length; i++){

				indicator = indicatorsCompare[i];
				colorCompare = (indicator.style)  ? indicator.style.lineColor : (indicator.params) ? indicator.params.style.lineColor : -1;

				if (color === colorCompare){
					isValid = false;
				}
			}

			if (isValid){
				return color;
			}
		}
	}

	// default color if nothing can be found
	return "#777";
};

Modcharts.prototype.setLineColors = function(lineColors){

	if (lineColors && lineColors.length){
		this.lineColors = $.extend([], lineColors);
	}
};

Modcharts.prototype.getRandomHexColor = function(){

	return "#"+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
};

/**
 * date index offset of dataset compared to global dataset
 * @method getDateOffset
 * @param {array} data
 * @param {array} dataGlobal
 * @return {int}
 */
Modcharts.prototype.getDateOffset = function(data, dataGlobal){

	for (var i = 0; i < dataGlobal.length; i++) {
		if (dataGlobal[i] >= data[0]){
			return i;
		}
	}

	return 0;
};

/**
 * add message to messages div
 * @method showMessage
 * @param {string} message
 */
Modcharts.prototype.showMessage = function(message){

	var el = $(this.rootModchart.node()).find(".modcharts-rootmessages"),
		isHTML = /</.test(message);

	// reveal parent element
	this.rootMessages.style("display","block");

	var html = isHTML ? message : "<div style=\"padding:50px;\">" + message + "</div>";

	el.html(html);
};

/**
 * add message to messages div
 * @method clearMessage
 * @param {string} message
 */
Modcharts.prototype.clearMessage = function(){

	var el = $(this.rootModchart.node()).find(".modcharts-rootmessages");

	// conceal parent element
	this.rootMessages.style("display","none");

	el.empty();
};

Modcharts.prototype.showMessageChartNotAvailable = function(msg){

	this.clearPanels();

	if (!msg){
		msg = "Chart not available";
	}

	this.setCursor("default");

	this.loadingStop();

	this.showMessage("<div class=\"modcharts-chartnotavailable\">"+msg+"</div>");
};

/**
 * lookup a wsodissue by ticker
 */
Modcharts.prototype.getWSODIssueByTicker = function(ticker) {

	for (var x in this.xref) {

		if (this.xref[x].ticker){
			if (this.xref[x].ticker === ticker || this.xref[x].ticker.toString().toUpperCase() === ticker.toString().toUpperCase()){
				return x;
			}
		}
	}
};

/**
 * Shallow merge object b into a
 * @param {object} a
 * @param {object} b
 * @return {object}
 */
Modcharts.merge = function(a,b){

	a = a || {};
	b = b || {};

	for (var attr in b){

		if (b.hasOwnProperty(attr)){

			if (typeof b[attr] === "object"){

				a[attr] = this.merge(a[attr], b[attr]);

			} else {
				a[attr] = b[attr];
			}
		}
	}

	return a;
};

Modcharts.Extend = function(subclassFn, superclassFn) {

	// copy anything that's directly attached to superclassFn,
	// sort of like static variables in C#

	for (var key in superclassFn) {
		if (superclassFn.hasOwnProperty(key)) {
			subclassFn[key] = superclassFn[key];
		}
	}

	// classic prototypal inheritance, without calling subClassFn's
	// constructor function, and including setting the constructor
	// property

	var P__ = function () { };
	P__.prototype = superclassFn.prototype;

	subclassFn.prototype = new P__();
	subclassFn.prototype.constructor = subclassFn;
	subclassFn.prototype.superclass = superclassFn;

};

/**
 * Tools are customizable chart widgets overlaid on the chart and sharing its coordinate space (on a separate canvas element)
 * @constructor
 * @class Tool
 */
Modcharts.Tool = function(){};

Modcharts.Tool.prototype.init = function(panel, params, handles){

	this.panel = panel;
	this.handle = handles || [];
	this.path = [];
	this.params = this.getParams(params);

	// state
	this.state = {
		inProgressHandle: false,
		selected: false,
		dragHandle: null
	};

};

/**
 * return merged params object
 * @return {object}
 */
Modcharts.Tool.prototype.getParams = function(paramsCustom) {

	var params = {
		name: "Chart Tool",
		id: "tool",
		uid: this.panel.core.getUID(),
		style: {}
	};

	// merge derived tool's default params into local params
	var paramsOut = $.extend(true, params, this.getDefaultParams());

	// merge in top-level custom style for this tool
	var customStyle = this.panel.core.getToolStyle(paramsOut.id);
	if (customStyle[paramsOut.id]){
		$.extend(true, paramsOut.style, customStyle[paramsOut.id]);
	}

	// merge in paramsCustom argument
	$.extend(true, paramsOut, paramsCustom);

	return paramsOut;

};

/**
 * return the default params for this type of tool
 * @return {object}
 */
Modcharts.Tool.prototype.getDefaultParams = function(){

	throw new Error("Required Tool method not found");

};

/**
 */
Modcharts.Tool.prototype.remove = function() {

	var self = this;

	$.each(this.panel.tools, function(idx, el){

		if (el === self) {

			self.panel.tools.splice(idx, 1);

			return false;
		}
	});

	this.panel.core.clearPanels();
	this.panel.core.render();
};

/**
 * Mousemove handler
 */
Modcharts.Tool.prototype.onMousemove = function(){

	throw new Error("Required Tool method not found");

};

/**
 * is within tool body
 */
Modcharts.Tool.prototype.isWithin = function(){

	return false;

};

/**
  *is within a tool handle?
 */
Modcharts.Tool.prototype.isWithinHandle = function(mousePanel){

	for (var h=0, hLen = this.handle.length; h < hLen; h++){

		if (this.handle[h].isWithin(mousePanel)){

			return this.handle[h];
		}
	}

	return false;

};

/**
 * Mousedown handler.  select the tool and/or begin dragging
 */
Modcharts.Tool.prototype.onMousedown = function(mouse){

	//console.log("Tool onMousedown");

	// loop through all handles to see if it was a mousedown on a handle or tool body
	// if so set this tool's draghandle to handle and select this tool

	var mousePanel = [mouse[0], mouse[1] - this.panel.size.top],
		handleWithin = this.isWithinHandle(mousePanel),
		isWithinTool = this.isWithin(mousePanel),
		core = this.panel.core;

	// if within a handle, begin the handle dragging process
	if (handleWithin){

		this.state.inProgressHandle = true;
		this.state.dragHandle = handleWithin;
		core.state.dragTool = null;

	} else if (isWithinTool){

		this.state.dragHandle = null;
		this.state.inProgressHandle = null;
		this.state.dragToolOrigin = [mousePanel[0], mousePanel[1]];
		this.state.handleOrigin = [this.handle[0].getCoords(), this.handle[1].getCoords()];
		core.state.dragTool = this;

	}

	// select the tool (and unselect others)
	if (handleWithin || isWithinTool){

		core.unregisterZoom(); // prevent zoom event from firing
		core.setToolMode(this.params.id);

		core.selectTool(this);

		// update handle colors immediately rather than waiting for mousemove
		this.panel.clearTools();
		this.panel.renderTools();

		core.onToolMousedown(this);

		return true;
	}
};

/**
 * Mouseup handler.  clear out drag states
 */
Modcharts.Tool.prototype.onMouseup = function(){

	//console.log("Tool onMouseup");
	this.panel.core.onToolMouseup(this);


	this.state.dragHandle = null;
	this.state.dragToolOrigin = null;
	this.state.handleOrigin = null;
	this.state.inProgressHandle = null;

	this.panel.core.state.dragTool = null;
	this.panel.core.state.tool = null;

	this.onComplete();

};

/**
 * Should be called by a tool when it is finished drawing and no longer active
 */
Modcharts.Tool.prototype.onComplete = function(){

	//console.log("Tool onComplete");

	this.panel.core.state.tool = null;
	this.panel.core.setToolMode(null);

};

/**
 * check for overlap between two boxes
 * todo: performance improvement - convert to simple arrays instead of objects with x,y,width,height props
 */
Modcharts.Tool.prototype.intersect = function(r1, r2) {

	if (r1.x < r2.x + r2.width && r2.x < r1.x + r1.width && r1.y < r2.y + r2.height){
		return r2.y < r1.y + r1.height;
	} else {
		return false;
	}

};

/**
 * drag both handles at once based on mouse position
 */
Modcharts.Tool.prototype.dragTool = function(mousePanel) {

	if (!this.panel.core.state.dragTool || !this.state.dragToolOrigin || !this.state.handleOrigin){
		return;
	}

	var diffTool = [mousePanel[0] - this.state.dragToolOrigin[0], mousePanel[1] - this.state.dragToolOrigin[1]],
		coordsLeft = this.state.handleOrigin[0],
		coordsRight = this.state.handleOrigin[1],
		newCoordsLeft = [coordsLeft[0] + diffTool[0], coordsLeft[1] + diffTool[1]],
		newCoordsRight = [coordsRight[0] + diffTool[0], coordsRight[1] + diffTool[1]],
		dateIdxLeft = Math.round(this.panel.xAxis.scale[0].invert(newCoordsLeft[0])),
		dateIdxRight = Math.round(this.panel.xAxis.scale[0].invert(newCoordsRight[0])),
		valLeft = this.panel.yAxis.scale[0].invert(newCoordsLeft[1]),
		valRight = this.panel.yAxis.scale[0].invert(newCoordsRight[1]);

	// check for tool dragged beyond the panel's domain boundaries
	if (
		(dateIdxRight > this.panel.core.exchangeDates.length - 1 || dateIdxRight < 0) ||
		(dateIdxLeft > this.panel.core.exchangeDates.length - 1 || dateIdxLeft < 0)
	){
		// reset drag/handle origins, makes UX feel less sticky
		this.state.dragToolOrigin = [mousePanel[0], mousePanel[1]];
		this.state.handleOrigin = [this.handle[0].getCoords(), this.handle[1].getCoords()];

		// don't update handles
		return;
	}

	// always store handle values as actuals
	if (this.panel.isNormalized()){

		valLeft = this.panel.normalizedToActual(valLeft);
		valRight = this.panel.normalizedToActual(valRight);

	}

	// update handles with the new dates and values
	this.handle[0].params.date = new Date(this.panel.core.exchangeDates[dateIdxLeft]);
	this.handle[1].params.date = new Date(this.panel.core.exchangeDates[dateIdxRight]);
	this.handle[0].params.value = valLeft;
	this.handle[1].params.value = valRight;

};

/**
 *
 */
Modcharts.Tool.prototype.toggleHandles = function(dir){

	for (var h=0; h < this.handle.length; h++){
		this.handle[h].state.visible = dir;
	}

};

/**
 * Mousedown on handle
 */
Modcharts.Tool.prototype.onClickHandle = function(){

	throw new Error("Required Tool method not found");

};

/**
 * Mousedown on canvas
 */
Modcharts.Tool.prototype.onClickCanvas = function(){

	throw new Error("Required Tool method not found");

};

/**
 * Mousedown on tool itself
 */
Modcharts.Tool.prototype.onClickTool = function(){

	throw new Error("Required Tool method not found");

};

/**
 * create new handle
 */
Modcharts.Tool.prototype.createHandle = function(mousePanel){

	var idx = Math.round(this.panel.xAxis.scale[0].invert(mousePanel[0])),
		valIn = this.panel.yAxis.scale[0].invert(mousePanel[1]),
		value = 0,
		valDate = this.panel.core.exchangeDates[idx];

	// always store handle values as actuals
	if (this.panel.isNormalized()){

		value = this.panel.normalizedToActual(valIn).toFixed(4);

	} else {

		value = valIn.toFixed(4);

	}

	return new Modcharts.Handle(this, { date: valDate, value: value });

};

/**
 * render myself
 */
Modcharts.Tool.prototype.render = function(){

	throw new Error("Required Tool method not found");

};

/**
 * inspect css for a style property
 */
 Modcharts.Tool.prototype.getStyle = function(selector, property) {

	return this.panel.core.getStyle(selector, property);

};

/**
 * default config tool menu.  for a custom menu, define a configToolCustom method.
 */
Modcharts.Tool.prototype.configTool = function(){

	var coords = this.handle[0].getCoords();

	if (!coords){
		return;
	}

	// custom click handler
	if (typeof this.configToolCustom === "function"){

		return this.configToolCustom(coords, this.params);

	}

	var self = this,
		style = this.params.style;

	if (!this.elConfig) {

		this.elConfig = $("<div class=\"modcharts-toolconfig\"></div>").appendTo($(this.panel.core.rootModchart)).hide();

		this.elConfigContent = $("<div class=\"modcharts-toolconfig-content modcharts-contains\"></div>")
			.css("display","block").appendTo(this.elConfig)
			//.css("width","auto")
			.css("height","auto");

		this.elConfigContent.append("<p><em>"+this.params.name+"</em></p>");

		// expose "value" if it exists (eg Text Tool)
		if (typeof this.params.value === "string"){
			self.elConfigContent.append("<p><div class=\"modcharts-toolconfig-content-key\">Value</div><textarea paramid=\"value\">"+this.params.value.replace(/<br\/>/g, "\n")+"</textarea></p>");
		}

		$.each(style, function(el){

			self.elConfigContent.append("<p><div class=\"modcharts-toolconfig-content-key\">"+el+"</div><input type=\"text\" styleid=\""+el+"\" value=\""+style[el]+"\" /></p>");

		});

		this.elConfigContent.append("<p><input type=\"button\" class=\"apply\" value=\"OK\"/><input type=\"button\" class=\"cancel\" value=\"Close\"/></p>");

		this.elConfigContent.find(".apply").on("click", function(e){

			var params = $(this).parent().parent().find(":text,textarea");

			params.each(function(){

				var styleId = $(this).attr("styleid");
				var paramId = $(this).attr("paramid");

				if (styleId) {
					self.params.style[styleId] = $(this).val();
				}

				if (paramId){
					self.params[paramId] = $(this).val().substring(0, 1028);
				}

			});

			self.panel.core.clearPanels();
			self.panel.core.render();

			e.preventDefault();

			self.elConfig.fadeOut(100);

			return false;

		});

		this.elConfig.find("input").on("keydown", function (e){

			if(e.keyCode === 13){
				self.elConfigContent.find(".apply").click();
			}

		});

		this.elConfigContent.find(".cancel").on("click", function(e){

			self.elConfig.fadeOut(100);

			e.preventDefault();
			return false;

		});
	}

	// show config
	if (!this.elConfig.is(":visible")){

		var left = (this.panel.size.padding.left + this.panel.size.width + this.panel.size.padding.right) / 2,
			top = this.panel.size.top + (this.panel.size.height / 2);

		this.elConfig.css("left", left - (this.elConfig.width() / 2))
			.css("top", top - (this.elConfig.height() / 2))
			.fadeIn(100);

	} else {

		// hide config
		this.elConfig.fadeOut(100);

	}

};

/**
 * Return minimum handle value of this tool (not needed yet)
 * @return {Number}
 */
/*
Modcharts.Tool.prototype.getRangeMin = function(data){

	throw new Error("Required Tool method not found");

};
*/

/**
 * Return maximum handle value of this tool (not needed yet)
 * @return {Number}
 */
/*
Modcharts.Tool.prototype.getRangeMax = function(data){

	throw new Error("Required Tool method not found");

};
*/

/**
 * Interactive handle
 * @constructor
 * @class Handle
 */
Modcharts.Handle = function(tool, params){

	this.tool = tool;

	this.state = {
		visible: true
	};

	this.params = {
		date: new Date(params.date),
		value: params.value,
		pairedHandle: params.pairedHandle,
		pairedOffsetX: params.pairedOffsetX,
		pairedOffsetY: params.pairedOffsetY,
		style: {
			size: tool.getStyle(".modcharts-tool-handle", "width") || 8,
			lineColor: tool.getStyle(".modcharts-tool-handle", "color") || "#fff",
			lineColorHover: tool.getStyle(".modcharts-tool-handle-hover", "color") || "#aaa",
			lineWidth: 1,
			fillColor: tool.getStyle(".modcharts-tool-handle", "background-color") || "#6AB5FF",
			fillColorHover: tool.getStyle(".modcharts-tool-handle-hover", "background-color") || "#111",
			shape: "default" // circle
		}
	};

};

/**
 * x calc - go from date to idx to px
 * y calc - go from value to px
 */
Modcharts.Handle.prototype.getCoords = function(){

	var panel = this.tool.panel,
		isPaired = typeof this.params.pairedHandle === "number",
		handleCoords = isPaired ? this.tool.handle[this.params.pairedHandle] : this,
		xIdx = panel.core.closestExchangeIndex(new Date(handleCoords.params.date)),
		xPx = panel.xAxis.scale[0](xIdx),
		yPx = 0;

	if (panel.isNormalized()){

		// render as normalized value.  value stays as an actual.
		yPx = panel.yAxis.scale[0](this.tool.panel.actualToNormalized(handleCoords.params.value));

	} else {

		yPx = panel.yAxis.scale[0](handleCoords.params.value);

	}

	// check if handle is earlier than ruler (can happen when drawing handles in inter and switching to intra)
	if (new Date(handleCoords.params.date) - new Date(panel.core.exchangeDates[0]) < 0){
		return null;
	}

	if (isPaired){
		xPx += this.params.pairedOffsetX;
		yPx += this.params.pairedOffsetY;
	}

	return [xPx, yPx];
};

Modcharts.Handle.prototype.isWithin = function(mousePanel){

	var coords = this.getCoords(),
		size = this.params.style.size * 3,
		half = size / 2,
		top = this.tool.panel.size.padding.top;

	if (!coords){
		return false;
	}

	return (
		mousePanel[0] >= coords[0] - half &&
		mousePanel[1] - top >= coords[1] - half &&
		mousePanel[0] < coords[0] - half + size &&
		mousePanel[1] - top < coords[1] - half + size
	);

};

Modcharts.Handle.prototype.onClick = function(){

	//console.log("Handle onClick");

};

Modcharts.Handle.prototype.onMouseover = function(){

	if (!this.tool.state.hover){

		this.tool.state.hover = true;
		this.tool.panel.core.unregisterZoom();

		this.tool.panel.core.onToolMouseover(this.tool);
	}

};

Modcharts.Handle.prototype.onMouseout = function(){

	if (this.tool.state.hover){

		this.tool.state.hover = false;
		this.tool.panel.core.registerZoom();

		this.tool.panel.core.onToolMouseout(this.tool);

	}
};

Modcharts.Handle.prototype.render = function(){

	if (this.state.visible){

		var ctx = this.tool.panel.rootToolContext,
			size = this.params.style.size,
			coords = this.getCoords();

		if (!coords){
			return;
		}

		if (this.renderCustom){
			return this.renderCustom(ctx, coords, this.params);
		}

		ctx.beginPath();
		ctx.lineWidth = this.params.style.lineWidth;

		size /= 4;

		ctx.arc(this.tool.panel.px(coords[0] - (size / 2)), this.tool.panel.px(coords[1] - (size / 2)), size * 2, 0, 2*Math.PI);

		if (this.tool.state.selected) {

			ctx.strokeStyle = this.params.style.lineColor;
			ctx.fillStyle = this.params.style.fillColor;
			ctx.fill();
			ctx.stroke();

		} else if (this.tool.state.hover){

			ctx.strokeStyle = this.params.style.lineColorHover;
			ctx.stroke();

		}
	}
};

/**
 * line tool base class
 * @constructor
 * @class LineTool
 * @extends Tool
 */
Modcharts.LineTool = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.LineTool, Modcharts.Tool);

Modcharts.LineTool.prototype.getDefaultParams = function() {

	return {
		id: "line",
		name: "Trendline",
		style : {
			lineColor: this.getStyle(".modcharts-tool-line", "color") || "#ccc",
			lineWidth: this.getStyle(".modcharts-tool-line", "width") || 1.5
		}
	};
};

Modcharts.LineTool.prototype.onClickCanvas = function(mouse){

	var core = this.panel.core,
		state = core.state,
		isUpper = this.panel.isUpper();

	// called from core.onClick() on both first and second clicks.
	if (!this.state.inProgressHandle){

		var mousePanel = [mouse[0], mouse[1] - this.panel.size.top];

		// use snapHandle coords if available
		if (isUpper && state.snapHandle && state.snapHandle.coords){
			mousePanel = [state.snapHandle.coords[0], state.snapHandle.coords[1] - this.panel.size.top];
		}

		// first click - create and render first handle
		this.handle[0] = this.createHandle(mousePanel);
		this.handle[0].state.visible = true;

		// create second handle (for its coords) but don't render
		this.handle[1] = this.createHandle(mousePanel);
		this.state.dragHandle = this.handle[1];

		// tool is now active
		this.state.inProgressHandle = true;

	} else {

		// use snapHandle coords if available
		if (isUpper && state.snapHandle && state.snapHandle.coords && !this.params.lockVertical){

			var snapDateIdx = Math.round(this.panel.xAxis.scale[0].invert(state.snapHandle.coords[0]));

			if (core.exchangeDates[snapDateIdx]){

				var val = this.panel.yAxis.scale[0].invert(state.snapHandle.coords[1]);

				// always store handle values in actuals
				if (this.panel.isNormalized()){
					val = this.panel.normalizedToActual(val);
				}

				this.state.dragHandle.params.value = val;
				this.state.dragHandle.params.date = new Date(core.exchangeDates[snapDateIdx]);
			}
		}

		// second click
		this.state.inProgressHandle = false; // no longer actively drawing a change in the tool
		this.state.dragHandle = null;
		this.handle[1].state.visible = true;

		this.onComplete();

	}
};

Modcharts.LineTool.prototype.onMousemove = function(mouse){

	var core = this.panel.core,
		mousePanel = [mouse[0], mouse[1] - this.panel.size.top];
		core.onToolMousemove(this);


	if (this.state.inProgressHandle){

		var idx = Math.round(this.panel.xAxis.scale[0].invert(mousePanel[0]));

		idx = Math.min(core.exchangeDates.length - 1, idx);
		idx = Math.max(0, idx);

		this.state.dragHandle.params.date = core.exchangeDates[idx];

		if (!this.params.lockVertical){

			var val = this.panel.yAxis.scale[0].invert(mousePanel[1]);

			// always store handle values in actuals
			if (this.panel.isNormalized()){
				val = this.panel.normalizedToActual(val);
			}

			this.state.dragHandle.params.value = val;
		}

	} else {

		this.dragTool(mousePanel);
	}
};

Modcharts.LineTool.prototype.lerp = function(a, b, x){

	return a + x * (b - a);

};

Modcharts.LineTool.prototype.getClosestPoint = function(x0, y0, x1, y1, mouseX, mouseY) {

	var dx = x1 - x0,
		dy = y1 - y0,
		t = ((mouseX - x0)*dx+(mouseY - y0)*dy)/(dx*dx+dy*dy),
		lineX = this.lerp(x0, x1, t),
		lineY = this.lerp(y0, y1, t);

	return [lineX, lineY];
};

/**
 * return true if current mouse coordinates are within hitbox of this tool
 */
Modcharts.LineTool.prototype.isWithin = function(mousePanel){
	return this.isWithinLineTool(mousePanel);
};


Modcharts.LineTool.prototype.isWithinLineTool = function(mousePanel) {
	var handles = this.handle;

	if (handles.length === 2){

		// use either regular handle coords or special endpoint coords (if present)
		var coords = [
				this.state.endpointLeft || handles[0].getCoords(),
				this.state.endpointRight || handles[1].getCoords()
			];

		// couldn't find one or more handles
		if (!coords[0] || !coords[1]){
			return false;
		}

		var tolerance = 5 + (this.params.style.lineWidth / 2),
			isVertical = coords[0][0] === coords[1][0],
			left = Math.min(coords[0][0], coords[1][0]),
			right = Math.max(coords[0][0], coords[1][0]),
			top = Math.min(coords[0][1], coords[1][1]),
			bottom = Math.max(coords[0][1], coords[1][1]);

		// handle vertical lines as a simple bounding box intersection check
		if (isVertical){

			var r1 = {
					x: left - tolerance,
					y: top,
					width: right - left + (2 * tolerance),
					height: bottom - top
				},
				r2 = {x: mousePanel[0], y: mousePanel[1], width:1, height: 1 };

			return this.intersect(r1, r2);
		}

		// handle diagonal or horizontal lines with a distance calculation
		var linepoint = this.getClosestPoint(coords[0][0], coords[0][1], coords[1][0], coords[1][1], mousePanel[0], mousePanel[1]),
			dx = mousePanel[0] - linepoint[0],
			dy = mousePanel[1] - linepoint[1],
			distance = Math.abs(Math.sqrt(dx*dx+dy*dy));

		if (distance > tolerance || mousePanel[0] < left || mousePanel[0] > right){

			return false;

		} else if (distance < tolerance){

			return true;

		}
	}
};

Modcharts.LineTool.prototype.render = function(){

	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	// couldn't find one or more handles
	if (!coords[0] || !coords[1]){
		return;
	}

	var ctx = this.panel.rootToolContext,
		distX = coords[1][0] - coords[0][0],
		distY = coords[1][1] - coords[0][1];

	ctx.beginPath();
	ctx.strokeStyle = this.params.style.lineColor;
	ctx.fillStyle = "#FFF";
	ctx.lineWidth = this.params.style.lineWidth;

	// regular line segment
	ctx.moveTo(coords[0][0], coords[0][1]);

	if (this.params.lockVertical){
		ctx.lineTo(coords[1][0], coords[0][1]);
	} else {
		ctx.lineTo(coords[1][0], coords[1][1]);
	}
	ctx.stroke();

	// arrowhead
	if (this.params.arrow) {
		this.drawArrowheads(ctx, coords[0][0], coords[0][1], coords[1][0], coords[1][1]);
	}

	// extend right and store endpoint
	if (this.params.extendRight){
		this.state.endpointRight = this.renderRay(ctx, coords[1][0], coords[1][1], distX, distY);
	} else {
		this.state.endpointRight = null;
	}

	// extend left and store endpoint
	if (this.params.extendLeft){
		this.state.endpointLeft = this.renderRay(ctx, coords[0][0], coords[0][1], -distX, -distY);
	} else {
		this.state.endpointLeft = null;
	}

	ctx.stroke();

	// handles
	this.handle[0].render();
	this.handle[1].render();

	this.panel.core.onToolRender(this);

};

Modcharts.LineTool.prototype.distance = function(coord1, coord2){

	var xs = coord2[0] - coord1[0],
		ys = coord2[1] - coord1[1];

	xs *= xs;
	ys *= ys;

	return Math.sqrt(xs + ys);
};

Modcharts.LineTool.prototype.renderRay = function(ctx, x, y, distX, distY){

	// don't render short rays
	if (Math.abs(distX) < 1 && Math.abs(distY) < 1){
		return [x, y];
	}

	var size = this.panel.size,
		right = size.width + size.padding.left,
		left = size.padding.left,
		isVertical = distX === 0;

	ctx.moveTo(x, y);

	if (isVertical) {

		if (distY >= 0 && 1/distY !== -Infinity){ // vertical to bottom edge, don't include negative 0

			y = size.padding.top + size.height;

		} else { // vertical to top edge

			y = size.padding.top;

		}

		ctx.lineTo(x, y);

	} else {

		if (distX > 0){	// horizontal to right edge

			while(x < right) {

				x += distX;
				y += distY;

				ctx.lineTo(x, y);
			}

		} else { // horizontal to left edge

			while(x >= left) {

				x += distX;
				y += distY;

				ctx.lineTo(x, y);
			}
		}

	}

	return [x, y];
};

/**
 * A wrapper for the collection of d3 scales and label related functions
 * @class AxisDate
 * @constructor
 * @param {Panel} panel A reference to the panel this AxisDate belongs to
 */
Modcharts.AxisDate = function(panel) {

	this.panel = panel;
	this.labeler = new Modcharts.Labeler(this, {});
	this.scale = [this.getScale()];

};

/**
 * Trim time labels to frame, render labels and grid
 * @method render
 */
Modcharts.AxisDate.prototype.render = function(dateLabels){

	var panel = this.panel,
		core = panel.core,
		params = core.params;

	// render labels if there is room
	if (panel.size.padding.bottom > 0){
		this.labeler.render($.extend(true, {}, dateLabels));
	}

	// normalized charts can style the normalizedate line differently
	if (params.normalizeDate && panel.isNormalized() && panel.params.style.gridColorVertNormalize !== "none"){

		var index = 0, normalizeDate = new Date(params.normalizeDate);

		// adjust for tz offset on client machine
		normalizeDate.setMinutes(normalizeDate.getMinutes() + normalizeDate.getTimezoneOffset());

		index = core.closestExchangeIndex(normalizeDate);

		var x0 = this.scale[0](index),
			padLeft = panel.size.padding.left,
			ctx = panel.rootContext;

		if (x0 && x0 > padLeft && x0 < panel.size.width + padLeft){
			x0 = panel.px(x0);
			ctx.beginPath();
			ctx.strokeStyle = panel.params.style.gridColorVertNormalize;
			ctx.moveTo(x0, panel.size.padding.top);
			ctx.lineTo(x0, panel.size.padding.top + panel.size.height);
			ctx.stroke();
		}
	}
};

/**
 * return an x scale per current size and a given domain
 * @param {array} domain
 * @returns {d3.scale.linear}
 */
Modcharts.AxisDate.prototype.getScale = function(domain) {

	return d3.scale.linear()
		.domain(domain || [0,0])
		.range([this.panel.size.padding.left, this.panel.size.padding.left + this.panel.size.width]);
};

/**
 * return true if this panel gets an XAxis based on various chart settings
 */
Modcharts.AxisDate.prototype.hasAxis = function(){

	var panel = this.panel,
		core = panel.core,
		panelXAxis = core.params.panelXAxis,
		idx = core.getPanelIndex(panel),
		lastIdx = core.panels.length - 1;

	if (typeof panel.params.hasXAxis === "boolean"){

		// a per-panel param overrides the global rule
		return panel.params.hasXAxis === true;

	} else if (panelXAxis === "none"){

		return false;

	} else if (panelXAxis === "all"){

		return true;

	} else if (panelXAxis === "first" && idx === 0){

		return true;

	} else if (panelXAxis === "last" && idx === lastIdx){

		return true;

	}

	return false;
};

/**
 * @method getCustomRuler
 * similar to getExchangeRuler this generates an array of dates based on a custom dataset
 */
Modcharts.AxisDate.prototype.getCustomRuler = function(){

	var core = this.panel.core,
		i = 0,
		iLen = 0,
		rulerData = [],
		date = new Date(),
		customDates = core.getFirstDataset(core.data);

	// convert to utc date objects
	for (i = 0, iLen = customDates.length; i < iLen; i++) {

		date = new Date(customDates[i].date);

		// adjust for tz offset on client machine
		date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

		date = core.getUTCDate(date).getTime();

		rulerData[i] = date;

	}

	return rulerData;
};

/**
 * get array of dates for an exchange, based on information from the TimeService API call.
 * @method getExchangeRuler
 */
Modcharts.AxisDate.prototype.getExchangeRuler = function(){

	var core = this.panel.core,
		i = 0,
		iLen = 0,
		data = [],
		date = new Date(),
		session = {},
		tradingDays = core.timeService.tradingDays;

	if (!core.state.isIntraday){

		// interday is simple - just use the tradingdays from the timeservice call
		data = new Array(tradingDays.length);

		// convert to utc date objects
		for (i = 0, iLen = tradingDays.length; i < iLen; i++) {

			date = new Date(tradingDays[i]);

			// adjust for tz offset on client machine
			date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

			date = core.getUTCDate(date).getTime();

			data[i] = date;

		}

	} else if (core.timeService.typicalSessions) {

		// if intraday, loop over tradingdays, and within each trading day, loop over the
		// typical session(s) for that day of the week.
		// for each trading day, it starts at the minimum session date and counts up by one minute,
		// each time checking if that minute falls within one of that day's sessions.
		// it stops when the minutes exceed the maximum session date.

		var typicalSessions = core.timeService.typicalSessions,
			typicalDay = {},
			rSession = {},
			dateStop = new Date(),
			dateMs = 0,
			dateStopMs = 0;

		data = [];

		for (i = 0, iLen = tradingDays.length; i < iLen; i++) {

			date = core.getUTCDate(new Date(tradingDays[i]));

			// grab typical sessions for this day.
			typicalDay = typicalSessions[date.getDay()];

			if (!typicalDay.sessions.length){
				continue;
			}

			// start with a trading day at midnight
			date = new Date(tradingDays[i]);

			// adjust for tz offset on client machine
			date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

			// convert the open/close offsets into real dates for comparison later
			for (session in typicalDay.rulerSessions){ if (typicalDay.rulerSessions.hasOwnProperty(session)){

				rSession = typicalDay.rulerSessions[session];
				rSession.openMs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, rSession.open).getTime();
				rSession.closeMs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, rSession.close).getTime();
			}}

			// snap the loop start/end to min/max of all sessions
			dateStop = new Date(date);
			date.setMinutes(typicalDay.min);
			dateStop.setMinutes(typicalDay.max);

			// do all comparing in ints for speed
			dateMs = date.getTime();
			dateStopMs = dateStop.getTime();

			// collect all valid trading minutes
			while (dateMs < dateStopMs){

				// check if this minute falls within any session
				for (session in typicalDay.rulerSessions){ if (typicalDay.rulerSessions.hasOwnProperty(session)){

					rSession = typicalDay.rulerSessions[session];
					if (dateMs >= rSession.openMs && dateMs < rSession.closeMs){
						data[data.length] = dateMs;
						break;
					}
				}}

				// bump to next minute
				dateMs += 60000;
			}
		}
	}

	return data;
};

/**
 * a wrapper for the collection of d3 scales and related functions
 * @class AxisNumber
 * @constructor
 * @param {Panel} panel A reference to the panel this AxisNumber belongs to
 */
Modcharts.AxisNumber = function (panel) {

	this.panel = panel;
	this.scale = [this.getScale()];

};

/**
 * return a y scale per current size and a given domain
 * @param {array} domain
 * @param {string} scaleType (linear, log)
 * @return {d3.scale.linear}
 */
Modcharts.AxisNumber.prototype.getScale = function(domain, scaleType) {

	var scale = (scaleType === "log") ? d3.scale.pow().exponent(0.2) : d3.scale.linear();

	scale.domain(domain || [1, 0]).range([this.panel.size.height, 0]);

	return scale;
};

/**
 * return y label density figure
 * @method getNumTicksY
 */
Modcharts.AxisNumber.prototype.getNumTicksY = function(size) {

	if (this.panel.core.getPanelIndex(this.panel) === 0){

		return (size.height < 170) ? Math.ceil(size.height / 30) : Math.ceil(size.height / 50);

	} else {

		return (size.height < 170) ? Math.ceil(size.height / 50) : Math.ceil(size.height / 60);
	}
};

/**
 * return id of the appropriate label bucket (micro, small, default, large)
 * precisionMultiple (example: 5) allows certain internal calls to override the micro and small buckets logic.
 * @method getFormatType
 */
Modcharts.AxisNumber.prototype.getFormatType = function(yDiff, precisionMultiple) {

	if (yDiff >= 10000){

		return "large";

	} else if (yDiff < (0.001 * precisionMultiple || 1)){

		return "micro";

	} else if (yDiff < (0.01 * precisionMultiple || 1)){

		return "small";
	}

	return "default";

};

/**
 * return a d3 format string for use in a format or tickFormat statement
 * @method getFormatString
 */
Modcharts.AxisNumber.prototype.getFormatString = function(yTicks, yScale, precisionMultiple){

	var panel = this.panel,
		size = panel.size,
		domain = this.panel.yAxis.scale[0].domain(),
		step,
		formatString;

	if (!yScale){
		yScale = panel.yAxis.scale[0];
	}

	if (!yTicks){
		yTicks = yScale.ticks(this.getNumTicksY(size));
	}

	// get the step between two consecutive ticks
	if (yTicks.length > 1){
		step = yTicks[1] - yTicks[0];
	} else if (yTicks.length && yTicks[0] !== 0){
		step = yTicks[0];
	} else {
		step = Math.abs(domain[1] - domain[0]);
	}

	var formatType = this.getFormatType(step, precisionMultiple || 1),
		yLabelFormat = this.panel.params.style.yLabelFormat[formatType];

	if (panel.params.yAxisFormat === "percent" || panel.isNormalized()){

		// percent-change formatting
		formatString = yLabelFormat.formatPercent.replace("%", "f"); // appending "%" is handled separately in getFormatValue

	} else {

		// default formatting
		formatString = yLabelFormat.format;
	}

	// remove decimal places on large steps and values
	if (step > 2 && yTicks.length && yTicks[yTicks.length - 1] >= 1000){
		formatString = formatString.replace(/\.2/,"");
	}

	return formatString;
};

Modcharts.AxisNumber.prototype.getFormatValue = function(val, formatString, isNormalized){

	var panel = this.panel,
		isPercent = panel.params.yAxisFormat === "percent" || isNormalized,
		suffix = (isPercent) ? "%" : "",
		valOut = "";

	if (formatString){

		valOut = d3.format(formatString)(val) + suffix;

	} else {

		valOut = val + suffix;
	}

	return valOut.replace(/G/, "B");
};

/**
 * draw linear yaxis
 * @param {d3.scale.linear} yScale
 */
Modcharts.AxisNumber.prototype.render = function(yScale){

	if (!yScale) { yScale = this.scale[0]; }

	var panel = this.panel,
		pad = panel.size.padding,
		style = panel.params.style,
		size = panel.size,
		ctx = panel.rootContext,
		isNormalized = panel.isNormalized(),
		numTicksY = this.getNumTicksY(size),
		yTicks = yScale.ticks(numTicksY),
		yFormatString = this.getFormatString(yTicks, yScale),
		fy = yScale.tickFormat(numTicksY, yFormatString),
		i, t, y0,
		x0 = pad.left + size.width + 5,
		ticks = [],
		halfFontHeight = Math.ceil(style.axisFontSize / 2) + 2,
		yLen = yTicks.length,
		bottomCollide = false,
		topCollide = false,
		lastY;

	// prepare context for labels
	ctx.beginPath();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = style.axisFontColor;
	ctx.font = [style.axisFontWeight, style.axisFontSize + "px", style.axisFontFamily].join(" ");

	// y labels
	for (i = 0; i < yLen; i++){

		y0 = panel.px(yScale(yTicks[i]));

		bottomCollide = i === 0 && y0 > size.height - halfFontHeight;
		topCollide = i === yLen - 1 && y0 < halfFontHeight;

		if (!bottomCollide && !topCollide){

			if (!lastY || y0 + halfFontHeight < lastY){

				// draw label
				ctx.fillText(this.getFormatValue(fy(yTicks[i]), false, isNormalized), x0, y0);

				lastY = y0;
			}

			ticks.push(y0);
		}
	}

	// set optional dashed horizontal grid line style
	if (panel.params.style.gridHorizPenPxOff && panel.params.style.gridHorizPenPxOn && ctx.setLineDash){
		ctx.setLineDash([panel.params.style.gridHorizPenPxOn, panel.params.style.gridHorizPenPxOff]);
	}

	// draw horizonal grid lines and gather tick positions
	ctx.lineWidth = style.gridSizeHoriz || 1;
	ctx.strokeStyle = style.gridColorHoriz || style.gridColor;

	for (i=0; i < ticks.length; i++){
		y0 = ticks[i];
		ctx.moveTo(pad.left, y0);
		ctx.lineTo(pad.left + size.width, y0);
	}

	ctx.stroke();
	ctx.closePath();

	// reset optional dashed line style
	if (ctx.setLineDash){
		ctx.setLineDash([]);
	}

	// draw yaxis ticks
	ctx.beginPath();
	ctx.strokeStyle = panel.params.style.gridColorTicksHoriz;

	if (panel.params.style.gridColorTicksHoriz){

		x0 = pad.left + size.width;

		for (t=0; t < ticks.length; t++){
			ctx.moveTo(x0, ticks[t]);
			ctx.lineTo(x0 + 4, ticks[t]);
		}

		ctx.stroke();
		ctx.closePath();
	}

	// draw horizontal normalization 0% line
	if (isNormalized && panel.params.style.gridColorHorizNormalize !== "none"){

		var padLeft = panel.size.padding.left,
			padTop = panel.size.padding.top;

		y0 = yScale(0.0);

		if (y0 && y0 > padTop && y0 < padTop + panel.size.height && panel.core.getPanelIndex(panel) === 0){
			y0 = panel.px(y0);
			ctx.strokeStyle = panel.params.style.gridColorHorizNormalize;
			ctx.beginPath();
			ctx.moveTo(panel.px(padLeft), y0);
			ctx.lineTo(panel.px(padLeft + panel.size.width), y0);
			ctx.stroke();
		}
	}

};

/**
 * update crosshair position
 * @method updateCrosshair
 * @param {d3.mouse()} mouse
 */
Modcharts.prototype.updateCrosshair = function(mouse, activePanel){

	//console.log("updateCrosshair", activePanel + " " + new Date().getTime());

	if (this.status === 0){ return; }
	if (!activePanel || !this.exchangeDates) { return; }

	var self = this,
		valX = mouse[0],
		valY = mouse[1],
		valIdx = this.panels[0].xAxis.scale[0].invert(mouse[0]),
		leftLimit = activePanel.size.padding.left,
		rightLimit = activePanel.size.width + activePanel.size.padding.left,
		indicator, valDate, valueY, newX, newY, dataY, dataIndex,
		dataSource = self.params.customData ? this.dataPrimary : this.dataFrame;

	if (this.data && this.state.toolmode === null && dataSource){

		dataIndex = self.closestDomainIndex(valIdx, dataSource, "dateIndex");

		newX = this.panels[0].px(Number(this.panels[0].xAxis.scale[0](dataSource[dataIndex].dateIndex)));

		if (isNaN(newX)) { return; }

		// the vertical crosshair is rendered on every panel
		this.eachPanel(function(panel){

			// horiz svg group
			if (!panel.crosshairHoriz){
				panel.crosshairHoriz = panel.rootOverlay.append("g")
					.attr("class", "modcharts-crosshair-horiz")
					.append("line");
			}

			// vert svg group
			if (!panel.crosshairVert){
				panel.crosshairVert = panel.rootOverlay.append("g")
					.attr("class", "modcharts-crosshair-vert")
					.append("line");
			}

			if (panel === activePanel){

				// only the first panel gets crosshair flag and circle
				if (panel.isUpper() && !panel.flags["crosshair"]){

					panel.flags["crosshair"] = new Modcharts.CrosshairFlag({ panel: panel, id: "crosshair" });

					// crosshair circle
					panel.crosshairCircle = panel.rootOverlay.append("circle")
						.attr("class", "modcharts-crosshair-circle")
						.attr("r", panel.params.style.crosshairCircleRadius);
				}

			} else {

				panel.crosshairHoriz.style("visibility", "hidden");

				if (panel.flags["crosshair"]){
					panel.flags["crosshair"].hide();
				}

				if (panel.crosshairCircle){
					panel.crosshairCircle.style("visibility", "hidden");
				}

			}

			indicator = panel.indicators[0];

			// indicators can sometimes be removed before mousemove handler is complete
			if (!indicator) { return false; }

			// vertical crosshair and data callback
			if (
				self.exchangeDates[Math.round(valIdx)] &&
				valX < rightLimit &&
				valX > leftLimit
			){

				// call this.callbackCrosshair() on active panel
				if (panel === activePanel){

					newY = activePanel.px(valY - activePanel.size.top);
					valueY = self.params.customData ? dataSource[dataIndex].value : dataSource[dataIndex].close;

					if (typeof valueY === "number"){
						valDate = new Date(dataSource[dataIndex].date);
						dataY = self.panels[0].px(Number(self.panels[0].yAxis.scale[0](valueY)));
						self.callbackCrosshair(valDate, newX, newY, dataY);
					}
				}

				// vertical crosshair is rendered on every panel
				self.renderCrosshairVertical(panel, newX);

			} else {

				// hide invalid crosshairs
				panel.crosshairVert.style("visibility", "hidden");
			}

		});

		// crosshair x & flag are only rendered on the active panel
		this.renderCrosshairHorizontal(activePanel, mouse, newX, newY, dataY);
	}
};

/**
 *
 */
Modcharts.prototype.renderCrosshairVertical = function(panel, newX){

	//console.log("renderCrosshairVertical");

	if (this.params.crosshairEnabled){

		// crosshair y
		panel.crosshairVert
			.attr("x1", newX)
			.attr("y1", panel.size.padding.top)
			.attr("x2", newX)
			.attr("y2", panel.size.padding.top + panel.size.height);
		panel.crosshairVert.style("visibility", null);

		// reflow
		panel.crosshairVert.node().getBBox();
	}
};

/**
 *
 */
Modcharts.prototype.renderCrosshairHorizontal = function(activePanel, mouse, newX, newY, dataY){

	//console.log("renderCrosshairHorizontal", arguments);

	if (isNaN(newY) || !activePanel) {
		return;
	}

	// check collision with top and bottom of panel

	if (newY - 6 < activePanel.size.padding.top || newY + 6 > activePanel.size.padding.top + activePanel.size.height){

		activePanel.crosshairHoriz.style("visibility", "hidden");

		if (activePanel.flags["crosshair"]){
			activePanel.flags["crosshair"].hide();
		}

	} else {

		// draw regular active panel horizontal crosshair
		var x2 = activePanel.size.padding.left + activePanel.size.width;

		// horizontal crosshair
		if (this.params.crosshairEnabled){

			activePanel.crosshairHoriz
				.attr("x1", activePanel.size.padding.left)
				.attr("y1", newY)
				.attr("x2", x2)
				.attr("y2", newY);

			// reveal horizontal line
			activePanel.crosshairHoriz.style("visibility", null);
		}

		// draw crosshair flag
		if (this.params.crosshairFlagEnabled && activePanel.flags["crosshair"]){

			// update flag & label
			var color = this.getStyle(".modcharts-crosshair-flag", "background-color"),
				val = activePanel.yAxis.scale[0].invert(mouse[1]);

			activePanel.flags["crosshair"].render(val, color);
		}
	}

	// crosshair circle
	if (activePanel.isWithin(mouse) && activePanel.crosshairCircle && typeof dataY === "number" && !isNaN(newY) && !isNaN(dataY)){

		// here can be logic to use newY or dataY depending on preference
		if (typeof dataY === "number"){
			newY = dataY;
		}

		activePanel.crosshairCircle
			.style("visibility", null)
			.attr("cx", newX)
			.attr("cy", newY);

	}
};

/**
 * call back with the OHLCV or custom data for the current crosshair position
 */
Modcharts.prototype.callbackCrosshair = function(valDate, newX, newY, dataY){

	if (!this.crosshairDataCallback || !this.params.crosshairEnabled){
		return;
	}

	var data = { date: valDate, coords: {x: newX, y: newY, dataY: dataY } },
		self = this,
		dp,
		dataIdx = this.getFilterUpper(this.dataPrimary, valDate),
		dataOHLC = this.getDataByType(this.params.symbol, "price"),
		dataVolume = this.getDataByType(this.params.symbol, "volume");

	// ohlc
	if (dataOHLC.length){

		dp = dataOHLC[0][dataIdx];

		data.open = dp.open;
		data.high = dp.high;
		data.low = dp.low;
		data.close = dp.close;
	}

	// volume
	if (dataVolume.length && dataVolume[0][dataIdx]){
		data.volume = dataVolume[0][dataIdx].volume;
	}

	// all panels
	if (this.data[this.params.symbol]){

		data.panels = [];

		this.eachPanel(function(panel){

			var panelData = [];

			for (var i=0; i < panel.indicators.length; i++){

				// gather indicator data for panel
				var uid = panel.indicators[i].params.uid,
					id = panel.indicators[i].params.id,
					symbol = panel.indicators[i].params.symbol || self.params.symbol,
					indicatorData = { uid: uid, id: id, symbol: symbol };

				try {

					dataIdx = self.getFilterUpper(self.data[symbol][id][uid], valDate);

					$.each(self.data[symbol][id][uid][dataIdx], function(id, value){

						if (!/date/.test(id)){
							indicatorData[id] = value;
						}

					});

				} catch(e){}

				panelData.push(indicatorData);
			}

			data.panels.push(panelData);

		});
	}

	// currency
	if (this.state.currency){
		data.currency = this.state.currency;
	}

	// utc offset
	var wsodIssue = this.getWSODIssueByTicker(this.params.symbol);
	if (wsodIssue){
		data.utcOffset = this.xref[wsodIssue].utcOffset;
		data.issueType = this.xref[wsodIssue].issueType;
	}

	// grab from customData if defined
	if (this.params.customData){

		var idx = this.closestExchangeIndex(valDate),
			custom = this.params.customData[this.panels[0].indicators[0].params.datasetId][idx];

		// add all custom data to result
		$.each(custom, function(a,b){
			data[a] = b;
		});
	}

	//console.log(data);

	window.setTimeout(function(){ self.crosshairDataCallback(data); }, 0);
};

/**
 * @method concealCrosshairs
 * visibility is used to toggle on/off, which leaves open display for the user to control the overall toggle.
 */
Modcharts.prototype.concealCrosshairs = function(){

	//console.log("concealCrosshairs");

	this.eachPanel(function(panel){

		panel.concealCrosshairs();

	});

	if (this.crosshairConcealCallback){

		this.crosshairConcealCallback();

	}
};

/**
 * @method revealCrosshairs
 * visibility is used to toggle on/off, which leaves open display for the user to control the overall toggle.
 */
Modcharts.prototype.revealCrosshairs = function(activePanel){

	//console.log("revealCrosshairs");

	var self = this;

	this.eachPanel(function(panel){

		if (self.params.crosshairEnabled && panel.crosshairVert){
			panel.crosshairVert.style("visibility", null);
		}

		if (panel === activePanel){

			if (self.params.crosshairEnabled && panel.crosshairHoriz){
				panel.crosshairHoriz.style("visibility", null);
			}

			if (self.params.crosshairFlagEnabled && panel.flags["crosshair"]){
				panel.flags["crosshair"].show();
			}

			if (panel.crosshairCircle){
				panel.crosshairCircle.style("visibility", null);
			}
		}
	});

	if (this.crosshairRevealCallback){

		this.crosshairRevealCallback();

	}
};

/**
 * set crosshair enabled param and reset cursor
 */
Modcharts.prototype.setCrosshairEnabled = function(isEnabled) {

	this.params.crosshairEnabled = (typeof isEnabled === "boolean") ? isEnabled : true;

	if (this.params.crosshairEnabled){

		this.setCursor("cross");

	} else {

		this.setCursor("default");
	}

	this.renderQueue();

};

/**
 * set crosshair enabled param and reset cursor
 */
Modcharts.prototype.setCrosshairFlagEnabled = function(isEnabled) {

	this.params.crosshairFlagEnabled = (typeof isEnabled === "boolean") ? isEnabled : true;

	this.renderQueue();

};

/**
 * create a proxy iframe used for making cross-domain requests
 * the "message" eventlister will be fired when the proxy request has completed.
 * @method initXDIframe
 */
Modcharts.prototype.initXDIframe = function(){

	var self = this, saved;

	// dom
	this.xProxy = $("<iframe width=\"1px\" height=\"1px\" style=\"display:none;\" src=\"" + this.params.xProxy + "\"></iframe>").appendTo("body");

	// respond to completed action on receipt of message event
	window.addEventListener("message", function(e)
	{
		var results = JSON.parse(e.data);

		switch (results.action) {

			case "series":
			case "chartapi/series" : {

				// ie is unable to pass in the callback that sets this.
				self.params.endOffsetDays = 0;

				return self.processChartAPIResponse(JSON.parse(results.message), false, null, results.args);

			}

			case "save" : {

				saved = JSON.parse(results.message);

				if (self.onSaveCompleteCallback){

					self.onSaveCompleteCallback(saved.Id);

				} else {

					var windowOrigin = self.getWindowOrigin();

					window.prompt("The shared chart is now available at the following location:", windowOrigin + window.location.pathname + "?saved=" + saved.Id);
				}

				break;
			}

			case "load" : {

				return self.load(window.unescape(JSON.parse(results.message)).replace(/&quot;/g,"\""));

			}

			case "loadtemplate": {

				self.loadingStart();

				self.applyTemplate(window.unescape(JSON.parse(results.message)).replace(/&quot;/g,"\""));

				return self.loadData();
			}

			case "savetemplate": {

				saved = JSON.parse(results.message);

				if (self.onSaveTemplateCompleteCallback){

					self.onSaveTemplateCompleteCallback(saved.Id);

				} else {

					window.alert("Template saved. " + saved.Id);

				}
			}

		}
	}, false);
};

/**
 * determine current visible data, if we're missing any historic data, retrieve it.
 * @method backfillData
 */
Modcharts.prototype.backfillData = function(){

	var domain = this.panels[0].xAxis.scale[0].domain(),
		self = this,
		now = new Date(),
		indexDomainLeft = Math.max(0, Math.floor(domain[0])),
		indexDomainRight = Math.min(this.exchangeDates ? this.exchangeDates.length - 1 : Math.floor(domain[1]), Math.floor(domain[1])),
		isIntraday = (typeof this.state.isIntraday === "boolean") ? this.state.isIntraday : /minute|hour/i.test(this.params.dataPeriod),
		dayLimit = (isIntraday) ? this.LIMIT_INTRADAY_DAYS : this.LIMIT_INTERDAY_DAYS,
		dateLimit = new Date(now.setDate(now.getDate() - dayLimit)),
		dateDomainLeft = (this.exchangeDates && this.exchangeDates[indexDomainLeft]) ? this.getUTCDate(new Date(this.exchangeDates[indexDomainLeft])) : null,
		dateDomainRight = (this.exchangeDates && this.exchangeDates[indexDomainRight]) ? this.getUTCDate(new Date(this.exchangeDates[indexDomainRight])) : null,
		dateDataLeft = this.dataPrimary[0].date,
		dataNormalized = this.panels[0].isNormalized();

	// backfill only if domain's left is less than data's left AND if data's left is within the dateLimit time period.
	if (dateDomainLeft && dateDomainRight && dateDomainLeft < dateDataLeft && dateDataLeft > dateLimit){

		var dayDiff = (dateDataLeft - dateDomainLeft) / 1000 / 60 / 60 / 24,
			offsetDays = Math.max(1, Math.ceil((new Date() - dateDataLeft) / 1000 / 60 / 60  / 24)),
			dayDiffThreshold = this.params.dataPeriod === "Month" ? 30 : /Day|Week/.test(this.params.dataPeriod) ? 7 : 0,
			isValid = dayDiff > dayDiffThreshold;

		// invalidate lengthy inter/intraday requests
		if (isIntraday && offsetDays > dayLimit){
			isValid = false;
		}

		if (isValid){

			// don't allow interaction while backfilling
			this.unregisterZoom();

			// set (or reset) dateStart/Stop to currently visible date range on the axis (this includes the empty gap about to be filled)
			this.params.dateStart = new Date(this.exchangeDates[indexDomainLeft]);
			this.params.dateStop = new Date(this.exchangeDates[indexDomainRight]);

			// limit offsetDays by the dayLimit
			this.params.endOffsetDays = Math.min(dayLimit, offsetDays);

			// if we're looking at more than one symbol, and we've panned over, define the normalizedate
			if (!this.params.normalizeDate && dataNormalized){
				this.params.normalizeDate = this.dataPrimary[0].date;
			}

			this.loadData(function(){

				self.params.endOffsetDays = 0;
				self.updateZoom();
				self.registerZoom();

			}, {silent: false, prepend: true});

			return true;
		}
	}

	return false;
};

/**
 * get nearest data index by Date
 * @method closestExchangeIndex
 * @param {Date} date
 * @return {int}
 */
Modcharts.prototype.closestExchangeIndex = function(jsDate){

	var idx = 0,
		mid = 0,
		min = 0,
		done = false,
		max = this.exchangeDates.length - 1,
		val = jsDate.getTime();

	while (!done) {

		if (max - min <= 1) {

			idx = (this.exchangeDates[min] >= val) ? min : max;
			done = true;

		} else {

			mid = Math.floor((max + min) / 2);

			if (this.exchangeDates[mid] <= val) {
				min = mid;
			} else {
				max = mid;
			}
		}
	}

	return idx;
};

/**

 */
Modcharts.prototype.closestDomainIndex = function(val, data, key){

	if (!data || !data.length) { return 0; }

	var idx = 0,
		mid = 0,
		midV = 0,
		min = 0,
		max = data.length - 1,
		done = false,
		distMax = 0,
		distMin = 0;

	if (!key){ key = "index"; }

	while (!done) {

		if (max - min <= 1) {

			distMin = Math.abs(data[min][key] - val);
			distMax = Math.abs(data[max][key] - val);

			idx = (distMin < distMax) ? min : max;
			done = true;

		} else {

			mid = Math.floor((max + min) / 2);
			midV = data[mid][key];

			if (midV <= val) {
				min = mid;
			} else {
				max = mid;
			}
		}
	}

	return idx;
};

/**
 * get earliest data index by Date
 * @method getFilterLower
 * @param {Array} data
 * @param {Date} date
 * @return {int}
 */
Modcharts.prototype.getFilterLower = function(data, date){

	var lowerIdx,
		min = 0,
		max = (data.length) ? data.length - 1 : 0,
		mid = 0,
		done = false;

	if (!date || !data.length) { return min; }

	while (!done) {

		if (max - min <= 1) {

			var distMax = date - data[max].date,
				distMin = date - data[min].date;

			lowerIdx = (Math.abs(distMax) < Math.abs(distMin)) ? max : min;

			done = true;

		} else {

			mid = Math.floor((max + min) / 2);

			if (data[mid].date <= date) {
				min = mid;
			} else {
				max = mid;
			}
		}
	}

	return lowerIdx;
};

/**
 * get latest data index by Date
 * @method getFilterUpper
 * @param {Array} data
 * @param {Date} date
 * @return {int}
 */
Modcharts.prototype.getFilterUpper = function(data, date){

	var upperIdx,
		min = 0,
		max = (data.length) ? data.length - 1 : 0,
		mid = 0,
		done = false;

	if (!date || !data.length) { return max; }

	while (!done) {

		if (max - min <= 1) {

			var distMax = date - data[max].date,
				distMin = date - data[min].date;

			upperIdx = (Math.abs(distMax) < Math.abs(distMin)) ? max : min;

			done = true;

		} else {

			mid = Math.floor((max + min) / 2);

			if (data[mid].date <= date) {
				min = mid;
			} else {
				max = mid;
			}
		}
	}

	return upperIdx;
};

/**
 * get slice of datasets that match the current domain
 */
Modcharts.prototype.getFrameData = function() {

	var data = {},
		ruler = this.exchangeDates,
		rulerLength = ruler.length,
		domain = this.panels[0].xAxis.scale[0].domain(),
		dateMin = new Date(ruler[Math.min(rulerLength - 1, Math.max(0,Math.floor(domain[0])))]),
		dateMax = new Date(ruler[Math.min(rulerLength - 1, Math.max(0,Math.floor(domain[1])))]),
		dataSymbol,
		filteredSymbol,
		dataSymbolEl,
		isPreviousClose,
		isEvent,
		t,
		tLen,
		el,
		elId,
		elUid,
		filteredSymbolEl,
		thisFiltered,
		thisMinIdx,
		thisMaxIdx;

	// loop over each symbol
	for (var symbol in this.data) { if (this.data.hasOwnProperty(symbol)) {

		dataSymbol = this.data[symbol];

		if (!data[symbol]) {
			data[symbol] = {};
		}

		filteredSymbol = data[symbol];

		// loop over series (dividends, price, sma, etc) for this symbol
		for (elId in dataSymbol){ if (dataSymbol.hasOwnProperty(elId)) {

			dataSymbolEl = dataSymbol[elId];
			isPreviousClose = elId === "previousclose";
			isEvent = /dividends|earnings|splits|custom/.test(elId);

			for (elUid in dataSymbolEl){ if (dataSymbolEl.hasOwnProperty(elUid)) {

				el = dataSymbolEl[elUid];

				if (!el.length) { continue; }

				if (!filteredSymbol[elId]) { filteredSymbol[elId] = {}; }

				filteredSymbolEl = filteredSymbol[elId];

				if (isPreviousClose){

					filteredSymbol.previousclose[elUid] = {
						close: el[0].previousclose,
						date: el[0].date
					};

				} else if (isEvent){ // events

					filteredSymbolEl[elUid] = dataSymbolEl[elUid];

				} else {

					thisMinIdx = this.getFilterLower(el, dateMin);
					thisMaxIdx = this.getFilterUpper(el, dateMax);

					// slice at different indexes for each element
					// -1/+2 is to ensure the data is wider than viewable panel
					filteredSymbolEl[elUid] = el.slice(Math.max(thisMinIdx - 1, 0), Math.min(thisMaxIdx + 2, rulerLength - 1));

					thisFiltered = filteredSymbolEl[elUid];

					for (tLen = thisFiltered.length, t=0; t < tLen; t++){

						if (thisFiltered[t]){
							thisFiltered[t].dateIndex = this.closestExchangeIndex(thisFiltered[t].date);
						}
					}
				}}
			}}
		}
	}}

	return data;
};

/**
 * similar to getFrameData, this will return the slice of custom datasets that match the current domain.
 */
Modcharts.prototype.getCustomFrameData = function() {

	var data = {},
		ruler = this.exchangeDates,
		rulerLength = ruler.length,
		domain = this.panels[0].xAxis.scale[0].domain(),
		dateMin = new Date(ruler[Math.min(rulerLength - 1, Math.max(0,Math.floor(domain[0])))]),
		dateMax = new Date(ruler[Math.min(rulerLength - 1, Math.max(0,Math.floor(domain[1])))]),
		t,
		tLen,
		el,
		thisMinIdx,
		thisMaxIdx;

	// loop over each custom dataset
	for (var dataset in this.data){ if (this.data.hasOwnProperty(dataset)) {

		el = this.data[dataset];

		if (!el.length) { continue; }

		thisMinIdx = this.getFilterLower(el, dateMin);
		thisMaxIdx = this.getFilterUpper(el, dateMax);

		el = el.slice(Math.max(thisMinIdx - 1, 0), Math.min(thisMaxIdx + 1, rulerLength));

		for (tLen = el.length, t=0; t < tLen; t++){

			if (el[t]){
				el[t].dateIndex = this.closestExchangeIndex(el[t].date);
			}
		}

		data[dataset] = el;
	}}

	return data;
};

/**
 * convert params into an input object ready to be posted to proxy
 * @method getSeriesProxyInputs
 */
Modcharts.prototype.getSeriesProxyInputs = function(inputs){

	$.each(inputs, function(el){

		if (typeof inputs[el] === "string") {
			inputs[el] = inputs[el].replace("candlestick", "price");
		}
	});

	return inputs;
};

/**
 * get proxy action - ie9 only
 * send message to our proxy iframe, tagged with a certain action type (series/save/load)
 * we have a listener on this window that will wait for a response from the iframe
 * @method getProxyAction
 */
Modcharts.prototype.getProxyAction = function(action, data, args){

	// create iframe proxy and establish postmessage handler
	if (!this.xProxy){

		this.initXDIframe();

	}

	var message, proxy = this.xProxy[0].contentWindow;

	if (!args) { args = {}; }

	// fire action
	switch (action){

		case "chartapi/series":
		case "series": {

			message = this.getSeriesProxyInputs(data);

			window.setTimeout(function(){
				proxy.postMessage(JSON.stringify({action:action, message:message, args:args}), "*");
			}, 100);

			break;
		}

		default: {

			window.setTimeout(function(){
				proxy.postMessage(JSON.stringify({action:action, message:data, args:args}), "*");
			}, 100);

		}
	}
};

/**
 * convert params into an input object ready to be posted to ChartAPI
 * @method getChartAPIInputs
 */
Modcharts.prototype.getChartAPIInputs = function(args){

	var days = this.params.days || 365,
		daysInput,
		intradayLimit = this.LIMIT_INTRADAY_DAYS,
		interdayLimit = this.LIMIT_INTERDAY_DAYS;

	args = args || {};

	// calculate days between start/stop
	if (this.params.dateStart && this.params.dateStop){
		days = Math.ceil((this.params.dateStop - this.params.dateStart) / 1000 / 60 / 60 / 24);
	}

	// earliest days value (via params.days or dateStart)
	var daysMin = (this.params.dateStart) ? Math.ceil((new Date() - this.params.dateStart) / 1000 / 60 / 60 / 24) : days;

	// if not a prepend request, we will request all days from dateStart until present
	// if a prepend request, just request the days that fall between dateStart/Stop, and include an additional endOffsetDays
	if (this.state.isIntraday){
		daysInput = Math.min(intradayLimit - (this.params.endOffsetDays || 0), (args.prepend) ? days : daysMin);
	} else {
		daysInput = Math.min(interdayLimit - (this.params.endOffsetDays || 0), (args.prepend) ? days : daysMin);
	}

	daysInput = Math.max(1, daysInput);

	// initialize the chartapi input package
	var inputs = {
		days: daysInput,
		dataNormalized: this.panels[0].isNormalized(),
		dataPeriod: this.params.dataPeriod || "Day",
		dataInterval: Number(this.params.dataInterval || 1),
		endOffsetDays: (args.prepend) ? this.params.endOffsetDays || 0 : 0,
		exchangeOffset: this.params.exchangeOffset || 0,
		realtime: this.params.realtime,
		yFormat: this.getChartAPIDataPrecision(),
		timeServiceFormat: "JSON", //  requires MOD.Web.ChartAPI 0.1.75-beta
		rulerIntradayStart: this.params.rulerIntradayStart,
		rulerIntradayStop: this.params.rulerIntradayStop,
		rulerInterdayStart: this.params.rulerInterdayStart,
		rulerInterdayStop: this.params.rulerInterdayStop
	};

	// returnDateType
	if (this.params.apiSeries === "chartapi/series"){
		inputs.returnDateType = "ISO8601";
	}

	// isMax
	if (this.params.isMax){
		inputs.isMax = true;
	}

	// set optional dataInterface
	if (this.params.dataInterface){
		inputs.dataInterface = this.params.dataInterface;
	}

	// set optional feedGroup
	if (this.params.feedGroup){
		inputs.feedGroup = this.params.feedGroup;
	}

	// optional usage reporting feature type
	if (this.params.usageReportingAppFeatureType){
		inputs.usageReportingAppFeatureType = this.params.usageReportingAppFeatureType;
	}

	// set optional poll date.  the web api will return a reduced data package trimmed to this date.
	if (args.silent && this.dataPrimary.length){

		var pollDate = new Date(this.dataPrimary[this.dataPrimary.length - 1].date);

		if (this.state.isIntraday && this.xref[this.params.symbol].utcOffset){

			// account for exchange utc offset
			pollDate.setMinutes(pollDate.getMinutes() - this.xref[this.params.symbol].utcOffset);

			// account for client timezone offset
			pollDate.setMinutes(pollDate.getMinutes() - pollDate.getTimezoneOffset());

		}

		inputs.pollDate = this.jsToMsDate(new Date(pollDate)).toFixed(6);

		if (!this.state.isIntraday){
			inputs.pollDate = Math.floor(inputs.pollDate);
		}
	}

	// mask out BeforeOpen + AfterClose + NonTradingDays but keep in FullHolidays
	if (this.state.isIntraday){
		inputs.timeIntervalMask = 26;
	}

	// normalize date
	if (!inputs.dataNormalized){

		this.params.normalizeDate = null;
		this.params.normalizeValue = null;
		this.params.normalizeValues = null;

	} else if (this.params.normalizeDate){

		inputs.normalizeDate = this.params.normalizeDate;
	}

	if (this.params.apiSeries === "chartapi/series"){ // the new version of API has a different elements format

		inputs.elements = this.getElementsJSONInputs();

	} else {

		inputs = this.addElementInputs(inputs);

	}

	this.params.isMax = false;

	return inputs;
};

/**
 * convert dataPrecision into format string
 * @method getChartAPIDataPrecision
 */
Modcharts.prototype.getChartAPIDataPrecision = function(){

	var format = "0.#",
		xLen = (typeof this.params.dataPrecision === "number") ? Math.max(0, this.params.dataPrecision - 1) : 2;

	for (var x=0; x < xLen; x++){ format += "#"; }

	return format;
};

/**
 * add elements in legacy input format
 * @method addElementInputs
 */
Modcharts.prototype.addElementInputs = function(inputs){

	var i, indicator, event, self = this, idx = 0;

	this.eachPanel(function(panel){

		for (i = 0; i < panel.indicators.length; i++) {

			indicator = panel.indicators[i];

			// set key to uid-symbol-id
			inputs["elements["+idx+"].Key"] = self.getElementKey(indicator);

			// the rest of the values are the inputs specific to that chartapi element (could be none)
			for (var inputIdx = 0; inputIdx < (indicator.params.inputs || []).length; inputIdx++ ){
				inputs["elements["+idx+"].Value[" + inputIdx + "]"] = indicator.params.inputs[inputIdx].value || "";
			}

			// chartapi input needs empty value for nulls
			if (!indicator.params.inputs.length){
				inputs["elements["+idx+"].Value[0]"] = "";
			}

			idx++;
		}

		// non-custom events are also retrieved as chartapi elements
		for (i = 0; i < panel.events.length; i++) {

			event = panel.events[i];

			if (event.params.id === "custom"){ continue; }

			// set key to uid
			inputs["elements["+idx+"].Key"] = self.getElementKey(event);

			// the chartapi events input needs an empty value
			inputs["elements["+idx+"].Value[0]"] = "";

			idx++;
		}
	});

 	return inputs;
};

/**
 * get elements in newer json input format
 * @method getElementsJSONInputs
 */
Modcharts.prototype.getElementsJSONInputs = function(){

	var i, indicator, event, self = this, elements = [], newElement;

	this.eachPanel(function(panel){

		var dataNormalized = panel.isNormalized();

		// add indicator elements (sma, bollingers)
		for (i = 0; i < panel.indicators.length; i++) {

			indicator = panel.indicators[i];

			// overlay indicators will be added in getOverlayIndicators
			if (indicator.params.parentUID){
				continue;
			}

			newElement = {
				"Label": indicator.params.uid,
				"Type": indicator.params.datasetId || indicator.params.id,
				"Symbol": indicator.params.symbol || self.params.symbol,
				"OverlayIndicators": self.getOverlayIndicators(panel, indicator),
				"Params": self.getIndicatorParamsInput(panel, indicator)
			};

			// normalized price data needs a multiplier
			if (dataNormalized){

				newElement["ValueMultiplier"] = indicator.params.valueMultiplier || 100;
				newElement["ValueFormat"] = "{0:#,##0.######}"; // see NXC-609
			}

			elements.push(newElement);
		}

		// add event elements (splits, dividends, etc)
		for (i = 0; i < panel.events.length; i++) {

			newElement = {};
			event = panel.events[i];

			if (event.params.id === "custom"){ continue; }

			newElement.Label = event.params.uid;
			newElement.Type = event.params.id;
			newElement.Symbol = self.params.symbol;
			newElement.Params = self.getIndicatorParamsInput(panel, event);

			elements.push(newElement);
		}
	});

 	return elements;
};

Modcharts.prototype.getIndicatorParamsInput = function(panel, obj){

	var params = {};

	// the rest of the values are the inputs specific to that chartapi element (could be none)
	for (var inputIdx = 0; inputIdx < (obj.params.inputs || []).length; inputIdx++ ) {
		var thisInput = obj.params.inputs[inputIdx];
		if (thisInput.value !== "ohlc") {
			params[thisInput.name] = thisInput.value;
		}
	}

	// if the indicator needs adjustment on the back end, add the adjustment
	// and the date to the params list
	for (var i = 0; i < panel.indicators.length; i++) {
		if(obj.params.needsCumulativeAdjustment) {
			params["adjustmentValue"] = obj.lastValue ? obj.lastValue : 0;
			params["adjustmentDate"] = obj.lastDate ? obj.lastDate : null;
		}
	}

	return params;
};

Modcharts.prototype.getOverlayIndicators = function(panel, indicator){

	var uid = indicator.params.uid, parentUID = "", overlays = [], ind = {}, self = this;

	for (var x = 0; x < panel.indicators.length; x++) {

		ind = panel.indicators[x];
		parentUID = ind.params.parentUID;

		if (parentUID && parentUID === uid) {

			overlays.push({
				"Label": ind.params.uid,
				"Type": ind.params.id,
				"Symbol": ind.params.symbol || this.params.symbol,
				"DataSeries": indicator.params.dataSeries || indicator.params.id,
				"Params": self.getIndicatorParamsInput(panel, ind)
			});
		}
	}
	return overlays;
};

/**
 */
Modcharts.prototype.exportData = function(){

	var self = this,
		data = (this.data && this.data[this.params.symbol]) ? this.data[this.params.symbol] : [], series = {}, columns = {},
		isIntraday = this.state.isIntraday;

	$.each(data, function(el){

		var dataset = self.getFirstDataset(self.data[self.params.symbol][el]);

		for (var x=0; x < dataset.length; x++){

			var dateObj = dataset[x].date,
				date = dateObj.toLocaleString();

			if (!isIntraday){
				date = date.substring(0,dateObj.toLocaleString().indexOf(", "));
			}

			if (!series[date]){
				series[date] = {};
			}

			$.each(dataset[x], function(el, val){

				if (!/date/.test(el)){

					if (!series[date][el]){
						series[date][el] = val;
					}

					if (!columns[el]){
						columns[el] = 0;
					}

					columns[el]++;
				}
			});
		}
	});

	var sortColumns = Object.keys(columns).sort();

	return {
		series: series,
		columns: sortColumns
	};
};

/**
 * get a unique key for this indicator
 * @method getElementKey
 */
Modcharts.prototype.getElementKey = function(indicator){

	return [
		indicator.params.uid,
		indicator.params.symbol || this.params.symbol,
		indicator.params.id
	].join("-");
};

/**
 * process d3 csv responses into standardized data structure
 * @method processCSV
 * @param {Array<object>} dataIn
 */
Modcharts.prototype.processCSV = function(dataIn){

	if (!dataIn || dataIn.length === 0) {
		return -1;
	}

	var data = {"price": []};

	for (var x=0; x < dataIn.length; x++){
		var d = dataIn[x];

		data.price.push(
			{ date:new Date(d.date), open:+d.open, high:+d.high, low:+d.low, close:+d.close }
		);
	}

	this.dataPrimary = data.price;

	this.eachPanel(function(panel){

		panel.xAxis.scale[0] = panel.xAxis.getScale([data.price[0].date, data.price[data.price.length - 1].date]);

	});

	this.labels = this.getTimeIndices(data.price);

	return data;
};

/**
 * similar to processChartAPIData, this will convert all custom datasets into the native date format, also
 * ensuring date inputs are parsed as Date objects
 */
Modcharts.prototype.processCustomData = function(dataIn){

	var data = {}, x, d, datapoint, self = this;

	$.each(dataIn, function(customId, customRows){

		data[customId] = [];

		for (x=0; x < customRows.length; x++){

			d = customRows[x];

			datapoint = {};

			$.each(d, function(key, value){

				if (key === "date"){

					if (/^\d{5}$/.test(value.toString()) || /\d{5}\.\d+/.test(value.toString())){

						datapoint.date = self.msToJsDate(value);

					} else {

						datapoint.date = new Date(value);

					}

				} else {

					datapoint[key] = value;

				}
			});

			data[customId].push(
				datapoint
			);
		}

	});

	this.dataPrimary = this.getFirstDataset(data);

	return data;
};

/**
 * Convert dates into legacy structure
 */
Modcharts.prototype.convertSeriesDataDates = function(dates){

	return dates;
};

/**
 * Convert newer chartapi data format into legacy structure
 */
 Modcharts.prototype.convertSeriesDataResponse = function(dataIn){

	var components = dataIn.Elements, component, elements = {}, label;

	if (dataIn.Dates){
		dataIn.Dates = this.convertSeriesDataDates(dataIn.Dates);
	}

	for (var x=0; x < components.length; x++){

		component = components[x];
		label = (component.Label || component.Id).split("-")[0];

		elements[label] = this.convertSeriesComponent(components[x]);
	}

	dataIn.Elements = elements;

	delete dataIn.ComponentSeries;

	return dataIn;
};

/**
 */
 Modcharts.prototype.convertSeriesComponent = function(component){

 	var self = this,
 		componentOut = {},
 		label = (component.Label || component.Id).split("-")[0],
 		series = {};

	$.each(component.ComponentSeries, function(){

		series[this.Type.toLowerCase()] = {
			"min": this.MinValue,
			"max": this.MaxValue,
			"minDate": this.MinValueDate,
			"maxDate": this.MaxValueDate,
			"values": this.Values,
			"dates": self.convertSeriesDataDates(this.Dates || [])
		};
	});

	componentOut[component.Type] = {
		"OverlayIndicators": [],
		"CompanyName": component.CompanyName,
		"Currency": component.Currency,
		"Dates": this.convertSeriesDataDates(component.Dates || []),
		"ExchangeId": component.ExchangeId,
		"Error": component.Error,
		"Id": label,
		"IssueType": component.IssueType,
		"Positions": null,
		"QuoteTimeLast": -1,
		"Series": series,
		"Status": component.Status,
		"StatusString": (component.Message && component.Message.length) ? component.Message : (component.Status === 1) ? "Success" : "",
		"Symbol": component.Symbol,
		"TimingData": component.TimingData,
		"TimingRender": component.TimingRender,
		"Type": component.Type,
		"UtcOffsetMinutes": component.UtcOffsetMinutes,
		"XSegments": null
	};

	// store metadata in separate collection
	if (component.Meta){
		this.metaData[component.Label] = component.Meta;
	}

	if (component.OverlayIndicators){

		for (var x=0; x < component.OverlayIndicators.length; x++){

			componentOut[component.Type].OverlayIndicators.push(this.convertSeriesComponent(component.OverlayIndicators[x]));

		}
	}

	return componentOut;
};

/**
 * The final stage of loading new data:
 * process ChartAPI response
 * convert response to new api format
 * precalculate label datasets
 * update parent class x-scales
 * redraw
 * @method processChartAPIResponse
 * @param {string} error
 * @param {object} dataIn
 * @param {Function} callback
 * @return {Function}
 */
Modcharts.prototype.processChartAPIResponse = function(dataIn, error, callback, args){

	var self = this,
		result;

	if (!args){

		args = {};

	}

	// clear error messages
	this.eachPanel(function(panel){

		panel.rootError.html("");
		
	});

	if (error){

		return this.processChartAPINullResponse(dataIn, error, callback, args);

	} else {

		// convert from new chartapi format
		if (dataIn && dataIn.Elements && typeof dataIn.Elements.length === "number"){

			dataIn = this.convertSeriesDataResponse(dataIn);

		}

		// get result in modcharts format
		result = this.processChartAPIData(dataIn, args);

		if (this.timeService.status === 0 && dataIn.TimeService.Status === 0 && !args.silent) {

			// timeservice request was null
			return this.processChartAPINullResponse(dataIn, error, callback, args);

		} else if (!this.dataPrimary || !this.dataPrimary.length || result === null){

			// main dataset was null
			return this.processChartAPINullResponse(dataIn, error, callback, args);

		} else if (this.dataPrimary.length < 2 && !this.isMarkerDomainAdjusted() && !args.silent){

			// line/mountain charts shouldn't attempt to draw until we have at least two datapoints
			return this.processChartAPINullResponse(dataIn, error, callback, args);

		} else {

			// create exchangeDates collection based on the params.days and/or first/last data dates
			if (!this.exchangeDates || !this.exchangeDates.length){

				this.exchangeDates = this.panels[0].xAxis.getExchangeRuler();

				// create a full collection of fresh labels.  a subset of these are chosen during xaxis renders.
				self.panels[0].xAxis.labeler.createLabels();
			}

			// valid data result.  either prepend to this.data or replace this.data
			if (args.prepend){

				// prepend to beginning
				this.data = this.prependChartAPIResponse(result, this.data);

			} else if (args.silent){

				// append to end
				this.data = this.appendChartAPIResponse(result, this.data);

			} else {

				// replace everything
				this.data = result;

			}

			// clean up any indicators associated with invalid/failed symbols
			this.data = this.processInvalidSymbols(this.data);

			// get an appropriate xaxis domain for this data
			var domain = this.getDefaultDomain(this.data);

			// reset each xAxis domain
			this.eachPanel(function(panel){

				panel.xAxis.scale[0] = panel.xAxis.getScale(domain);

			});
		}
	}

	// resize / set panel dimensions
	if (!args.silent){
		this.resize();
	}

	var status = ((error || result === null) && !args.prepend) ? 0 : 1;

	args = $.extend({status: status}, args);

	this.renderQueue();

	// update panel legends
	this.eachPanel(function(panel){ panel.updateLegend(); });

	this.loadingStop();

	if (!this.params.zoomEnabled){

		this.setZoomEnabled(false);

	} else {

		this.updateZoom();
	}

	// callback to inform calling page that data request has completed
	this.onLoadComplete(args);

	if (callback){

		return callback(this);
	}
};

/**
 * handle several types of data failures
 */
Modcharts.prototype.processChartAPINullResponse = function(dataIn, error, callback, args) {

	this.loadingStop();

	var statusReturn = {
		status: 0,
		statusMsg: ""
	};

	if (args.prepend){

		statusReturn.statusMsg = "Prepend error - result was null";

		// callback to inform calling page of prepend error
		if (this.onPrependError){
			this.onPrependError(statusReturn, error);
		}

	} else if (args.silent) {

		statusReturn.statusMsg = "Poll error " + new Date();

		// callback to inform calling page of poll error
		if (this.onPollError){
			this.onPollError(statusReturn, error);
		}

	} else {

		this.status = 0;
		this.clearPanels();
		this.data = null;
		this.showMessageChartNotAvailable();

		statusReturn.statusMsg = "Invalid chart data";

		// callback to inform calling page of data request error
		if (this.onDataError){
			this.onDataError(statusReturn, error);
		}
	}

	// re-enable zoom
	if (this.params.zoomEnabled){
		this.setZoomEnabled(true);
	}

	// callback to inform calling page that data request has completed
	this.onLoadComplete(args);

	if (callback){

		return callback(this);
	}
};

// invalid indicators
// if a symbol was invalid, remove any indicators assigned to it, and remove from symbolCompare collection
Modcharts.prototype.processInvalidSymbols = function(data) {

	var symbolCompare, x, i, panel = this.panels[0];

	for (i = this.params.symbolCompare.length - 1; i >= 0; i--){

		symbolCompare = this.params.symbolCompare[i];

		if (!data[symbolCompare]){

			this.params.symbolCompare.splice(i,1);

			for (x = panel.indicators.length -1; x >= 0; x--){
				if (panel.indicators[x].params.symbol === symbolCompare){
					panel.removeIndicator(panel.indicators[x]);
				}
			}
		}
	}

	return data;
};

// add result to beginning of current dataset
Modcharts.prototype.prependChartAPIResponse = function(result, data) {

	var newDate, x = 0;

	$.each(data, function(symbol){

		if (result[symbol]){

			$.each(result[symbol], function(row){

				// row === "price"
				$.each(this, function(uid){

					// this === this.data.GE.price.<uid>
					if (this.length){

						for (x = this.length - 1; x >= 0; x--){

							newDate = this[x].date;

							// only splice in the new datapoint if it's earlier than the first date
							if (!data[symbol][row][uid].length){

								data[symbol][row][uid].push(this[x]);

							} else if (newDate < data[symbol][row][uid][0].date){

								data[symbol][row][uid].splice(0, 0, this[x]);
							}
						}
					}
				});
			});
		}
	});

	return data;
};

// add result to end of current dataset
Modcharts.prototype.appendChartAPIResponse = function(result, data) {

	var x = 0, currData = [];

	$.each(data, function(symbol){

		if (result[symbol]){

			$.each(result[symbol], function(row){

				// row === "price"
				$.each(this, function(uid){

					// this === this.data.GE.price.<uid>

					currData = data[symbol][row][uid];

					for (x = 0; x < this.length; x++){

						// only append the new datapoint if it's >= last existing date
						if (!currData.length){

							currData.push(this[x]);

						} else if (this[x].date - currData[currData.length - 1].date === 0){

							currData[currData.length - 1] = this[x];

						} else if (this[x].date > currData[currData.length - 1].date){

							currData.push(this[x]);

						}
					}
				});
			});
		}
	});

	return data;
};

/**
 * similar to processChartAPIResponse, this is the final stage of loading a chart with custom data.
 * errors are handled, "this.data" is populated (via processCustomData), panel domains reset,
 * exchangeDates collection is created, label collections created, loading graphic removed and final callbacks called.
 */
Modcharts.prototype.processCustomResponse = function(dataIn, error, callback, args){

	var self = this,
		isValid = true;

	if (!args){

		args = {};

	}

	if (error){

		this.warn(self.supplant("XHR error {status}: {msg}", { status:error.status || "-1", msg: error.statusText || "Unknown status" }));
		this.warn(error.responseText ? error.responseText : "Unknown error");
		isValid = false;

	} else {

		this.clearMessage();

	 	if (!dataIn){

			return this.processChartAPINullResponse(callback, args);

		} else {

			// valid data result.  replace this.data
			this.data = this.processCustomData(dataIn, args);

			// create exchangeDates collection
			if (!this.exchangeDates || !this.exchangeDates.length){

				this.exchangeDates = this.panels[0].xAxis.getCustomRuler();

				// create a full collection of fresh labels
				self.panels[0].xAxis.labeler.createLabels();
			}

			var domain = this.getDefaultDomain(this.data);

			// set every panel's xAxis scale
			this.eachPanel(function(panel){

				panel.xAxis.scale[0] = panel.xAxis.getScale(domain);

			});
		}
	}

	// resize / set panel dimensions
	this.resize();

	var status = (error && !args.prepend) ? 0 : 1;

	args = $.extend({status: status}, args);

	this.status = status;

	// don't attempt to render invalid datasets
	if (isValid){

		this.renderQueue();

	}

	this.eachPanel(function(panel){ panel.updateLegend(); });

	this.loadingStop();

	if (!this.params.zoomEnabled){

		this.setZoomEnabled(false);

	}

	this.onLoadComplete(args);

	if (callback){

		return callback(this);
	}
};

/**
 * convert local date to UTC
 * @method getUTCDate
 * @param {Date} date
 * @return {Date}
 */
Modcharts.prototype.getUTCDate = function(date){

	date = new Date(date);

	return new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		date.getUTCHours(),
		date.getUTCMinutes(),
		date.getUTCSeconds()
	);
};

/**
 * convert arrays of numbers from raw strings or msdates
 * @method convertChartApiDates
 * @param {array} data
 * @param {int} utcOffset in minutes (should be sourced from chartapi request)
 * note: if a 24-hour axis is needed, the utcoffset should be the same for all symbols.
 * if symbols should all be plotted in exchange local time, pass individual respective utcoffsets
 * the utc offset is not applied to interday charts.
 * @return {array}
 */
Modcharts.prototype.convertChartApiDates = function(data, utcOffset){

	var dataOut = [], date, hours, minutes, seconds, pct, i, iLen = data.length;

	for (i = 0; i < iLen; i++) {

		if (/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(\.*\d*)/.test(data[i])){

			hours = Number(RegExp.$4);
			minutes = Number(RegExp.$5);
			seconds = Number(RegExp.$6);
			pct = Number(RegExp.$7);

			date = new Date(Number(RegExp.$1), Number(RegExp.$2) - 1, Number(RegExp.$3), hours, minutes, seconds);

			// if percent of second is > 0.5, round up to next second
			if (pct >= 0.5){
				date.setUTCSeconds(date.getUTCSeconds() + 1);
			}

			if (this.state.isIntraday){

				// utc offset to get dates back to local exchange time
				date.setUTCMinutes(date.getUTCMinutes() + utcOffset);

			}

			date.setTime(Math.round(date.getTime() / 60000) * 60000);

			dataOut.push(date);

		} else if (/^\d{5}$/.test(data[i]) || /\d{5}\.\d+/.test(data[i])){

			date = this.msToJsDate(data[i]);

			if (this.state.isIntraday){

				// utc offset to get dates back to local exchange time
				date.setUTCMinutes(date.getUTCMinutes() + utcOffset);

			}

			dataOut.push(date);

		} else {

			console.log("Error parsing dates", data[i]);
		}
	}

	return dataOut;
};

/**
 * Convert OA Dates to JS
 * @method msToJsDate
 * @param {int} msDate
 * @return {Date}
 */
Modcharts.prototype.msToJsDate = function(msDate){

	var jO = new Date(((msDate-25569)*86400000)),
		tz = jO.getTimezoneOffset();

	return new Date(((msDate-25569+(tz/(60*24)))*86400000));
};

/**
 * Convert JS Date to OA Date
 * @method jsToMsDate
 * @param {Date} jsDate
 * @return {int}
 */
Modcharts.prototype.jsToMsDate = function(jsDate){

	return (jsDate - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
};

/**
 * convert dynamic ChartAPI json into modcharts standardized data structure.
 * @method processChartAPIData
 * @param {string} error
 * @param {object} dataIn
 * @return {object}
 */
Modcharts.prototype.processChartAPIData = function(dataIn, args){

	if (!args){ args = {}; }

	// hard failures
	if (!dataIn || !dataIn.Dates || !dataIn.Elements || (!args.prepend && !args.silent && !dataIn.TimeService)) {

		return null;
	}

	this.processChartAPIElementsFailure(dataIn);

	// chartapi will return the normalizedate if used either implicitly in the service logic or explicitly as an input
	if (dataIn && dataIn.NormalizeDate){

		if (/^\d{5}$/.test(dataIn.NormalizeDate.toString())){

			this.params.normalizeDate = this.msToJsDate(dataIn.NormalizeDate);

		} else {

			this.params.normalizeDate = new Date(dataIn.NormalizeDate);
		}

		// deprecated, use dataIn.NormalizeValues instead
		if (dataIn.NormalizeCloseValue){
			this.params.normalizeValue = Number(dataIn.NormalizeCloseValue);
		}

		if (dataIn.NormalizeValues){
			this.params.normalizeValues = dataIn.NormalizeValues;
		}
	}

	this.clearMessage();

	var elementsIn = this.getChartAPIElements(dataIn),
		dataOut = this.createDataSeries(elementsIn, args);

 	// parse timeservice data
 	this.processTimeServiceData(dataIn.TimeService, args);

 	// set primary data reference and overall status
	if (!args.prepend && !args.silent){
		this.dataPrimary = this.getPrimaryDataReference(elementsIn, dataOut);
		this.status = this.dataPrimary.length ? 1 : 0;
	}

	return dataOut;
};

/*

Modcharts.prototype.processChartAPIFailure = function(data, args) {

	// chartapi legacy
	if (data && typeof data.StatusString !== "undefined" && data.StatusString.length && !args.prepend && !args.silent){

		this.warn("ChartAPI StatusString: " + data.StatusString);
	}

	// chartapi
	if (data && typeof data.Status !== "undefined" && !args.prepend && !args.silent){

		this.warn("ChartAPI Status: " + data.Status);
	}

	// timeservice
	if (data && (!data.TimeService || data.TimeService.Status !== 1)){

		this.warn("Time Service not found" + ((data.TimeService && typeof data.TimeService.Status === "number") ? " " + JSON.stringify(data.TimeService) : ""));
	}
	if (args.silent || args.prepend){

		return null;

	} else if (this.onErrorCallback){

		// error callback
		this.onErrorCallback(data || {}, args || {});
		return null;

	} else {

		// chart not available
		this.showMessageChartNotAvailable();
		return null;
	}
};

*/


/**
 * process element-level failures
 */
Modcharts.prototype.processChartAPIElementsFailure = function(data) {

	var self = this;

	if (data.Elements){

		$.each(data.Elements, function(){

			$.each(this, function(){

				if (this.Error){
					self.warn("Element error: " + [(this.Symbol || ""), this.Error.Code, this.Error.Message].join(" : "));

					if (self.onElementErrorCallback) {
						self.onElementErrorCallback(this);
					}
				}
			});
		});
	}
};

/**
 * step 1: flatten uid/elementId together for easier parsing and attach dates
 * dates can live in three places: global, element-level, or series-level.
 * the majority of indicators with series-level dates share the same dates across all series.  psar is the exception.
 */
Modcharts.prototype.getChartAPIElements = function(data) {

	var elements = [], globalUTCOffset, globalDates = [], self = this;

	// find global utc offset and generate globalDates
	$.each(data.Elements, function(){

		$.each(this, function(){

			if (typeof globalUTCOffset !== "number" && this.Symbol === self.params.symbol && this.Type === "price"){
				globalUTCOffset = this.UtcOffsetMinutes;
			}

			if (typeof globalUTCOffset !== "number" && self.xref[self.params.symbol] && typeof self.xref[self.params.symbol].utcOffset === "number"){
				globalUTCOffset = self.xref[self.params.symbol].utcOffset;
			}

			// generate the globalDates collection once.
			if (!globalDates.length && typeof globalUTCOffset === "number"){
				globalDates = self.convertChartApiDates(data.Dates, globalUTCOffset);
			}

		});
	});

	// extract elements from the returned data
	$.each(data.Elements, function(){

		$.each(this, function(){

			// regular element
			elements.push(self.getChartAPIElement(this, data, globalUTCOffset, globalDates));

			// child elements
			$.each(this.OverlayIndicators || [], function(){

				elements.push(self.getChartAPIElement(self.getFirstDataset(this), data, globalUTCOffset, globalDates));

			});
		});
	});

 	return elements;
};

Modcharts.prototype.getChartAPIElement = function(element, data, globalUTCOffset, globalDates){

	var isValidElement = false,
		self = this,
		newElement = {
			currency: element.Currency,
			uid: element.Id,
			series: {},
			issueType: element.IssueType,
			companyName: element.CompanyName,
			exchangeId: element.ExchangeId,
			status: element.Status,
			wsodIssue: element.Symbol,
			ticker: this.getSymbolByIndicatorUID(element.Id),
			type: element.Type,
			utcOffset: element.UtcOffsetMinutes,
			meta: element.Meta
		};

	// store company information
	if (typeof newElement.utcOffset === "number" && newElement.exchangeId && newElement.issueType){

		this.xref[newElement.wsodIssue] = {
			companyName: newElement.companyName,
			currency: newElement.currency,
			exchangeId: newElement.exchangeId,
			issueType: newElement.issueType,
			meta: newElement.meta,
			ticker: newElement.ticker,
			utcOffset: newElement.utcOffset
		};
	}

	this.ticker[newElement.ticker] = newElement.wsodIssue;

	// set dates to either element dates or empty
	newElement.dates = (element.Dates && element.Dates.length) ? this.convertChartApiDates(element.Dates, globalUTCOffset) : [];

	// extract series data (eg. open, high, low, close)
	$.each(element.Series || {}, function(seriesId){

		if (this.values && this.values.length){

			newElement.series[seriesId] = this.values;

				// if there were series dates, but no dates at the element level, use the first series dates.
				// exclude the unique psarbuy and psarsell date collections as they are not supported.
				if (this.dates && this.dates.length && !newElement.dates.length && seriesId !== "psarbuy" && seriesId !== "psarsell"){

					newElement.dates = self.convertChartApiDates(this.dates, newElement.utcOffset);
				}

				isValidElement = true;
		}
	});

	// use global dates if there were no dates at the element or series level
	if (!newElement.dates.length && isValidElement){
		newElement.dates = globalDates;
	}

	// reflect pound conversion to pence
	if (newElement.currency === "GBP"){
		//newElement.currency = "GBX";
	}

	// store off currency
	this.state.currency = newElement.currency;

	return newElement;
};

/**
 * step 2: now pivot elements into individual datapoints that contain a date and one value per series (eg. open, high, low, close)
 */
Modcharts.prototype.createDataSeries = function(elements, args) {

	var dataOut = {}, newDatapoint, isValid;

	$.each(elements, function(){

		var symbol = this.ticker,
			currency = this.currency,
			uid = this.uid;

		if (!dataOut[symbol]){
			dataOut[symbol] = {};
		}

		if (!dataOut[symbol][this.type]){
			dataOut[symbol][this.type] = {};
		}

		// grouping by uid isn't really necessary and should be removed one day
		dataOut[symbol][this.type][uid] = [];

		// loop over each element's dates collection and collect into individual datapoints
		for (var i = 0; i < this.dates.length; i++) {

			// only add new datapoints that contain date and value(s)
			isValid = false;

			// stub out a new datapoint with this date
			newDatapoint = { date: this.dates[i] };

			// add all series (open, high, low close) to this datapoint
			$.each(this.series, function(seriesId){

				// special case: ignore new previousclose values on prepends
				if (seriesId === "previousclose" && args.prepend){
					return true;
				}

				newDatapoint[seriesId] = this[i];

				isValid = true;
			});

			// add currency to dividend datapoints
			if (this.type === "dividends"){
				newDatapoint.currency = currency;
			}

			// if valid, append to main dataset
			if (isValid){

				dataOut[symbol][this.type][uid].push(newDatapoint);
			}
		}
	});

 	return dataOut;
};

/**
 * store off primary dataset (convenience)
 */
Modcharts.prototype.getPrimaryDataReference = function(elements, data) {

	var symbol = "", uid = "", self = this, primary = [];

	$.each(elements, function(){

		symbol = this.ticker;
		uid = this.uid;

		if (symbol === self.params.symbol && this.type === "price"){

			primary = data[symbol][this.type][uid];
			return false;
		}
	});

	return primary;
};

/**
 * parse the raw TimeService data into a JSON structure
 * @method processTimeServiceData
 */
Modcharts.prototype.processTimeServiceData = function(data, args) {

	if (!data){ data = {}; }

	var dayKeys = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		dataTypicalIn = data.TypicalSessions || {},
		dataTypical = [],
		rulerSession = {};

	var dayOfWeek, minSession, maxSession, newSession, typicalSessions;

	if (!args.prepend && !args.silent){

		if (this.state.isIntraday){

			this.state.typicalSessions = null; // typical sessions for one single day

			// loop over each day of the week
			for (var dayIdx=0; dayIdx < dayKeys.length; dayIdx++){

				dataTypical[dayIdx] = {
					sessions: [], // individual sessions, used by markers
					rulerSessions: {} // one session per exchange that stretches from its min and max, used by getExchangeRuler
				};

				dayOfWeek = dayKeys[dayIdx];
				minSession = Infinity;
				maxSession = -Infinity;

				// grab all sessions for this day
				typicalSessions = dataTypicalIn[dayOfWeek] || [];

				for (var d=0; d < typicalSessions.length; d++){

					newSession = {
						exchangeId: typicalSessions[d].ExchangeID,
						open: typicalSessions[d].Open,
						close: typicalSessions[d].Close,
						offset: typicalSessions[d].Offset,
						sessionType: typicalSessions[d].SessionType || "NormalSession"
					};

					// store each individual session
					dataTypical[dayIdx].sessions.push(newSession);

					// get ruler session (one session that skips all session breaks)
					rulerSession = dataTypical[dayIdx].rulerSessions[newSession.exchangeId];

					if (!rulerSession){

						dataTypical[dayIdx].rulerSessions[newSession.exchangeId] = {
							open: newSession.open,
							close: newSession.close,
							offset: newSession.offset
						};

					} else {

						rulerSession.open = Math.min(rulerSession.open, newSession.open);
						rulerSession.close = Math.max(rulerSession.close, newSession.close);

					}

					// get min/max session across all exchanges for this day
					minSession = Math.min(minSession, newSession.open);
					maxSession = Math.max(maxSession, newSession.close);

				}

				// save min/max sessions; these are used when setting the initial domain of intraday charts when domain is not specified.
				if (typicalSessions.length){
					dataTypical[dayIdx].min = minSession;
					dataTypical[dayIdx].max = maxSession;
					dataTypical[dayIdx].duration = maxSession - minSession;
				}

				// store off a typical day containing sessions
				if (dataTypical[dayIdx].sessions.length > 0){

					// use the day with the longest session
					if (!this.state.typicalSessions || dataTypical[dayIdx].duration > this.state.typicalSessions.duration){
						this.state.typicalSessions = dataTypical[dayIdx];
					}
				}

			}

			this.timeService.typicalSessions = dataTypical;
		}

		var tradingDays = data.TradingDays || [];

		this.timeService.fullClosures = this.processTimeServiceClosures(data.FullClosures || []);
		this.timeService.nonTradingDays = data.NonTradingDays || [];
		this.timeService.tradingDays = this.processTradingDays(tradingDays);
		this.timeService.status = data.Status;

		// warn on timeservice error
		if (this.timeService.status !== 1) {
 			this.warn("TimeService status: " + this.timeService.status);
 		}
	}
};

/**
 * convert various ISO formats to YYYY-MM-DDTHH:MM:SSZ
 */
Modcharts.prototype.processTradingDays = function(days) {

	if (!days || !days.length) {
		return [];
	}

	var isLongISO = /\:/.test(days[0]) && !/Z/.test(days[0]),
		isShortISO = /^\d{4}-\d{2}-\d{2}$/.test(days[0]),
		x = 0;

	if (isLongISO){ // chartapi doesn't return the "Z"

		for (x=0; x < days.length; x++) {

			days[x] = days[x] + "Z";
		}

	} else if (isShortISO){ // some browsers don't like the short iso form

		for (x=0; x < days.length; x++) {

			days[x] = days[x] + "T00:00:00.000Z";

		}
	}

	return days;
};

/**
 */
Modcharts.prototype.processTimeServiceClosures = function(closures) {

	var closuresOut = [];

	for (var x=0; x < closures.length; x++) {

		var date = closures[x].Date;

		if (/^\d{5}/.test(closures[x].Date.toString())){

			date = this.msToJsDate(closures[x].Date);

		} else {

			date = new Date(closures[x].Date);

			// account for client timezone offset
			date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

		}

		closuresOut.push({
			date: date,
			name: closures[x].Name,
			exchangeIds: (closures[x].ExchangeIDs || "").split(",")
		});
	}

	return closuresOut;
};


 /**
 * Parent class for chart overlay events (dividends, earnings etc.)
 * @class Event
 * @constructor
 * @param {object} args Custom args
 */
Modcharts.Event = function(args) {

	this.panel = args.panel;
	this.params = this.getParams(args);
	this.coords = [];

};

/**
 * A wrapper for getDefaultParams
 * @returns {object}
 */
Modcharts.Event.prototype.getParams = function(args) {

	var params = this.getDefaultParams();
		params.uid = this.panel.core.getIndicatorUID();

	return Modcharts.merge(params, args.params);

};

/**
 * get x/y coordinates for event data
 * @returns {[[x,y,obj],...]}
 */
Modcharts.Event.prototype.getPositions = function(data, eventType){

	if (!data[eventType] || !data.price){

		return [];
	}

	var coords = [],
		date, i, x, y, closestPriceIdx, closestExchangeIdx, dataPrice, dataSeries, customValue,
		dataEvent = data[eventType], isIntraday = this.panel.core.state.isIntraday;

	for (var uid in dataEvent || {}){ if (dataEvent.hasOwnProperty(uid)){

		dataSeries = dataEvent[uid];

		seriesLoop:
		for (i = 0; i < dataSeries.length; i++) {

			if (!dataSeries[i]) { continue; }

			customValue = typeof dataSeries[i].value === "number";

			date = new Date(Date.parse(dataSeries[i].date));

			if (isIntraday){

				// offset date to local tz
				date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

			} else {

				// offset to beginning of day
				date.setHours(0);
				date.setMinutes(0);
				date.setSeconds(0);
				date.setMilliseconds(0);
			}

			closestExchangeIdx = this.panel.core.closestExchangeIndex(date);

			if (customValue){

				x = this.panel.xAxis.scale[0](closestExchangeIdx);
				y = this.panel.yAxis.scale[0](dataSeries[i].value);

			} else {

				if (date > new Date()){ continue seriesLoop; }

				dataPrice = this.getFirstDataset(data.price);
				closestPriceIdx = this.panel.core.getFilterUpper(dataPrice, date);

				x = this.panel.xAxis.scale[0](closestExchangeIdx);
				y = this.panel.yAxis.scale[0](dataPrice[closestPriceIdx].close);
			}

			// must fall within panel area
			if (x > this.panel.size.padding.left && x < this.panel.size.padding.left + this.panel.size.width){

				coords.push({
					x: x,
					y: y,
					event: dataSeries[i],
					uid: this.params.uid
				});
			}
		}
	}}

	return coords;

};

/**
 * the return sole member of events data array
 */
Modcharts.Event.prototype.getFirstDataset = function(data) {

	for (var x in data){ if (data.hasOwnProperty(x)){

		return data[x];
	}}
};

/**
 * render default event flags if none overridden locally
  */
Modcharts.Event.prototype.renderDefault = function(data, eventType, fillColor, label){

	var ctx = this.panel.rootContext,
		sizeFull = 16,
		size = sizeFull / 2,
		padding = 5,
		offsetY = 20,
		i, x, y;

	var coords = this.getPositions(data, eventType);

	ctx.fillStyle = fillColor;
	ctx.textBaseline = "top";

	for (i = 0; i < coords.length; i++) {

		x = coords[i].x;
		y = coords[i].y - offsetY;

		ctx.beginPath();
		ctx.arc(x, y, size, 0, 2 * Math.PI);
		ctx.moveTo(x + size, y+1);
		ctx.lineTo(x, y + sizeFull);
		ctx.lineTo(x - size, y+1);
		ctx.fill();
	}

	ctx.beginPath();

	// label
	ctx.fillStyle = "#222222";
	ctx.font = "bold 14px Arial";

	for (i = 0; i < coords.length; i++) {

		x = coords[i].x;
		y = coords[i].y - offsetY;

		ctx.fillText(label, x - 4.5, y - 7);
	}

	for (i = 0; i < coords.length; i++) {

		x = coords[i].x;
		y = coords[i].y - offsetY;

		coords[i].id = this.params.id;
		coords[i].left = x - (size + padding);
		coords[i].top = y - (size + padding);
		coords[i].right = coords[i].left + sizeFull + (2 * padding);
		coords[i].bottom = coords[i].top + sizeFull + (2 * padding);

		// debug hitbox
		//ctx.rect(coords[i].left, coords[i].top, coords[i].right - coords[i].left, coords[i].bottom - coords[i].top);
	}

	ctx.stroke();

	ctx.closePath();

	this.coords = coords;

};

/**
 * update dom elements using primitive shapes and lines
 */
Modcharts.Event.prototype.render = function() {
	throw new Error("Required Event method not found");
};

/**
 * perform actions before removal
 */
Modcharts.Event.prototype.remove = function() {};

/**
 * check if mouse is within coordinates of one of the currently-visible events
 */
Modcharts.Event.prototype.isWithin = function(mouse) {

	var response = null;
	$.each(this.coords || {}, function(){

		if (mouse[0] > this.left && mouse[1] > this.top && mouse[0] < this.right && mouse[1] < this.bottom){

			response = this;
			return false;

		}
	});

	return response;
};

/**
 * return the default params for this type of Event
 * @returns {object}
 */
Modcharts.Event.prototype.getDefaultParams = function() {
	throw new Error("Required Event method not found");
};

/**
 * Earnings event
 * @constructor
 * @class AnnouncedEarningsEvent
 * @extends Event
 */
Modcharts.AnnouncedEarningsEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.AnnouncedEarningsEvent, Modcharts.Event);

Modcharts.AnnouncedEarningsEvent.prototype.getDefaultParams = function() {

	return {
		id: "announcedearnings",
		name: "Announced Earnings",
		description: "description"
	};
};

Modcharts.AnnouncedEarningsEvent.prototype.render = function(data){

	this.renderDefault(data, "announcedearnings", "#99F997", "E");

};

/**
 * Custom event
 * @constructor
 * @class CustomEvent
 * @extends Event
 */
Modcharts.CustomEvent = function(args){

	this.superclass.call(this, args);

	var core = this.panel.core;

	// tag each datapoint with a uid
	$.each(this.params.dataset, function(){
		this.uid = core.getUID();
	});

};

Modcharts.Extend(Modcharts.CustomEvent, Modcharts.Event);

Modcharts.CustomEvent.prototype.getDefaultParams = function() {

	return {
		id: "custom",
		dataset: [],
		renderMethod: null,
		removeMethod: null
	};
};

Modcharts.CustomEvent.prototype.addDatapoint = function(datapoint) {

	if (datapoint){

		// add a uid
		datapoint.uid = this.panel.core.getUID();

		this.params.dataset.push(datapoint);

		return datapoint;
	}
};

Modcharts.CustomEvent.prototype.removeDatapointByUID = function(uid) {

	if (uid){

		for (var x=this.params.dataset.length - 1; x >=0; x--){

			if (this.params.dataset[x].uid === uid){

				this.params.dataset.splice(x, 1);
			}
		}
	}
};

/**
 * perform actions before removal
 */
Modcharts.CustomEvent.prototype.remove = function() {

	if (this.params.removeMethod){

		this.params.removeMethod(this);

	}
};

Modcharts.CustomEvent.prototype.render = function(data){

	if (this.params.renderMethod && this.params.dataset){

		this.params.renderMethod(this.getPositions({"custom": [this.params.dataset], "price": data.price}, "custom"), this);

	} else {

		this.panel.core.warn("Missing custom event renderMethod or dataset");
	}

};

/**
 * Dividend event
 * @constructor
 * @class DividendEvent
 * @extends Event
 */
Modcharts.DividendEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.DividendEvent, Modcharts.Event);

Modcharts.DividendEvent.prototype.getDefaultParams = function() {

	return {
		id: "dividends",
		name: "Dividends",
		description: "description"
	};
};

Modcharts.DividendEvent.prototype.render = function(data){

	this.renderDefault(data, "dividends", "#98E7F8", "D");

};

/**
 * DividendCustom event
 * @constructor
 * @class DividendCustomEvent
 * @extends Event
 */
Modcharts.DividendCustomEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.DividendCustomEvent, Modcharts.Event);

Modcharts.DividendCustomEvent.prototype.getDefaultParams = function() {

	return {
		id: "dividendscustom",
		name: "Custom Dividends",
		description: "description"
	};
};

Modcharts.DividendCustomEvent.prototype.render = function(data){

	this.renderDefault(data, this.params.id, "#97BEF9", "D");

};

/**
 * Earnings event
 * @constructor
 * @class EarningsEvent
 * @extends Event
 */
Modcharts.EarningsEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.EarningsEvent, Modcharts.Event);

Modcharts.EarningsEvent.prototype.getDefaultParams = function() {

	return {
		id: "earnings",
		name: "Earnings",
		description: "description",
		inputs: [
			{ name: "includeextraordinary", value: 1 }
		]
	};
};

Modcharts.EarningsEvent.prototype.render = function(data){

	this.renderDefault(data, "earnings", "#99F997", "E");

};

/**
 * EarningsCustomEvent event
 * @constructor
 * @class EarningsCustomEvent
 * @extends Event
 */
Modcharts.EarningsCustomEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.EarningsCustomEvent, Modcharts.Event);

Modcharts.EarningsCustomEvent.prototype.getDefaultParams = function() {

	return {
		id: "earningscustom",
		name: "Custom Earnings",
		description: "description",
		inputs: [
			{ name: "includeextraordinary", value: 1 }
		]
	};
};

Modcharts.EarningsCustomEvent.prototype.render = function(data){

	this.renderDefault(data, this.params.id, "#97F9D5", "E");

};

/**
 * Revenue event
 * @constructor
 * @class EarningsEvent
 * @extends Event
 */
Modcharts.RevenueEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.RevenueEvent, Modcharts.Event);

Modcharts.RevenueEvent.prototype.getDefaultParams = function() {

	return {
		id: "revenues",
		name: "Revenues",
		description: "description"
	};
};

Modcharts.RevenueEvent.prototype.render = function(data){

	this.renderDefault(data, "revenues", "#99F997", "R");

};

/**
 * Splits event
 * @constructor
 * @class SplitsEvent
 * @extends Event
 */
Modcharts.SplitsEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.SplitsEvent, Modcharts.Event);

Modcharts.SplitsEvent.prototype.getDefaultParams = function() {

	return {
		id: "splits",
		name: "Splits",
		description: "description"
	};
};

Modcharts.SplitsEvent.prototype.render = function(data){

	this.renderDefault(data, "splits", "#D398F8", "S");

};

/**
 * Splits event
 * @constructor
 * @class SplitsCustomEvent
 * @extends Event
 */
Modcharts.SplitsCustomEvent = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.SplitsCustomEvent, Modcharts.Event);

Modcharts.SplitsCustomEvent.prototype.getDefaultParams = function() {

	return {
		id: "splitscustom",
		name: "Custom Splits",
		description: "description"
	};
};

Modcharts.SplitsCustomEvent.prototype.render = function(data){

	this.renderDefault(data, this.params.id, "#E498F8", "S");

};

 /**
 * Flags show up in a panel's yaxis gutter and are generated automatically (not saved)
 * @class Flag
 * @constructor
 * @param {object} args Custom args
 */
Modcharts.Flag = function(args) {

	if (!args){
		args = {};
	}

	this.id = args.id;
	this.panel = args.panel;
	this.indicator = args.indicator;
	this.el = {};

	this.style = this.getStyle(args || {});

};

/**
 * merge inputs with this default style
 */
Modcharts.Flag.prototype.getStyle = function(args){

	var defaultStyle = {
		backgroundColor: "#555",
		labelColor: "#fff",
		labelFontFamily: "Arial",
		labelFontSize: 12
	};

	if (this.panel){
		defaultStyle.labelFontFamily = this.panel.params.style.axisFontFamily;
		defaultStyle.labelFontSize = this.panel.params.style.axisFontSize;
	}

	// merge derived flag's default style into local style
	var styleOut = $.extend(true, defaultStyle, this.getDefaultStyle(args));

	// merge in top-level custom style for this flag
	var customStyle = this.panel.core.getFlagStyle(this.id);
	if (customStyle[this.id]){
		$.extend(true, styleOut, customStyle[this.id]);
	}

	return styleOut;
};

/**
 * hide all els
 */
Modcharts.Flag.prototype.hide = function(){

	$.each(this.el, function(){
		this.style("visibility", "hidden");
	});
};

/**
 * show all els
 */
Modcharts.Flag.prototype.show = function(){

	$.each(this.el, function(){
		this.style("visibility", null);
	});
};

Modcharts.Flag.prototype.getValue = function(){

};

/**
 * delete all els and their wrapper
 */
Modcharts.Flag.prototype.remove = function(){

	if (this.el.flagBody){
		$(this.el.flagBody.node().parentNode).remove();
	}
};

Modcharts.Flag.prototype.getFlagGroupSVG = function(){

	var group = this.panel.rootOverlay.append("g");

	if (this.id){
		group.attr("class", "modcharts-flag-" + this.id);
	}

	return group;
};

/**
 * return svg shape element for flag.  group is a d3 selection of an svg group element
 * group is passed in here because svg/d3 are a little awkward in creating elements with no parent
 * @returns d3 svg polygon selection
 */
Modcharts.Flag.prototype.getFlagBody = function(group){

	var body = group.append("polygon");

	// background color
	body.style("fill", this.style.backgroundColor);

	return body;
};

/**
 * return svg shape for crosshair flag text.  group is a d3 selection of an svg group element
 * group is passed in here because svg/d3 are a little awkward in creating elements with no parent
 * @returns d3 svg text selection that will receive repeated updates to its value during crosshair updates
 */
Modcharts.Flag.prototype.getFlagLabel = function(group){

	var label = group.append("text")
		.style("fill", this.style.labelColor)
		.style("font-family", this.style.labelFontFamily)
		.style("font-size", this.style.labelFontSize + "px")
		.attr("dy", "0.35em"); // dominant-baseline doesn't seem to work right in IE

	return label;
};

/**
 * update flag polygon points
 * @returns d3 svg polygon selection
 */
Modcharts.Flag.prototype.updateFlagBody = function(panel, x, y){

	if (!this.el.flagBody || window.isNaN(x) || window.isNaN(y)){ return; }

	var x2 = x + panel.size.padding.right,
		size = 7,
		points = [
			[x, y],
			[x + size, y - size],
			[x2, y - size],
			[x2, y + size],
			[x + size, y + size]
		];

	// polygon points
	for (var i = 0; i < points.length; i++) {
		points[i] = points[i].join(" ");
	}

	this.el.flagBody.attr("points", points.join(","));

};

/**
 * update flag label position and value
 * @returns d3 svg polygon selection
 */
Modcharts.Flag.prototype.updateFlagLabel = function(panel, val, x, y){

	if (!this.el.flagLabel || window.isNaN(x) || window.isNaN(y)){ return; }

	// update label
	var isNormalized = panel.isNormalized(),
		formatString = panel.yAxis.getFormatString(null, null, 5),
		formatValue = panel.yAxis.getFormatValue(panel.yAxis.scale[0].tickFormat(1, formatString)(val), null, isNormalized);

	// coords
	this.el.flagLabel.attr("x", x + 7);
	this.el.flagLabel.attr("y", y);

	// update label value
	this.el.flagLabel.text(formatValue);

};

// Modcharts.Flag.prototype.render = function(){

// 	throw new Error("Required Flag method not found");

// };

Modcharts.Flag.prototype.render = function(val){

	var panel = this.panel;

	if (!val){ val = this.getValue(); }

	// create body and label once
	if (!this.el.flagBody){
		var group = this.getFlagGroupSVG();
		this.el.flagBody = this.getFlagBody(group);
		this.el.flagLabel = this.getFlagLabel(group);
	}

	// update background color - this may have changed if the parent indicator's styles were modified
	var origColor = this.style.backgroundColor,
		indicatorStyle = (this.indicator) ? this.indicator.params.style : {};

	if (indicatorStyle.lineColor){
		this.style.backgroundColor = indicatorStyle.lineColor;
	}

	if (origColor !== this.style.backgroundColor){
		this.el.flagBody.style("fill", this.style.backgroundColor);
	}

	if (val){

		var h = 14,
			x = panel.size.width + panel.size.padding.left + 1,
			y = panel.yAxis.scale[0](val),
			top = panel.getPanelTop(this),
			bottom = top + panel.size.height;

		// check collision with top/bottom edges
		if (y + h > bottom || y - h < top) {
			this.hide();
			return;
		}

		this.updateFlagBody(panel, x, y);
		this.updateFlagLabel(panel, val, x, y);

		this.show();
	}
};

/**
 * Crosshair flag
 * @constructor
 * @class CrosshairFlag
 * @extends Flag
 */
Modcharts.CrosshairFlag = function(args){

	this.superclass.call(this, args);
};

Modcharts.Extend(Modcharts.CrosshairFlag, Modcharts.Flag);

/**
 * merge inputs with this default style
 */
Modcharts.CrosshairFlag.prototype.getDefaultStyle = function(args){

	var core = this.panel.core,
		panelStyle = this.panel.params.style;

	return $.extend({
		backgroundColor: core.getStyle(".modcharts-flag-crosshair", "background-color") || "#555",
		labelColor: core.getStyle(".modcharts-flag-crosshair", "color") || "#fff",
		labelFontFamily: core.getStyle(".modcharts-flag-crosshair", "font-family") || panelStyle.axisFontFamily || "Arial",
		labelFontSize: core.getStyle(".modcharts-flag-crosshair", "font-size") || panelStyle.axisFontSize || 12
	}, args.style || {});

};

/**
 * Last Close flag
 * @constructor
 * @class LastCloseFlag
 * @extends Flag
 */
Modcharts.LastCloseFlag = function(args){

	this.superclass.call(this, args);
};

Modcharts.Extend(Modcharts.LastCloseFlag, Modcharts.Flag);

/**
 * merge inputs with this default style
 */
Modcharts.LastCloseFlag.prototype.getDefaultStyle = function(args){

	var core = this.panel.core,
		panelStyle = this.panel.params.style,
		indicatorStyle = (this.indicator) ? this.indicator.params.style : {};

	return $.extend(true, {
		backgroundColor: core.getStyle(".modcharts-flag-lastclose", "background-color") || indicatorStyle.lineColor || "#555",
		labelColor: core.getStyle(".modcharts-flag-lastclose", "color") || "#fff",
		labelFontFamily: core.getStyle(".modcharts-flag-lastclose", "font-family") || panelStyle.axisFontFamily || "Arial",
		labelFontSize: core.getStyle(".modcharts-flag-lastclose", "font-size") || panelStyle.axisFontSize || 12
	}, args.style || {});

};

Modcharts.LastCloseFlag.prototype.getValue = function(){

	if (!this.panel || !this.panel.core.data){

		return null;

	}

	var data = this.panel.core.data[this.indicator.params.symbol],
		val = null,
		symbolData = this.getFirstDataset(data ? data.price || [] : []);

	if (symbolData && symbolData.length){

		for (var x = symbolData.length - 1; x >= 0; x--){

			val = symbolData[x].close;

			if (val){

				break;
			}
		}

		val = val.toFixed(4);

		return val;
	}
};

Modcharts.LastCloseFlag.prototype.getFirstDataset = function(data) {

	for (var x in data){ if (data.hasOwnProperty(x)){

		return data[x];

	}}
};

// Modcharts.LastCloseFlag.prototype.getColor = function() {

// 	return this.indicator.params.style.lineColor;

// };

/**
 * Indicator objects are indicator parameters (period, smoothing) applied to one or more Markers
 * @class Indicator
 * @constructor
 * @param {object} args Custom args
 */
Modcharts.Indicator = function(args){

	args = args || {};
	this.scale = args.scale || [0,0];
	this.panel = args.panel;
	this.params = this.getParams(args.params);
	this.markers = this.getMarkers();
	this.flags = {};

};

/**
 * Return merged collection of default and custom params
 * @param {object} args
 * @returns {object}
 */
Modcharts.Indicator.prototype.getParams = function(args) {

	var params = {
		name: "Chart Indicator",
		id: "indicator",
		uid: this.panel.core.getIndicatorUID(),
		inputs: [], // inputs used by chart api
		extraInputs: [], // inputs not used by api (see mass index)
		style: {}
	};

	// merge derived tool's default params into local params
	var paramsOut = $.extend(true, params, this.getDefaultParams());

	// merge in top-level custom style for this indicator
	var customStyle = this.panel.core.getIndicatorStyle(paramsOut.id);
	if (customStyle[paramsOut.id]){
		$.extend(true, paramsOut.style, customStyle[paramsOut.id]);
	}

	// merge in paramsCustom argument
	$.extend(true, paramsOut, args);

	return paramsOut;

};

/**
 * inspect css for a style property
 */
 Modcharts.Indicator.prototype.getStyle = function(selector, property) {

	return this.panel.core.getStyle(selector, property);

};

/**
 * return value of input name
 */
 Modcharts.Indicator.prototype.getInput = function(name) {

	for (var x=0; x < this.params.inputs.length; x++){

		if (this.params.inputs[x].name === name){

			return this.params.inputs[x].value;
		}
	}

	for (x=0; x < (this.params.extraInputs || []).length; x++){

		if (this.params.extraInputs[x].name === name){

			return this.params.extraInputs[x].value;
		}
	}

};

/**
 * set params.input value
 */
 Modcharts.Indicator.prototype.setInput = function(name, value) {

	var indicatorInput = this.params.inputs.filter(function(row){ return row.name === name; });

	if (indicatorInput.length){
		indicatorInput[0].value = value;
	}

};

/**
 * clip context to panel size
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} direction specify which area to clip - above or below value
 * @param {int} value - the value limit of clip
 */
Modcharts.Indicator.prototype.clip = function(ctx, direction, value) {

	ctx.save();
	ctx.beginPath();

	var top = this.panel.params.padding.top,
		right = this.panel.params.padding.left + this.panel.size.width,
		bottom = this.panel.params.padding.top + this.panel.size.height,
		left = this.panel.params.padding.left,
		y0 = this.yScale()(value);

	if (direction === "above"){

		ctx.moveTo(left, top);
		ctx.lineTo(right, top);
		ctx.lineTo(right, y0);
		ctx.lineTo(left, y0);

	} else {

		ctx.moveTo(left, y0);
		ctx.lineTo(right, y0);
		ctx.lineTo(right, bottom);
		ctx.lineTo(left, bottom);
	}

	ctx.closePath();

	ctx.clip();

	return ctx;
};

/**
 * restore context to preclip state
 */
 Modcharts.Indicator.prototype.clipEnd = function(ctx) {

	ctx.restore();
	return ctx;
};

/**
 * return the default params for this type of indicator
 * @returns {object}
 */
Modcharts.Indicator.prototype.getDefaultParams = function(){

	throw new Error("Required Indicator method not found");

};

/**
 * Map the current slice of indicator data to a one-dimensional array for use in generic marker rendering
 * @param {object} data
 * @returns {object}
 */
Modcharts.Indicator.prototype.getDataMap = function(){

	throw new Error("Required Indicator method not found");

};

Modcharts.Indicator.prototype.xScale = function(){

	return this.panel.xAxis.scale[this.scale[0]];

};

Modcharts.Indicator.prototype.yScale = function(){

	return this.panel.yAxis.scale[this.scale[1]];

};

/**
 * Return minimum value of all datasets for this indicator
 * @returns {Number}
 */
Modcharts.Indicator.prototype.getRangeMin = function(){

	throw new Error("Required Indicator method not found");

};

/**
 * Return maximum value of all datasets for this indicator
 * @returns {Number}
 */
Modcharts.Indicator.prototype.getRangeMax = function(){

	throw new Error("Required Indicator method not found");

};

/**
 * helper function for getMinRange
 */
Modcharts.Indicator.prototype.min = function(){

	var min = Infinity, x, xLen;

	for (x=0, xLen = arguments.length; x < xLen; x++){
		min = Math.min(arguments[x], min);
	}
	return min;
};

/**
 * helper function for getMaxRange
 */
Modcharts.Indicator.prototype.max = function(){

	var max = -Infinity, x, xLen;
	for (x=0, xLen = arguments.length; x < xLen; x++){
		max = Math.max(arguments[x], max);
	}
	return max;
};

/**
 * return true if mouse coordinates intersect indicator
 */
Modcharts.Indicator.prototype.isWithin = function(){

	return false;

};

/**
 * check for overlap between two boxes
 * todo: performance improvement - convert to simple arrays instead of objects with x,y,width,height props
 */
Modcharts.Indicator.prototype.intersect = function(r1, r2) {

	if (r1.x < r2.x + r2.width && r2.x < r1.x + r1.width && r1.y < r2.y + r2.height){
		return r2.y < r1.y + r1.height;
	} else {
		return false;
	}

};

/**
 * Initialize and create references to this Indicator's Marker objects
 * @returns {object}
 */
Modcharts.Indicator.prototype.getMarkers = function(){

	throw new Error("Required Indicator method not found");

};

/**
 * Render this Indicator's Marker objects
 */
Modcharts.Indicator.prototype.render = function(){

	throw new Error("Required Indicator method not found");

};

/**
 * Cleanup before being removed from panel's indicator collection
 */
Modcharts.Indicator.prototype.remove = function(){

	var self = this;

	// remove any associated flags
	$.each(this.flags || [], function(key){

		this.remove();
		self.flags[key] = null;

	});

};

/**
 * return a gradient object given some colors and stops
 * @returns {ICanvasGradient}
 */
Modcharts.Indicator.prototype.getLinearGradient = function(ctx, colorStart, colorStop, x0, y0, x1, y1){

	var fill = ctx.createLinearGradient(x0, y0, x1, y1);

	fill.addColorStop(0, colorStart);
	fill.addColorStop(1, colorStop);

	return fill;

};

/**
 * static map from id to Class name
 * @returns {string}
 */
Modcharts.Indicator.getIndicatorClassName = function(id){

	if (!this.indicatorClassNameMap){

		this.indicatorClassNameMap = {
			"adl": "ADL",
			"advancedecline": "AdvanceDecline",
			"avgtruerange": "AverageTrueRange",
			"bollinger": "BollingerBands",
			"chaikins": "Chaikins",
			"commoditychannelindex": "CommodityChannelIndex",
			"crs": "CRS",
			"custom": "Custom",
			"dividendyield": "DividendYield",
			"dmi": "DMI",
			"ema": "EMA",
			"highlow": "HighLow",
			"horizontalannotation": "HorizontalAnnotation",
			"linearregression": "LinearRegression",
			"macd": "MACD",
			"mae": "MAE",
			"massindex": "MassIndex",
			"momentum": "Momentum",
			"moneyflow": "MoneyFlow",
			"moneyflowindex": "MoneyFlowIndex",
			"onbalancevolume": "OnBalanceVolume",
			"perange": "PERange",
			"peratio": "PERatio",
			"previousclose": "PreviousClose",
			"price": "Price",
			"pricechannel": "PriceChannel",
			"proc": "PROC",
			"psar": "PSAR",
			"revenues": "Revenues",
			"rollingdividend": "RollingDividend",
			"rollingeps": "RollingEPS",
			"rsi": "RSI",
			"sectorindustry": "SectorIndustry",
			"sma": "SMA",
			"stochastics": "Stochastics",
			"tsf": "TSF",
			"ultimateoscillator": "UltimateOscillator",
			"updownnyse": "UpDownRatio", // NXC-411: for backwards-compatibility
			"updownratio": "UpDownRatio",
			"updown": "UpDown",
			"volume": "Volume",
			"volumebyprice": "VolumeByPrice",
			"vroc": "VROC",
			"williamspctr": "Williams",
			"wma": "WMA"
		};
	}

	if (this.indicatorClassNameMap[id]) {

		return this.indicatorClassNameMap[id] + "Indicator";
	}
};

/**
 * Accumulation / Distribution indicator
 * @constructor
 * @class ADLIndicator
 * @extends Indicator
 */
Modcharts.ADLIndicator = function (args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.ADLIndicator, Modcharts.Indicator);

Modcharts.ADLIndicator.prototype.getDefaultParams = function() {

	return {
		id: "adl",
		name: "Accumulation / Distribution",
		description: "The Accumulation/Distribution Line is calculated by adding or subtracting a portion of each day’s volume from a cumulative total. The amount of volume to add or subtract is based on the relationship between the close and the high-low range. The closer the close is to the high, the more volume is added to the cumulative total. Conversely, the closer the close is to the low, the more volume is subtracted from the cumulative total. If the close is exactly midway between the high and low prices, nothing is added to the cumulative total.",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-adl", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-adl", "width")
		},
		needsCumulativeAdjustment: true
	};
};

Modcharts.ADLIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.adl || [], function(i) { return +i.adl; });

};

Modcharts.ADLIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.adl || [], function(i) { return +i.adl; });

};

Modcharts.ADLIndicator.prototype.getMarkers = function() {

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.ADLIndicator.prototype.getDataMap = function(data){

	return data.map(function(d) { return [d.dateIndex, +d.adl]; });

};

Modcharts.ADLIndicator.prototype.render = function(data){
	this.lastValue = data.adl[0].adl;
	this.lastDate = data.adl[0].date;
	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.adl || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};


/**
 * Advance/Decline line
 * @constructor
 * @class AdvanceDeclineIndicator
 * @extends Indicator
 */
Modcharts.AdvanceDeclineIndicator = function (args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.AdvanceDeclineIndicator, Modcharts.Indicator);

Modcharts.AdvanceDeclineIndicator.prototype.getDefaultParams = function() {

	return {
		id: "advancedecline",
		name: "Advance/Decline Line",
		description: "The Advance/Decline Line is a breadth indicator based on Net Advances, which is the number of advancing stocks less the number of declining stocks. Net Advances is positive when advances exceed declines and negative when declines exceed advances.",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-advancedecline", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-advancedecline", "width")
		},
		needsCumulativeAdjustment: true,
		inputs: [
			{ name: "Advancers", value: 10025197 }, // hard-coded NYSE issues as defaults
			{ name: "Decliners", value: 10025198 }
		],
	};
};

Modcharts.AdvanceDeclineIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.advancedecline || [], function(i) { return +i.advancedecline; });

};

Modcharts.AdvanceDeclineIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.advancedecline || [], function(i) { return +i.advancedecline; });

};

Modcharts.AdvanceDeclineIndicator.prototype.getMarkers = function() {

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.AdvanceDeclineIndicator.prototype.getDataMap = function(data){

	return data.map(function(d) { return [d.dateIndex, +d.advancedecline]; });

};

Modcharts.AdvanceDeclineIndicator.prototype.render = function(data){
	this.lastValue = data.advancedecline[0].advancedecline;
	this.lastDate = data.advancedecline[0].date;
	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.advancedecline || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};


/**
 * Average True Range indicator
 * @constructor
 * @class AverageTrueRangeIndicator
 * @extends Indicator
 */
Modcharts.AverageTrueRangeIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.AverageTrueRangeIndicator, Modcharts.Indicator);

Modcharts.AverageTrueRangeIndicator.prototype.getDefaultParams = function() {

	return {
		id: "avgtruerange",
		name: "Average True Range",
		description: "Average True Range is a volatility indicator that measures how much a security's price moves in a typical period. It differs from statistical measures like Standard Deviation in that it uses the Open, High, Low, and Closing prices to calculate the range, whereas Standard Deviation only uses closing prices.",
		inputs: [
			{ name: "period", value: 14 }
		],
		style: {
			lineColor : this.getStyle(".modcharts-indicator-avgtruerange", "color"),
			lineWidth : this.getStyle(".modcharts-indicator-avgtruerange", "width")
		}
	};

};

Modcharts.AverageTrueRangeIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.avgtruerange || [], function(i){ return +i.avgtruerange;});

};

Modcharts.AverageTrueRangeIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.avgtruerange || [], function(i){ return +i.avgtruerange;});

};

Modcharts.AverageTrueRangeIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker()
	};

};

Modcharts.AverageTrueRangeIndicator.prototype.getDataMap = function(data, type){

	return data.map(function(d){ return [d.dateIndex, +d[type]];});

};

Modcharts.AverageTrueRangeIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.avgtruerange || [], "avgtruerange"),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Bollinger Bands\u00AE indicator
 * @constructor
 * @class BollingerBandsIndicator
 * @extends Indicator
 */
Modcharts.BollingerBandsIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.BollingerBandsIndicator, Modcharts.Indicator);

Modcharts.BollingerBandsIndicator.prototype.getDefaultParams = function() {

	return {
		id: "bollinger",
		name: "Bollinger Bands&reg;",
		description: "Bollinger Bands are created by plotting the standard deviation around a moving average and are expected to capture approximately 95% of all price action. They are also used to highlight periods of high and low volatility.",
		inputs: [
			{ name: "period", value: 25 },
			{ name: "standardDeviations", value: 2 }
		],
		style : {
			fillColor: this.getStyle(".modcharts-indicator-bollinger-fill", "color"),
			lineColor: this.getStyle(".modcharts-indicator-bollinger", "color"),
			lineColorSMA: this.getStyle(".modcharts-indicator-bollinger-sma", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-bollinger", "width")
		}
	};
};

Modcharts.BollingerBandsIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.bollinger || [], function(i){ return +i.bottom;});

};

Modcharts.BollingerBandsIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.bollinger || [], function(i){ return +i.top;});

};

Modcharts.BollingerBandsIndicator.prototype.getMarkers = function(){

	return this.markers || {
		"lineSMA": new Modcharts.LineMarker(),
		"lineTop": new Modcharts.LineMarker(),
		"lineBottom": new Modcharts.LineMarker(),
		"lineFill": new Modcharts.LineMarker()
	};
};

Modcharts.BollingerBandsIndicator.prototype.getDataMap = function(data, type){

	switch (type){

		case "top":

			return data.map(function(d){ return [d.dateIndex, +d.top];});

		case "sma":

			return data.map(function(d){ return [d.dateIndex, +d.sma];});

		case "bottom":

			return data.map(function(d){ return [d.dateIndex, +d.bottom];});

		default:

			return [];
	}
};

Modcharts.BollingerBandsIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		x = this.xScale(),
		y = this.yScale(),
		dataTop = this.getDataMap(data.bollinger || [], "top"),
		dataBottom = this.getDataMap(data.bollinger || [], "bottom");

	this.markers.lineFill.renderFillBetween(ctx, dataTop, dataBottom, x, y, this.params.style.fillColor);
	this.markers.lineTop.render(ctx, dataTop, x, y, this.params.style.lineColor, this.params.style.lineWidth);
	this.markers.lineBottom.render(ctx, dataBottom, x, y, this.params.style.lineColor, this.params.style.lineWidth);
	this.markers.lineSMA.render(ctx, this.getDataMap(data.bollinger || [], "sma"), x, y, this.params.style.lineColorSMA);

	dataTop = null;
	dataBottom = null;

};

/**
 * Chaikin's Volatility indicator
 * @constructor
 * @class ChaikinsIndicator
 * @extends Indicator
 */
Modcharts.ChaikinsIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.ChaikinsIndicator, Modcharts.Indicator);

Modcharts.ChaikinsIndicator.prototype.getDefaultParams = function() {

	return {
		id: "chaikins",
		name: "Chaikin's Volatility",
		dataSeries: "chaikinsvolatility",
		description: "Chaikin's Volatility indicator relays information about the daily dispersion of prices.",
		inputs: [
			{ name: "EMAPeriod", value: 10 },
			{ name: "DifferencePeriod", value: 10 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-chaikins", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-chaikins", "width")
		}
	};
};

Modcharts.ChaikinsIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.chaikins || [], function(i){ return +i.chaikinsvolatility;});
};

Modcharts.ChaikinsIndicator.prototype.getRangeMax = function(data){
	return d3.max(data.chaikins || [], function(i){ return +i.chaikinsvolatility;});

};

Modcharts.ChaikinsIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"lineLow": new Modcharts.LineMarker()
	};

};

Modcharts.ChaikinsIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.chaikinsvolatility];});
};

Modcharts.ChaikinsIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.chaikins || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Price Channel indicator
 * @constructor
 * @class CommodityChannelIndexIndicator
 * @extends Indicator
 */
Modcharts.CommodityChannelIndexIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.CommodityChannelIndexIndicator, Modcharts.Indicator);

Modcharts.CommodityChannelIndexIndicator.prototype.getDefaultParams = function() {

	return {
		id: "commoditychannelindex",
		name: "Commodity Channel Index",
		description: "Commodity Channel Index Index is a momentum indicator that compares current prices to the average typical price. Above 100 is considered overbought, where upwards momentum is strong but unsustainable. Similarly, below -100 is considered oversold, where downwards momentum is also strong but unsustainable.",
		inputs: [
			{ name: "period", value: 20 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-commoditychannelindex", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-commoditychannelindex", "width"),
			fillColor: this.getStyle(".modcharts-indicator-commoditychannelindex", "color")
		},
		bands: [
			{
				labelText: "",
				valHigh: Number.MAX_VALUE,
				valLow: 100,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-commoditychannelindex-overbought", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-commoditychannelindex-overbought", "color")
				}
			},
			{
				labelText: "",
				valHigh: -100,
				valLow: -100000, // sufficiently negative number because MIN_VALUE didn't work
				style: {
					fillColor: this.getStyle(".modcharts-indicator-commoditychannelindex-oversold", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-commoditychannelindex-oversold", "color")
				}
			}
		]
	};
};

Modcharts.CommodityChannelIndexIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.commoditychannelindex || [], function(i){ return +i.commoditychannelindex;});

};

Modcharts.CommodityChannelIndexIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.commoditychannelindex || [], function(i){ return +i.commoditychannelindex;});
};

Modcharts.CommodityChannelIndexIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker(),
		"overbought": new Modcharts.BandMarker(this.params.bands[0]),
		"oversold": new Modcharts.BandMarker(this.params.bands[1]) 
	};
};

Modcharts.CommodityChannelIndexIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.commoditychannelindex];});

};

Modcharts.CommodityChannelIndexIndicator.prototype.render = function(data){

	this.markers.overbought.render(
		this.panel,
		this.yScale()
	);

	this.markers.oversold.render(
		this.panel,
		this.yScale()
	);

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.commoditychannelindex || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

};

/**
 * Comparative Relative Strength indicator
 * @constructor
 * @class CRSIndicator
 * @extends Indicator
 */
Modcharts.CRSIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.CRSIndicator, Modcharts.Indicator);

Modcharts.CRSIndicator.prototype.getDefaultParams = function() {

	return {
		id: "crs",
		name: "Comparative Relative Strength",
		inputs: [
			{ name: "comparisonsymbol", value: "" },
			{ name: "normalize", value: 1 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-crs", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-crs", "width")
		},
		valueMultiplier: 1
	};
};

Modcharts.CRSIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.crs || [], function(i){ return (i.crs || -1);});
};

Modcharts.CRSIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.crs || [], function(i){ return (i.crs || 1);});

};

Modcharts.CRSIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.CRSIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.crs];});

};

Modcharts.CRSIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.crs || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Custom indicator
 * @constructor
 * @class CustomIndicator
 * @extends Indicator
 */
Modcharts.CustomIndicator = function(args){

	this.superclass.call(this, args);
	this.markerTypeOptions = ["line", "fill", "bar", "stepped"];
};

Modcharts.Extend(Modcharts.CustomIndicator, Modcharts.Indicator);

Modcharts.CustomIndicator.prototype.getDefaultParams = function() {

	return {
		id: "custom",
		name: "Custom",
		markerType: "line", // line, bar, fill, stepped
		symbol: this.panel.core.params.symbol,
		style: {
			lineColor: this.getStyle(".modcharts-indicator-custom", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-custom", "width"),
			fillColor: this.getStyle(".modcharts-indicator-custom-fill", "color"),
			fillColorStart: this.getStyle(".modcharts-indicator-custom-fillstart", "color"),
			fillColorStop: this.getStyle(".modcharts-indicator-custom-fillstop", "color"),
			fillColorPos: this.getStyle(".modcharts-indicator-custom-pos", "color"),
			fillColorNeg: this.getStyle(".modcharts-indicator-custom-neg", "color"),
			radius: this.getStyle(".modcharts-indicator-custom-point", "width") || 5
		}
	};
};

Modcharts.CustomIndicator.prototype.getRangeMin = function(data){

	return d3.min(data || [], function(i){ return +i.value;});

};

Modcharts.CustomIndicator.prototype.getRangeMax = function(data){

	return d3.max(data || [], function(i){ return +i.value;});
};

Modcharts.CustomIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"stepped": new Modcharts.LineMarker(),
		"bar": new Modcharts.BarMarker(),
		"point": new Modcharts.PointMarker()
	};
};

Modcharts.CustomIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.value]; });

};

Modcharts.CustomIndicator.prototype.render = function(data){

	var dataCustom = this.getDataMap(data || []),
		markerType = this.params.markerType;

	switch (markerType){

		case "bar":

			this.renderBar(dataCustom);
			break;

		case "line":

			this.renderLine(dataCustom);
			break;

		case "point":

			this.renderPoint(dataCustom);
			break;

		case "stepped":

			this.renderSteppedLine(dataCustom);
			break;

		default: // fill

			this.renderFill(dataCustom);
			this.renderLine(dataCustom);
			break;
	}
};

Modcharts.CustomIndicator.prototype.renderFill = function(data, fillColor, fillColorStart, fillColorStop, fillToValue){

	fillColor = fillColor || this.params.style.fillColor;
	fillColorStart = fillColorStart || this.params.style.fillColorStart;
	fillColorStop = fillColorStop || this.params.style.fillColorStop;

	if ((typeof fillColor === "string" && fillColor.length > 0) || (typeof fillColorStop === "string" && fillColorStop.length > 0)){

		// fill
		var fillStyle = (typeof fillColorStart === "string" && fillColorStart.length > 0) ? this.getLinearGradient(this.panel.rootContext, fillColorStart, fillColorStop, 0, 0, 0, this.panel.size.height): fillColor;

		if (typeof fillToValue !== "number"){
			fillToValue = 0.0;
		}

		this.markers.line.renderFill(
			this.panel.rootContext,
			data,
			this.panel.size.padding.top + this.panel.size.height,
			this.xScale(),
			this.yScale(),
			fillStyle,
			fillToValue
		);
	}
};

Modcharts.CustomIndicator.prototype.getLineCoords = function(data){

	return this.markers.line.getCoords(
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale()
	);
};

Modcharts.CustomIndicator.prototype.renderLine = function(data, lineColor){

	return this.markers.line.render(
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		lineColor || this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

Modcharts.CustomIndicator.prototype.renderSteppedLine = function(data, lineColor){

	return this.markers.line.render(
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		lineColor || this.params.style.lineColor,
		this.params.style.lineWidth,
		true
	);
};

Modcharts.CustomIndicator.prototype.renderPoint = function(data){

	var ctx = this.panel.rootContext;

	return this.markers.point.render(ctx, data, this.xScale(), this.yScale(), this.params.style.lineColor, this.params.style.radius);
};

Modcharts.CustomIndicator.prototype.renderBar = function(data){

	var dataPos = data.filter(function(val){ return val[1] >= 0; }),
		dataNeg = data.filter(function(val){ return val[1] < 0; });

	this.markers.bar.render(
		this.panel,
		this.panel.rootContext,
		dataPos || [],
		this.xScale(),
		this.yScale(),
		this.params.style.fillColorPos
	);

	this.markers.bar.render(
		this.panel,
		this.panel.rootContext,
		dataNeg || [],
		this.xScale(),
		this.yScale(),
		this.params.style.fillColorNeg
	);

	return;
};

/**
 * Dividend Yield indicator
 * @constructor
 * @class DividendYieldIndicator
 * @extends Indicator
 */
Modcharts.DividendYieldIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.DividendYieldIndicator, Modcharts.Indicator);

Modcharts.DividendYieldIndicator.prototype.getDefaultParams = function() {

	return {
		id: "dividendyield",
		name: "Dividend Yield",
		description: "Dividend Yield is the dividend per share divided by the price per share.",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-dividendyield", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-dividendyield", "width")
		}
	};
};

Modcharts.DividendYieldIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.dividendyield || [], function(i){ return +i.dividendyield;});

};

Modcharts.DividendYieldIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.dividendyield || [], function(i){ return +i.dividendyield;});

};

Modcharts.DividendYieldIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.DividendYieldIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.dividendyield];});

};

Modcharts.DividendYieldIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.dividendyield || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * DMI indicator
 * @constructor
 * @class DMIIndicator
 * @extends Indicator
 */
Modcharts.DMIIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.DMIIndicator, Modcharts.Indicator);

Modcharts.DMIIndicator.prototype.getDefaultParams = function() {

	return {
		id: "dmi",
		name: "DMI",
		dataSeries: "adx",
		description: "The DMI is a trend indicator that uses high and low prices as well as the true range to determine whether a security is in an uptrend or a downtrend. The ADX line describes the strength of the trend.",
		inputs: [
			{ name: "period", value: 14 }
		],
		markerType: "default", // "default", "adx", "adxr"
		style: {
			lineColorADX: this.getStyle(".modcharts-indicator-dmi-adx", "color"),
			lineWidthADX: this.getStyle(".modcharts-indicator-dmi-adx", "width"),
			lineColorADXR: this.getStyle(".modcharts-indicator-dmi-adxr", "color"),
			lineWidthADXR: this.getStyle(".modcharts-indicator-dmi-adxr", "width"),
			lineColorDINeg: this.getStyle(".modcharts-indicator-dmi-neg", "color"),
			lineColorDIPos: this.getStyle(".modcharts-indicator-dmi-pos", "color")
		}
	};
};

Modcharts.DMIIndicator.prototype.getRangeMin = function(data){

	var dataDMI = data.dmi || [];

	if (this.params.markerType === "adx"){

		return d3.min(dataDMI, function(i){ return +i.adx;});

	} else if (this.params.markerType === "adxr"){

		return this.min(
			d3.min(dataDMI, function(i){ return +i.adxr;}),
			d3.min(dataDMI, function(i){ return +i.adx;})
		);
	}

	return this.min(
		d3.min(dataDMI, function(i){ return +i.minusdi;}),
		d3.min(dataDMI, function(i){ return +i.plusdi;}),
		d3.min(dataDMI, function(i){ return +i.adx;})
	);

};

Modcharts.DMIIndicator.prototype.getRangeMax = function(data){

	var dataDMI = data.dmi || [];

	if (this.params.markerType === "adx"){

		return d3.max(dataDMI, function(i){ return +i.adx;});

	} else if (this.params.markerType === "adxr"){

		return this.max(
			d3.max(dataDMI, function(i){ return +i.adxr;}),
			d3.max(dataDMI, function(i){ return +i.adx;})
		);
	}

	return this.max(
		d3.max(dataDMI, function(i){ return +i.minusdi;}),
		d3.max(dataDMI, function(i){ return +i.plusdi;}),
		d3.max(dataDMI, function(i){ return +i.adx;})
	);

};

Modcharts.DMIIndicator.prototype.getMarkers = function(){

	return this.markers || {
		"lineADX": new Modcharts.LineMarker(),
		"lineADXR": new Modcharts.LineMarker(),
		"lineMinusDI": new Modcharts.LineMarker(),
		"linePlusDI": new Modcharts.LineMarker()
	};
};

Modcharts.DMIIndicator.prototype.getDataMap = function(data, type){

	return data.map(function(d){ return [d.dateIndex, +d[type]];});

};

Modcharts.DMIIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		x = this.xScale(),
		y = this.yScale(),
		dataADX = this.getDataMap(data.dmi || [], "adx");

	if (this.params.markerType === "adx"){

		this.markers.lineADX.render(ctx, dataADX, x, y, this.params.style.lineColorADX, this.params.style.lineWidthADX);

	} else if (this.params.markerType === "adxr"){

		var dataADXR = this.getDataMap(data.dmi || [], "adxr");

		this.markers.lineADX.render(ctx, dataADX, x, y, this.params.style.lineColorADX, this.params.style.lineWidthADX);
		this.markers.lineADXR.render(ctx, dataADXR, x, y, this.params.style.lineColorADXR, this.params.style.lineWidthADXR);

	} else {

		var dataTop = this.getDataMap(data.dmi || [], "minusdi"),
			dataBottom = this.getDataMap(data.dmi || [], "plusdi");

		this.markers.lineMinusDI.render(ctx, dataTop, x, y, this.params.style.lineColorDINeg, this.params.style.lineWidthADX || 1.5);
		this.markers.linePlusDI.render(ctx, dataBottom, x, y, this.params.style.lineColorDIPos, this.params.style.lineWidthADX || 1.5);
		this.markers.lineADX.render(ctx, dataADX, x, y, this.params.style.lineColorADX, this.params.style.lineWidthADX);
	}

};


/**
 * EMA indicator
 * @constructor
 * @class EMAIndicator
 * @extends Indicator
 */
Modcharts.EMAIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.EMAIndicator, Modcharts.Indicator);

Modcharts.EMAIndicator.prototype.getDefaultParams = function() {

	return {
		id: "ema",
		name: "EMA",
		description: "Moving Averages are trend indicators that smooth stock price movements. Comparing the moving averages from multiple time frames can help investors spot changes in trend. Exponential Moving Averages add greater weight to more recent prices.",
		inputs: [
			{ name: "period", value: 25 }
		],
		style: {
			lineColor: this.getStyle(".modcharts-indicator-ema", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-ema", "width")
		}
	};
};

Modcharts.EMAIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.ema || [], function(i){ return +i.ema;});

};

Modcharts.EMAIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.ema || [], function(i){ return +i.ema;});

};

Modcharts.EMAIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.EMAIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.ema];});

};

Modcharts.EMAIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.ema || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * High/Low indicator
 * @constructor
 * @class HighLowIndicator
 * @extends Indicator
 */
Modcharts.HighLowIndicator = function (args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.HighLowIndicator, Modcharts.Indicator);

Modcharts.HighLowIndicator.prototype.getDefaultParams = function() {

	return {
		id: "highlow",
		name: "High / Low",
		description: "Label the high/low for current chart.",
		noClip: true,
		inputs: [
			{ name: "extentType", value: "auto" } // auto, ohlc or close
		],
		style : {
			lowColor: this.getStyle(".modcharts-indicator-highlow-min", "color") || "#e70d18",
			highColor: this.getStyle(".modcharts-indicator-highlow-max", "color") || "#077c07",
			glowColor: this.getStyle(".modcharts-indicator-highlow-label-glow", "color")
		}
	};
};

Modcharts.HighLowIndicator.prototype.getRangeMin = function(){ return null; };
Modcharts.HighLowIndicator.prototype.getRangeMax = function(){ return null; };
Modcharts.HighLowIndicator.prototype.getMarkers = function(){ return {}; };
Modcharts.HighLowIndicator.prototype.getDataMap = function(){ return null; };

/**
 * the top and bottom extents will differ depending on the markertype of the price indicator.
 * line/fill charts should look at the close while ohlc/candlestick charts should use low and high.
 */
Modcharts.HighLowIndicator.prototype.getExtentMin = function(){

	var extentType = this.params.inputs[0].value;

	if (extentType === "auto" && this.panel.indicators[0].params.id === "price"){

		return (/candle|ohlc/.test(this.panel.indicators[0].params.markerType)) ? "low" : "close";

	} else {

		return (extentType === "ohlc") ? "low" : "close";
	}
};

Modcharts.HighLowIndicator.prototype.getExtentMax = function(){

	var extentType = this.params.inputs[0].value;

	if (extentType === "auto" && this.panel.indicators[0].params.id === "price"){

		return (/candle|ohlc/.test(this.panel.indicators[0].params.markerType)) ? "high" : "close";

	} else {

		return (extentType === "ohlc") ? "high" : "close";
	}
};

/**
 * get a reference to the previous close indicator on this panel.  this will allow us to call
 * its getDimensions method to enable collision detection.
 */
Modcharts.HighLowIndicator.prototype.getPreviousCloseIndicator = function(){

	for (var x=0, xLen = this.panel.indicators.length; x < xLen; x++){
		if (this.panel.indicators[x].params.id === "previousclose"){
			return this.panel.indicators[x];
		}
	}
};

Modcharts.HighLowIndicator.prototype.getExtent = function(data){

	var core = this.panel.core,
		maxValue = -Infinity,
		minValue = Infinity,
		maxDate = new Date(),
		minDate = new Date(),
		rectSize = 10,
		priceData = data.price,
		minDatapoint = this.getExtentMin(),
		maxDatapoint = this.getExtentMax(),
		formatString = this.panel.yAxis.getFormatString(null, null, 5),
		limitLeft = this.panel.size.padding.left,
		limitRight = limitLeft + this.panel.size.width;

	for (var x=0, xLen = priceData.length; x < xLen; x++){

		// discard points that are clipped out
		if (this.xScale()(core.closestExchangeIndex(priceData[x].date)) > limitRight){ continue; }
		if (this.xScale()(core.closestExchangeIndex(priceData[x].date)) < limitLeft){ continue; }

		maxValue = Math.max(priceData[x][maxDatapoint], maxValue);
		minValue = Math.min(priceData[x][minDatapoint], minValue);

		if (priceData[x][maxDatapoint] === maxValue){
			maxDate = priceData[x].date;
		}

		if (priceData[x][minDatapoint] === minValue){
			minDate = priceData[x].date;
		}
	}

	var maxY = this.yScale()(maxValue) - rectSize - 4,
		minY = this.yScale()(minValue) + 4,
		maxX = this.xScale()(core.closestExchangeIndex(maxDate)),
		minX = this.xScale()(core.closestExchangeIndex(minDate));

	return {
		minValue: minValue,
		maxValue: maxValue,
		minFormat: this.panel.yAxis.getFormatValue(this.panel.yAxis.scale[0].tickFormat(1, formatString)(minValue)),
		maxFormat: this.panel.yAxis.getFormatValue(this.panel.yAxis.scale[0].tickFormat(1, formatString)(maxValue)),
		minDate: minDate,
		maxDate: maxDate,
		maxY: maxY,
		minY: minY,
		maxX: maxX,
		minX: minX
	};

};

Modcharts.HighLowIndicator.prototype.getTextAlignment = function(val, width){

	 if (val - width <= this.panel.size.padding.left){

	 	return "left";

	 } else if (val + width > this.panel.size.padding.left + this.panel.size.width){

	 	return "right";
	 }

	 return "center";

};

Modcharts.HighLowIndicator.prototype.drawLabel = function(ctx, val, x, y, color){

	this.panel.glowText(
	    ctx,
		val,
		this.panel.px(x),
		this.panel.px(y - 1) + 11.5,
		color,
		this.params.style.glowColor
	);
};

Modcharts.HighLowIndicator.prototype.drawIcon = function(ctx, val, x, y, color, size){

	var panel = this.panel;

	ctx.fillStyle = color;
	ctx.strokeStyle = "white";
	this.panel.fillRect(ctx, x, y, size, size);

	ctx.beginPath();

	// drawing individual lines this way makes for a crisper icon than using antialiased text.
	if (val === "H"){

		// H
		panel.moveTo(ctx, x + 3, y + 2);
		panel.lineTo(ctx, x + 3, y + 8);
		panel.moveTo(ctx, x + 3, y + 5);
		panel.lineTo(ctx, x + 7, y + 5);
		panel.moveTo(ctx, x + 7, y + 2);
		panel.lineTo(ctx, x + 7, y + 8);

	} else {

		// L
		panel.moveTo(ctx, x + 3, y + 2);
		panel.lineTo(ctx, x + 3, y + 8);
		panel.lineTo(ctx, x + 7, y + 8);
	}

	ctx.stroke();
	ctx.closePath();
};

Modcharts.HighLowIndicator.prototype.renderHighLow = function(ctx, data, extentData){

	var lowX, lowY, highX, highY,
		lowLabel = extentData.minFormat,
		highLabel = extentData.maxFormat,
		gap = 3,
		rectSize = 10,
		lowWidth = ctx.measureText(highLabel).width + rectSize + gap,
		highWidth = ctx.measureText(lowLabel).width + rectSize + gap,
		lowAlign = this.getTextAlignment(extentData.minX, lowWidth / 2),
		highAlign = this.getTextAlignment(extentData.maxX, highWidth / 2),
		lowColor = this.params.style.lowColor,
		highColor = this.params.style.highColor,
		highIntersect = false,
		lowIntersect = false,
		prevCloseIndicator = this.getPreviousCloseIndicator(),
		prevCloseDimensions = prevCloseIndicator && data.previousclose ? prevCloseIndicator.getDimensions(data) : {};

	ctx.textAlign = "left";
	ctx.textBaseline = "bottom";

	// high
	highX = (highAlign === "left") ? extentData.maxX : (highAlign === "center") ? extentData.maxX - (lowWidth / 2) : extentData.maxX - lowWidth;
	highY = extentData.maxY;

	if (prevCloseIndicator){

		highIntersect = prevCloseIndicator.intersect({x: highX, y: highY, width: highWidth, height: rectSize}, prevCloseDimensions);

		if (highIntersect){
			highY = prevCloseDimensions.y - rectSize - 1;
		}
	}

	this.drawIcon(ctx, "H", highX, highY, highColor, rectSize);
	this.drawLabel(ctx, extentData.maxFormat, highX + rectSize + gap, highY + 1, highColor);

	// low
	lowX = (lowAlign === "left") ? extentData.minX : (lowAlign === "center") ? extentData.minX - (lowWidth / 2) : extentData.minX - lowWidth;
	lowY = extentData.minY;

	if (prevCloseIndicator){

		lowIntersect = prevCloseIndicator.intersect({x: lowX, y: lowY, width: lowWidth, height: rectSize}, prevCloseDimensions);

		if (lowIntersect){
			lowY = prevCloseDimensions.y + prevCloseDimensions.height + 1;
		}
	}

	this.drawIcon(ctx, "L", lowX, lowY, lowColor, rectSize);
	this.drawLabel(ctx, extentData.minFormat, lowX + rectSize + gap, lowY + 1, lowColor);

	// debug collisions
	// ctx.fillStyle = "black";
	// if (highIntersect){

	// 	ctx.arc(highX, highY, 3, 0, Math.PI*2);
	// 	ctx.fill();

	// }

	// if (lowIntersect){

	// 	ctx.arc(lowX, lowY, 3, 0, Math.PI*2);
	// 	ctx.fill();

	// }

};

Modcharts.HighLowIndicator.prototype.render = function(data){

	if (!data.price){ return; }

	var extentData = this.getExtent(data);

	if (extentData.minValue === extentData.maxValue){

		return;

	} else {

		return this.renderHighLow(this.panel.rootContext, data, extentData);
	}
};

/**
 * Historical Dividend indicator
 * @constructor
 * @class HistoricalDividendIndicator
 * @extends Indicator
 */
Modcharts.HistoricalDividendIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.HistoricalDividendIndicator, Modcharts.Indicator);

Modcharts.HistoricalDividendIndicator.prototype.getDefaultParams = function() {

	return {
		id: "historicaldividend",
		name: "Historical Dividend",
		description: "",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-historicaldividend", "color")
		}
	};
};

Modcharts.HistoricalDividendIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.historicaldividend || [], function(i){ return +i.historicaldividend * 0.95;});

};

Modcharts.HistoricalDividendIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.historicaldividend || [], function(i){ return +i.historicaldividend * 1.05;});

};

Modcharts.HistoricalDividendIndicator.prototype.getMarkers = function(){

	return { "bar": new Modcharts.BarMarker() };

};

Modcharts.HistoricalDividendIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.historicaldividend];});

};

Modcharts.HistoricalDividendIndicator.prototype.render = function(data){

	this.markers.bar.render(
		this.panel,
		this.panel.rootContext,
		this.getDataMap(data.historicaldividend || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor
	);
};

/**
 * Horizontal Annotation indicator
 * @constructor
 * @class HorizontalAnnotationIndicator
 * @extends Indicator
 */
Modcharts.HorizontalAnnotationIndicator = function(args){

	this.superclass.call(this, args);

	this.state = {
		hover: false
	};

};

Modcharts.Extend(Modcharts.HorizontalAnnotationIndicator, Modcharts.Indicator);

Modcharts.HorizontalAnnotationIndicator.prototype.getDefaultParams = function() {

	return {
		id: "horizontalannotation",
		name: "Horizontal Annotation",
		description: "",
		text: null,
		textHover: null,
		value: null,
		noClip: true,
		style : {
			height: 10,
			margin: 5,
			lineColor: "#aaa",
			lineWidth: 1,
			textColor: "#000",
			textBgColor: "#ccc",
			textFontFamily: "Arial, Helvetica, sans-serif",
			textFontSize: 12,
			textFontWeight: "normal",
			textHoverColor: "#aaa",
			textHoverFontFamily: "Arial, Helvetica, sans-serif",
			textHoverFontSize: 11,
			textHoverFontWeight: "normal",
			textHoverBgColor: "#333"
		}
	};
};

Modcharts.HorizontalAnnotationIndicator.prototype.getRangeMin = function(){
	return null;
};

Modcharts.HorizontalAnnotationIndicator.prototype.getRangeMax = function(){
	return null;
};

Modcharts.HorizontalAnnotationIndicator.prototype.getMarkers = function(){
	return {};
};

Modcharts.HorizontalAnnotationIndicator.prototype.getDataMap = function(){
	return {};
};

/**
 * return true if mouse coordinates intersect indicator
 */
Modcharts.HorizontalAnnotationIndicator.prototype.isWithin = function(mouse){

	var panel = this.panel,
		mousePanel = [mouse[0], mouse[1] - panel.size.top],
		style = this.params.style,
		margin = this.params.style.margin,
		value = panel.isNormalized() ? panel.actualToNormalized(this.params.value) : this.params.value,
		y0 = this.yScale()(value),
		ySnap = Math.min(panel.size.height - margin, Math.max(margin, y0)),
		left = panel.size.padding.left + margin,
		mouseRect = {x: mousePanel[0], y: mousePanel[1], width: 1, height: 1 },
		collidesBottom = y0 > panel.size.height - margin - style.height;

	if (collidesBottom){
		ySnap = panel.size.height - margin - style.height;
	}

	var boundingBox = {
		x: left,
		y: ySnap,
		width: style.height,
		height: style.height
	};

	return this.intersect(boundingBox, mouseRect);

};

Modcharts.HorizontalAnnotationIndicator.prototype.render = function(){

	var panel = this.panel,
		style = this.params.style,
		margin = this.params.style.margin,
		value = panel.isNormalized() ? panel.actualToNormalized(this.params.value) : this.params.value,
		y0 = this.yScale()(value),
		ySnap = Math.min(panel.size.height - margin, Math.max(margin, y0)),
		left = panel.size.padding.left,
		right = left + panel.size.width,
		ctx = panel.rootContext;

	ctx.beginPath();

	ctx.font = [style.textFontWeight, style.textFontSize + "px", style.textFontFamily].join(" ");

	var textWidth = ctx.measureText(this.params.text).width,
		textHeight = Math.round(ctx.measureText("M").width) + 0.5; // http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas;

	var yMid = Math.round(ySnap + (style.height / 2) - (textHeight / 2)),
		collidesTop = y0 < margin,
		collidesBottom = y0 > panel.size.height - margin - style.height;

	ctx.textBaseline = "top";

	// line
	if (!collidesTop && !collidesBottom) {

		ctx.lineWidth = this.params.style.lineWidth;
		ctx.strokeStyle = this.params.style.lineColor;
		panel.moveTo(ctx, left, y0);
		panel.lineTo(ctx, right, y0);
		ctx.stroke();
	}

	// regular text label
	if (this.params.text && this.params.text.length){

		left += margin;

		if (collidesBottom){
			ySnap = panel.size.height - margin - style.height;
			yMid = Math.round(ySnap + (style.height / 2) - (textHeight / 2));
		}

		ctx.beginPath();
		ctx.textBaseline = "top";

		// rect background
		ctx.fillStyle = this.params.style.textBgColor;
		this.panel.rect(ctx, left, ySnap, style.height, style.height);
		ctx.fill();

		ctx.beginPath();
		ctx.textBaseline = "top";

		// text
		this.panel.glowText(ctx, this.params.text, left + (style.height / 2) - (textWidth / 2), yMid, this.params.style.textColor);

		// hover text
		if (this.state.hover){ // temp

			left += style.height;

			ctx.font = [style.textHoverFontWeight, style.textHoverFontSize + "px", style.textHoverFontFamily].join(" ");

			var textHoverWidth = ctx.measureText(this.params.textHover).width;

			ctx.textBaseline = "top";

			// rect background
			ctx.beginPath();
			ctx.fillStyle = this.params.style.textHoverBgColor;
			this.panel.rect(ctx, left, ySnap, textHoverWidth + 10, style.height + 2);
			ctx.fill();

			ctx.beginPath();

			left += 5;

			// hover text
			this.panel.glowText(ctx, this.params.textHover, left, yMid, this.params.style.textHoverColor);
		}
	}

	// debug bounding box
	//ctx.strokeStyle = this.params.style.lineColor;
	//ctx.strokeRect(dimensions.x, dimensions.y, dimensions.width, dimensions.height);

};

/**
 * Linear Regression indicator
 * @constructor
 * @class LinearRegressionIndicator
 * @extends Indicator
 */
Modcharts.LinearRegressionIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.LinearRegressionIndicator, Modcharts.Indicator);

Modcharts.LinearRegressionIndicator.prototype.getDefaultParams = function() {

	return {
		id: "linearregression",
		name: "Linear Regression",
		description: "The Linear Regression Indicator function returns the current value of a linear regression line of a field to time over a given number of periods.",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-linearregression", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-linearregression", "width")
		}
	};
};

Modcharts.LinearRegressionIndicator.prototype.getRangeMin = function(){
	return null;
};

Modcharts.LinearRegressionIndicator.prototype.getRangeMax = function(){
	return null;
};

Modcharts.LinearRegressionIndicator.prototype.getMarkers = function(){
	return {};
};

/**
 * Linear Regression calculation
 * see https://svn.wsod.local/svn/wsod/netframework/framework_repository/3.0-stable/Math/TechnicalIndicators.cs
 */
Modcharts.LinearRegressionIndicator.prototype.getLinearRegression = function(data){

	var count = 1,
		sumX = 0,
		sumX2 = 0,
		sumY = 0,
		sumXY = 0,
		temp = 0,
		regressionData = {},
		period = data.length,
		seriesId = "close";

	// use a different series id if based on a parent indicator
	if (this.params.parentUID){

		var parentIndicator = this.panel.core.getIndicatorByUID(this.params.parentUID);
		seriesId = parentIndicator.params.dataSeries || parentIndicator.params.id;

	}

	for (var index = 0; count <= period; index++, count++){
		sumX += count;
		sumX2 += count * count;
		temp = data[index][seriesId];
		sumY += temp;
		sumXY += count * temp;
	}

	var d = period * sumX2 - sumX * sumX,
		m = (period * sumXY - sumX * sumY) / d,    // Slope
		b = (sumX2 * sumY - sumX * sumXY) / d;     // Intercept

	regressionData["Beginning"] = b + (m * 1);
	regressionData["End"] = b + (m * period);
	regressionData["Slope"] = m;

	return regressionData;
};

Modcharts.LinearRegressionIndicator.prototype.render = function(data){

	var lrData = this.getLinearRegression(data.linearregression),
		ctx = this.panel.rootContext,
		size = this.panel.size,
		y0 = this.yScale()(lrData.Beginning),
		y1 = this.yScale()(lrData.End);

	if (!isNaN(y0) && !isNaN(y1)) {

		ctx.beginPath();
		ctx.strokeStyle = this.params.style.lineColor;
		ctx.lineWidth = this.params.style.lineWidth;
		this.panel.moveTo(ctx, size.padding.left, y0);
		this.panel.lineTo(ctx, size.padding.left + size.width, y1);
		ctx.stroke();

	}
};

/**
 * MACD indicator
 * @constructor
 * @class MACDIndicator
 * @extends Indicator
 */
Modcharts.MACDIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.MACDIndicator, Modcharts.Indicator);

Modcharts.MACDIndicator.prototype.getDefaultParams = function() {

	return {
		id: "macd",
		name: "MACD",
		description: "The MACD is the difference between 2 exponential moving averages and is a trend and momentum indicator. It is normally considered bullish when the MACD line is above the signal line and more so when both are above the 0-line.",
		inputs: [
			{ name: "fastperiod", value: 12 },
			{ name: "slowperiod", value: 26 },
			{ name: "smoothing", value: 10 }
		],
		markerType: "default", // "default", "histogram"
		style: {
			lineColor: this.getStyle(".modcharts-indicator-macd", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-macd", "width"),
			lineColorEMA: this.getStyle(".modcharts-indicator-macd-ema", "color"),
			fillColorPos: this.getStyle(".modcharts-indicator-macd-pos", "color"),
			fillColorNeg: this.getStyle(".modcharts-indicator-macd-neg", "color")
		}
	};
};

Modcharts.MACDIndicator.prototype.getRangeMin = function(data){

	if (this.params.markerType === "histogram"){

		return this.min(d3.min(data.macd || [], function(i){ return i.divergence; }), 0);

	}

	return this.min(
		d3.min(data.macd || [], function(i){ return +i.ema;}),
		d3.min(data.macd || [], function(i){ return +i.divergence;}),
		d3.min(data.macd || [], function(i){ return +i.macd;}),
		0
	);

};

Modcharts.MACDIndicator.prototype.getRangeMax = function(data){

	if (this.params.markerType === "histogram"){

		return this.max(d3.max(data.macd || [], function(i){ return i.divergence; }), 0);

	}

	return this.max(
		d3.max(data.macd || [], function(i){ return +i.ema;}),
		d3.max(data.macd || [], function(i){ return +i.divergence;}),
		d3.max(data.macd || [], function(i){ return +i.macd;}),
		0
	);
};

Modcharts.MACDIndicator.prototype.getMarkers = function(){

	return this.markers || {
		"lineEMA": new Modcharts.LineMarker(),
		"lineMACD": new Modcharts.LineMarker(),
		"barDivUp": new Modcharts.BarMarker(),
		"barDivDown": new Modcharts.BarMarker()
	};
};

Modcharts.MACDIndicator.prototype.getDataMap = function(data, type){

	switch (type){

		case "macd":

			return data.map(function(d){ return [d.dateIndex, +d.macd];});

		case "ema":

			return data.map(function(d){ return [d.dateIndex, +d.ema];});

		case "divUp":

			return data.map(function(d){ return [d.dateIndex, d.divergence >= 0 ? d.divergence : 0];});

		case "divDown":

			return data.map(function(d){ return [d.dateIndex, d.divergence < 0 ? d.divergence : 0];});

		default:

			return [];

	}
};

Modcharts.MACDIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		x = this.xScale(),
		y = this.yScale();

	this.markers.barDivUp.render(
		this.panel,
		ctx,
		this.getDataMap(data.macd || [], "divUp"),
		x,
		y,
		this.params.style.fillColorPos
	);

	this.markers.barDivDown.render(
		this.panel,
		ctx,
		this.getDataMap(data.macd || [], "divDown"),
		x,
		y,
		this.params.style.fillColorNeg
	);

	if (this.params.markerType === "default"){

		this.markers.lineEMA.render(
			ctx,
			this.getDataMap(data.macd || [], "ema"),
			x,
			y,
			this.params.style.lineColorEMA,
			this.params.style.lineWidth
		);

		this.markers.lineMACD.render(
			ctx,
			this.getDataMap(data.macd || [], "macd"),
			x,
			y,
			this.params.style.lineColor,
			this.params.style.lineWidth
		);

	}

	if (this.panel.params.style.gridColorBorder !== "none"){
		ctx.beginPath();
		var yZero = this.panel.px(y(0.0));
		ctx.strokeStyle = this.panel.params.style.gridColorBorder;
		ctx.moveTo(this.panel.size.padding.left, yZero);
		ctx.lineTo(this.panel.size.padding.left + this.panel.size.width, yZero);
		ctx.stroke();
	}

};

/**
 * MAE indicator
 * @constructor
 * @class MAEIndicator
 * @extends Indicator
 */
Modcharts.MAEIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.MAEIndicator, Modcharts.Indicator);

Modcharts.MAEIndicator.prototype.getDefaultParams = function() {

	return {
		id: "mae",
		name: "Moving Average Envelope",
		description: "Moving Average Envelopes provide context around a security's recent price range.",
		inputs: [
			{ name: "period", value: 25 },
			{ name: "lowfactor", value: 0.94 },
			{ name: "highfactor", value: 1.06 },
			{ name: "averagetype", value: "sma" }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-mae", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-mae", "width"),
			fillColor: this.getStyle(".modcharts-indicator-mae-fill", "color")
		}
	};
};

Modcharts.MAEIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.mae || [], function(i){ return +i.maelow;});
};

Modcharts.MAEIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.mae || [], function(i){ return +i.maehigh;});

};

Modcharts.MAEIndicator.prototype.getMarkers = function(){

	return this.markers || {
		"lineUp": new Modcharts.LineMarker(),
		"lineDown": new Modcharts.LineMarker(),
		"lineFill": new Modcharts.LineMarker()
	};

};

Modcharts.MAEIndicator.prototype.getDataMap = function(data, type){

	return data.map(function(d){ return [d.dateIndex, +d[type]];});

};

Modcharts.MAEIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		x = this.xScale(),
		y = this.yScale(),
		dataUp = this.getDataMap(data.mae || [], "maehigh"),
		dataDown = this.getDataMap(data.mae || [], "maelow");

	this.markers.lineFill.renderFillBetween(ctx, dataUp, dataDown, x, y, this.params.style.fillColor);

	this.markers.lineUp.render(
		ctx,
		dataUp,
		x,
		y,
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

	this.markers.lineDown.render(
		ctx,
		dataDown,
		x,
		y,
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};


/**
 * Mass index indicator
 * @constructor
 * @class MassIndexIndicator
 * @extends Indicator
 */
Modcharts.MassIndexIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.MassIndexIndicator, Modcharts.Indicator);

Modcharts.MassIndexIndicator.prototype.getDefaultParams = function() {

	return {
		id: "massindex",
		name: "Mass Index",
		description: "The Mass Index helps to identify reversals of trend.",
		inputs: [
			{ name: "period", value: 25 }
		],
		extraInputs: [
			{ name: "setup", value: 27 },
			{ name: "trigger", value: 26.5 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-massindex", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-massindex", "width"),
			lineColorSetup: this.getStyle(".modcharts-indicator-massindex-setup", "color"),
			lineColorTrigger: this.getStyle(".modcharts-indicator-massindex-trigger", "color"),
		}
	};
};

Modcharts.MassIndexIndicator.prototype.getRangeMin = function(data){

	return this.min(
		d3.min(data.massindex || [], function(i){ return +i.massindex;}),
		this.getInput("setup"),
		this.getInput("trigger")
	);
};

Modcharts.MassIndexIndicator.prototype.getRangeMax = function(data){

	return this.max(
		d3.max(data.massindex || [], function(i){ return +i.massindex;}),
		this.getInput("setup"),
		this.getInput("trigger")
	);

};

Modcharts.MassIndexIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker()
	};

};

Modcharts.MassIndexIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.massindex];});
};

Modcharts.MassIndexIndicator.prototype.render = function(data){

	var panel = this.panel,
		ctx = panel.rootContext,
		x = panel.size.padding.left,
		w = panel.size.width;

	this.markers.line.render(
		ctx,
		this.getDataMap(data.massindex || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

	// setup line
	var ySetup = this.yScale()(this.getInput("setup"));

	ctx.lineWidth = this.params.style.lineWidth;
	ctx.strokeStyle = this.params.style.lineColorSetup;

	ctx.beginPath();
	panel.moveTo(ctx, x, ySetup);
	panel.lineTo(ctx, x + w, ySetup);
	ctx.stroke();

	// trigger line
	var yTrigger = this.yScale()(this.getInput("trigger"));

	ctx.strokeStyle = this.params.style.lineColorTrigger;

	ctx.beginPath();
	panel.moveTo(ctx, x, yTrigger);
	panel.lineTo(ctx, x + w, yTrigger);
	ctx.stroke();
};

/**
 * EMA indicator
 * @constructor
 * @class MomentumIndicator
 * @extends Indicator
 */
Modcharts.MomentumIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.MomentumIndicator, Modcharts.Indicator);

Modcharts.MomentumIndicator.prototype.getDefaultParams = function() {

	return {
		id: "momentum",
		name: "Momentum",
		description: "",
		inputs: [
			{ name: "period", value: 25 }
		],
		fillToValue: 100,
		style: {
			lineColor: this.getStyle(".modcharts-indicator-momentum", "color"),
			fillColor: this.getStyle(".modcharts-indicator-momentum", "background-color"),
			lineWidth: this.getStyle(".modcharts-indicator-momentum", "width")
		}
	};
};

Modcharts.MomentumIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.momentum || [], function(i){ return +i.momentum;});

};

Modcharts.MomentumIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.momentum || [], function(i){ return +i.momentum;});

};

Modcharts.MomentumIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.MomentumIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.momentum];});

};

Modcharts.MomentumIndicator.prototype.render = function(data){

	// fill
	this.markers.line.renderFill(
		this.panel.rootContext,
		this.getDataMap(data.momentum || []),
		this.panel.size.padding.top + this.panel.size.height,
		this.xScale(),
		this.yScale(),
		this.params.style.fillColor,
		this.params.fillToValue
	);

	// line
	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.momentum || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

};

/**
 * Money Flow indicator
 * @constructor
 * @class MoneyFlowIndicator
 * @extends Indicator
 */
Modcharts.MoneyFlowIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.MoneyFlowIndicator, Modcharts.Indicator);

Modcharts.MoneyFlowIndicator.prototype.getDefaultParams = function() {

	return {
		id: "moneyflow",
		name: "Money Flow",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-moneyflow", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-moneyflow", "width")
		}
	};
};

Modcharts.MoneyFlowIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.moneyflow || [], function(i){ return +i.moneyflow;});
};

Modcharts.MoneyFlowIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.moneyflow || [], function(i){ return +i.moneyflow;});

};

Modcharts.MoneyFlowIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.MoneyFlowIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.moneyflow];});

};

Modcharts.MoneyFlowIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.moneyflow || [], "moneyflow"),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Money Flow Index indicator
 * @constructor
 * @class MoneyFlowIndexIndicator
 * @extends Indicator
 */
Modcharts.MoneyFlowIndexIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.MoneyFlowIndexIndicator, Modcharts.Indicator);

Modcharts.MoneyFlowIndexIndicator.prototype.getDefaultParams = function() {

	return {
		id: "moneyflowindex",
		name: "Money Flow Index",
		description: "The Money Flow Index describes the rate at which money is flowing into or out of a security. It is similar to the RSI but includes volume within the calculation in addition to price.",
		inputs: [
			{ name: "period", value: 15 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-moneyflowindex", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-moneyflowindex", "width"),
			yAxisPaddingTop: 0,
			yAxisPaddingBottom: 0
		},
		bands: [
			{
				labelText: "Overbought",
				valHigh: 100,
				valLow: 80,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-moneyflowindex-overbought", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-moneyflowindex-overbought", "color")
				}
			},
			{
				labelText: "Oversold",
				valHigh: 20,
				valLow: 0,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-moneyflowindex-oversold", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-moneyflowindex-oversold", "color")
				}
			}
		]
	};
};

Modcharts.MoneyFlowIndexIndicator.prototype.getRangeMin = function(){

	return 0;
};

Modcharts.MoneyFlowIndexIndicator.prototype.getRangeMax = function(){

	return 100;

};

Modcharts.MoneyFlowIndexIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"overbought": new Modcharts.BandMarker(this.params.bands[0]),
		"oversold": new Modcharts.BandMarker(this.params.bands[1])
	};
};

Modcharts.MoneyFlowIndexIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.moneyflowindex];});

};

Modcharts.MoneyFlowIndexIndicator.prototype.render = function(data){

	this.markers.overbought.render(
		this.panel,
		this.yScale()
	);

	this.markers.oversold.render(
		this.panel,
		this.yScale()
	);

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.moneyflowindex || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};


/**
 * OBV indicator
 * @constructor
 * @class OnBalanceVolumeIndicator
 * @extends Indicator
 */
Modcharts.OnBalanceVolumeIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.OnBalanceVolumeIndicator, Modcharts.Indicator);

Modcharts.OnBalanceVolumeIndicator.prototype.getDefaultParams = function() {

	return {
		id: "onbalancevolume",
		name: "On Balance Volume",
		description: "On Balance Volume measures the strength of buying or selling pressure on a security. It represents the cumulative total of volume since indicator inception and adds volume on up days while subtracting the volume on down days.",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-onbalancevolume", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-onbalancevolume", "width")
		}
	};
};

Modcharts.OnBalanceVolumeIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.onbalancevolume || [], function(i){ return +i.onbalancevolume;});
};

Modcharts.OnBalanceVolumeIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.onbalancevolume || [], function(i){ return +i.onbalancevolume;});

};

Modcharts.OnBalanceVolumeIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.OnBalanceVolumeIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.onbalancevolume];});

};

Modcharts.OnBalanceVolumeIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.onbalancevolume || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * P/E Range indicator
 * @constructor
 * @class PERangeIndicator
 * @extends Indicator
 */
Modcharts.PERangeIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.PERangeIndicator, Modcharts.Indicator);

Modcharts.PERangeIndicator.prototype.getDefaultParams = function() {

	return {
		id: "perange",
		name: "P/E Range",
		dataSeries: "perangeupper",
		description: "P/E Range shows the high and low P/E for the period.",
		inputs: [
			{ name: "earningstype", value: 0 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-perange", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-perange", "width"),
			lineColorLow: this.getStyle(".modcharts-indicator-perange-low", "color")
		}
	};
};

Modcharts.PERangeIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.perange || [], function(i){ return +i.perangelower;});
};

Modcharts.PERangeIndicator.prototype.getRangeMax = function(data){
	return d3.max(data.perange || [], function(i){ return +i.perangeupper;});

};

Modcharts.PERangeIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"lineLow": new Modcharts.LineMarker()
	};

};

Modcharts.PERangeIndicator.prototype.getDataMap = function(data, type){

	switch (type){

		case "upper":

			return data.map(function(d){ return [d.dateIndex, +d.perangeupper];});

		case "lower":

			return data.map(function(d){ return [d.dateIndex, +d.perangelower];});

		default:

			return [];

	}
};

Modcharts.PERangeIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.perange || [], "upper"),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

	this.markers.lineLow.render(
		this.panel.rootContext,
		this.getDataMap(data.perange || [], "lower"),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColorLow,
		this.params.style.lineWidth
	);
};

/**
 * P/E Ratio indicator
 * @constructor
 * @class PERatioIndicator
 * @extends Indicator
 */
Modcharts.PERatioIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.PERatioIndicator, Modcharts.Indicator);

Modcharts.PERatioIndicator.prototype.getDefaultParams = function() {

	return {
		id: "peratio",
		name: "P/E Ratio",
		description: "P/E Ratio plots the change in the P/E Ratio over the period of the chart.",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-peratio", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-peratio", "width")
		}
	};
};

Modcharts.PERatioIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.peratio || [], function(i){ return +i.peratio;});
};

Modcharts.PERatioIndicator.prototype.getRangeMax = function(data){
	return d3.max(data.peratio || [], function(i){ return +i.peratio;});

};

Modcharts.PERatioIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"lineLow": new Modcharts.LineMarker()
	};

};

Modcharts.PERatioIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.peratio];});
};

Modcharts.PERatioIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.peratio || [], "upper"),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Previous Close indicator
 * @constructor
 * @class PreviousCloseIndicator
 * @extends Indicator
 */
Modcharts.PreviousCloseIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.PreviousCloseIndicator, Modcharts.Indicator);

Modcharts.PreviousCloseIndicator.prototype.getDefaultParams = function() {

	return {
		id: "previousclose",
		name: "Previous Close",
		description: "Previous Close graphically depicts today's net change. A horizontal line is drawn at the vertical position of the previous day's close. When the chart style is set to mountain, the fill color is typically red below this line, or green above the line.",
		text: null,
		labelAlignment: "nw", // ne, nw, sw, se
		noClip: true,
		style : {
			lineColor: this.getStyle(".modcharts-indicator-previousclose", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-previousclose", "width"),
			textColor: this.getStyle(".modcharts-indicator-previousclose-label", "color"),
			textSize: this.getStyle(".modcharts-indicator-previousclose-label", "font-size"),
			textWeight: this.getStyle(".modcharts-indicator-previousclose-label", "font-weight"),
			textFamily: this.getStyle(".modcharts-indicator-previousclose-label", "font-family"),
			glowColor: this.getStyle(".modcharts-indicator-previousclose-label-glow", "color")
		}
	};
};

Modcharts.PreviousCloseIndicator.prototype.getRangeMin = function(data){
	return (data.previousclose) ? data.previousclose.close * 0.999 : 0;
};

Modcharts.PreviousCloseIndicator.prototype.getRangeMax = function(data){
	return (data.previousclose) ? data.previousclose.close * 1.001 : 0;
};

Modcharts.PreviousCloseIndicator.prototype.getMarkers = function(){
	return {};
};

Modcharts.PreviousCloseIndicator.prototype.getDataMap = function(){
	return {};
};

Modcharts.PreviousCloseIndicator.prototype.getLabelText = function(data){

	var yAxis = this.panel.yAxis,
		formatString = yAxis.getFormatString(),
		tickFormat = yAxis.scale[0].tickFormat(1, formatString)(data.previousclose.close),
		valueFormat = yAxis.getFormatValue(tickFormat),
		dateFormat = (data.previousclose.date && this.panel.core.state.isIntraday) ? d3.time.format("%A")(data.previousclose.date): "Previous";

	return (typeof this.params.text === "string") ? this.params.text : [dateFormat, "Close", valueFormat].join(" ");

};

Modcharts.PreviousCloseIndicator.prototype.getDimensions = function(data){

	var panel = this.panel,
		core = panel.core,
		ctx = panel.rootContext,
		size = panel.size,
		x = 0,
		yClose = this.yScale()(data.previousclose.close),
		y = yClose,
		labelWidth = 0,
		labelHeight = 0,
		labelText = "",
		rightEdge = size.padding.left + size.width,
		leftEdge = size.padding.left,
		isNorth = /ne|nw/.test(this.params.labelAlignment),
		isWest = /nw|sw/.test(this.params.labelAlignment);

	// edge adjustments
	rightEdge = Math.min(rightEdge, panel.xAxis.scale[0](core.closestExchangeIndex(new Date(core.exchangeDates[core.exchangeDates.length - 1]))));
	leftEdge = Math.max(leftEdge, panel.xAxis.scale[0](core.closestExchangeIndex(new Date(core.exchangeDates[0]))));

	if (!isNaN(y)) {

		labelText = this.getLabelText(data);
		labelWidth = ctx.measureText(labelText).width;
		labelHeight = /(\d+)px/.test(ctx.font) ? Number(RegExp.$1) * 1.2 : 12; // rough height calc

		x = isWest ? 5 : rightEdge - labelWidth - 5;
		y += (isNorth) ? -labelHeight - 1 : 2;

	}

	return {
		x: x,
		y: y,
		yClose: yClose,
		labelText: labelText,
		width: labelWidth,
		height: labelHeight,
		rightEdge: rightEdge,
		leftEdge: leftEdge
	};
};

Modcharts.PreviousCloseIndicator.prototype.intersect = function(r1, r2) {

	if (r1.x < r2.x + r2.width && r2.x < r1.x + r1.width && r1.y < r2.y + r2.height){
		return r2.y < r1.y + r1.height;
	} else {
		return false;
	}

};

Modcharts.PreviousCloseIndicator.prototype.render = function(data){

	var dimensions = this.getDimensions(data),
		panel = this.panel,
		ctx = panel.rootContext;

	if (!isNaN(dimensions.y)) {

		// line
		ctx.textBaseline = "top";
		ctx.fillStyle = this.params.style.textColor;
		ctx.lineWidth = this.params.style.lineWidth;
		ctx.strokeStyle = this.params.style.lineColor;

		ctx.beginPath();
		panel.moveTo(ctx, dimensions.leftEdge, dimensions.yClose);
		panel.lineTo(ctx, dimensions.rightEdge, dimensions.yClose);
		ctx.stroke();

		ctx.font = [this.params.style.textWeight, this.params.style.textSize + "px", this.params.style.textFamily].join(" ");

		// label
		this.panel.glowText(
		    ctx,
			dimensions.labelText,
			dimensions.x,
			dimensions.y,
			this.params.style.lineColor,
			this.params.style.glowColor
		);

		// debug bounding box
		//ctx.strokeStyle = this.params.style.lineColor;
		//ctx.strokeRect(dimensions.x, dimensions.y, dimensions.width, dimensions.height);

	}
};

/**
 * Price indicator
 * @constructor
 * @class PriceIndicator
 * @extends Indicator
 */
Modcharts.PriceIndicator = function(args){

	this.superclass.call(this, args);

	this.markerTypeOptions = ["line", "fill", "stepped", "candlestick", "ohlc", "hlc", "posneg", "bar", "dot"];

	this.flags["lastclose"] = new Modcharts.LastCloseFlag({panel: this.panel, indicator: this, id: "lastclose"});

};

Modcharts.Extend(Modcharts.PriceIndicator, Modcharts.Indicator);

Modcharts.PriceIndicator.prototype.getDefaultParams = function() {

	return {
		id: "price",
		name: "Price",
		inputs: [
			{ name: "type", value: "ohlc" }
		],
		dataSeries: "close",
		markerType: "line", // posneg, candlestick, ohlc, hlc, bar
		candleFillType: "hollow", // "hollow", "filled"
		symbol: this.panel.core.params.symbol,
		style: {
			lineColor: this.getStyle(".modcharts-indicator-price", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-price", "width"),
			lineColorSessionBreak: this.getStyle(".modcharts-indicator-price-sessionbreak", "color"),
			penPxOnSessionBreak: this.getStyle(".modcharts-indicator-price-sessionbreak-penpxon", "width"),
			penPxOffSessionBreak: this.getStyle(".modcharts-indicator-price-sessionbreak-penpxoff", "width"),
			diameterDot: this.getStyle(".modcharts-indicator-price-dot-fill", "width") || 5,
			lineColorUp: this.getStyle(".modcharts-indicator-price-lineup", "color"),
			lineColorDown: this.getStyle(".modcharts-indicator-price-linedown", "color"),
			lineColorDot: this.getStyle(".modcharts-indicator-price-dot", "color"),
			fillColor: this.getStyle(".modcharts-indicator-price-fill", "color"),
			fillColorSessionBreak: this.getStyle(".modcharts-indicator-price-fill-sessionbreak", "color"),
			fillColorStart: this.getStyle(".modcharts-indicator-price-fillstart", "color"),
			fillColorStop: this.getStyle(".modcharts-indicator-price-fillstop", "color"),
			fillColorPos: this.getStyle(".modcharts-indicator-price-fillpos", "color") ||
				this.getStyle(".modcharts-indicator-candlestick-pos", "color"),
			fillColorNeg: this.getStyle(".modcharts-indicator-price-fillneg", "color") ||
				this.getStyle(".modcharts-indicator-candlestick-neg", "color"),
			fillColorDot: this.getStyle(".modcharts-indicator-price-dot-fill", "color")
		}
	};
};

Modcharts.PriceIndicator.prototype.getRangeMin = function(data){

	switch (this.params.markerType){

		case "bar":
		case "dot":
		case "posneg":
		case "fill":
		case "line":
		case "stepped": return d3.min(data.price || [], function(i){ return +i.close;});
		case "candlestick":
		case "hlc":
		case "ohlc": return d3.min(data.price || [], function(i){ return +i.low;});

	}
};

Modcharts.PriceIndicator.prototype.getRangeMax = function(data){

	switch (this.params.markerType){

		case "bar":
		case "dot":
		case "posneg":
		case "fill":
		case "line":
		case "stepped": return d3.max(data.price || [], function(i){ return +i.close;});
		case "candlestick":
		case "hlc":
		case "ohlc": return d3.max(data.price || [], function(i){ return +i.high;});

	}
};

/**
 * create marker references.  some may not exist depending on build type.
 */
Modcharts.PriceIndicator.prototype.getMarkers = function(){

	var markers = {};

	if (Modcharts.LineMarker){
		markers["line"] = new Modcharts.LineMarker();
		markers["stepped"] = new Modcharts.LineMarker();
	}

	if (Modcharts.CandlestickMarker){
		markers["candlestick"] = new Modcharts.CandlestickMarker();
	}

	if (Modcharts.PointMarker){
		markers["dot"] = new Modcharts.PointMarker();
	}

	if (Modcharts.BarMarker){
		markers["bar"] = new Modcharts.BarMarker();
	}

	return markers;

};

Modcharts.PriceIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.close, +d.open, +d.high, +d.low]; });

};

Modcharts.PriceIndicator.prototype.render = function(data, sessionType){

	var ctx = this.panel.rootContext,
		core = this.panel.core,
		dataPrice = this.getDataMap(data.price || []),
		markerType = this.params.markerType,
		normalizeValue = null,
		hasPreviousClose = data.previousclose && typeof data.previousclose.close === "number",
		style = this.params.style;

	if (hasPreviousClose){
		normalizeValue = data.previousclose.close;
	} else if (core.params.dataNormalized){
		normalizeValue = 0.0;
	}

	// downgrade posneg markerType if no previousclose data or dataNormalized param
	if (markerType === "posneg" && !hasPreviousClose && !core.params.dataNormalized){
		markerType = "line";
	}

	if (sessionType === "SessionBreak"){

		// the SessionBreak indicator supports less markerTypes than the NormalSession indicator

		var lineColor = (typeof style.lineColorSessionBreak === "string") ? style.lineColorSessionBreak : style.lineColor,
			lineColorUp = (typeof style.lineColorSessionBreak === "string") ? style.lineColorSessionBreak : style.lineColorUp,
			lineColorDown = (typeof style.lineColorSessionBreak === "string") ? style.lineColorSessionBreak : style.lineColorDown,
			penPxOn = (typeof style.penPxOnSessionBreak === "number") ? style.penPxOnSessionBreak : 1,
			penPxOff = (typeof style.penPxOffSessionBreak === "number") ? style.penPxOffSessionBreak : 0;

		switch (markerType){

			case "posneg":

				// top clip
				this.clip(ctx, "above", normalizeValue);
				this.renderLine(
					dataPrice,
					lineColorUp,
					penPxOn,
					penPxOff
				);
				this.clipEnd(ctx);

				// bottom clip
				this.clip(ctx, "below", normalizeValue);
				this.renderLine(
					dataPrice,
					lineColorDown,
					penPxOn,
					penPxOff
				);
				this.clipEnd(ctx);

				break;

			case "line":
			case "fill":

				this.renderLine(
					dataPrice,
					lineColor,
					penPxOn,
					penPxOff
				);
				break;
		}

	} else { // NormalSession

		switch (markerType){

			case "posneg":

				// top clip
				this.clip(ctx, "above", normalizeValue);
				this.renderFill(dataPrice, style.fillColorPos, null, null, normalizeValue);
				this.renderLine(dataPrice, style.lineColorUp);
				this.clipEnd(ctx);

				// bottom clip
				this.clip(ctx, "below", normalizeValue);
				this.renderFill(dataPrice, style.fillColorNeg, null, null, normalizeValue);
				this.renderLine(dataPrice, style.lineColorDown);
				this.clipEnd(ctx);

				break;

			case "dot":

				this.renderDot(dataPrice);
				break;

			case "bar":

				this.renderBar(dataPrice);
				break;

			case "candlestick":

				this.renderCandlestick(dataPrice);
				break;

			case "ohlc":

				this.renderOHLC(dataPrice);
				break;

			case "hlc":

				this.renderHLC(dataPrice);
				break;

			case "line":

				this.renderLine(dataPrice);
				break;

			case "stepped":

				this.renderSteppedLine(dataPrice);
				break;

			default:

				this.renderFill(dataPrice);
				this.renderLine(dataPrice);
				break;
		}

	}
};

Modcharts.PriceIndicator.prototype.renderFill = function(data, fillColor, fillColorStart, fillColorStop, fillToValue){

	fillColor = fillColor || this.params.style.fillColor;
	fillColorStart = fillColorStart || this.params.style.fillColorStart;
	fillColorStop = fillColorStop || this.params.style.fillColorStop;

	if ((typeof fillColor === "string" && fillColor.length > 0) || (typeof fillColorStop === "string" && fillColorStop.length > 0)){

		// fill
		var fillStyle = (typeof fillColorStart === "string" && fillColorStart.length > 0) ? this.getLinearGradient(this.panel.rootContext, fillColorStart, fillColorStop, 0, 0, 0, this.panel.size.height): fillColor,
			dataNormalized = this.panel.isNormalized();

		if (typeof fillToValue !== "number" && dataNormalized){
			fillToValue = 0.0;
		}

		this.markers.line.renderFill(
			this.panel.rootContext,
			data,
			this.panel.size.padding.top + this.panel.size.height,
			this.xScale(),
			this.yScale(),
			fillStyle,
			fillToValue
		);
	}
};

Modcharts.PriceIndicator.prototype.getLineCoords = function(data){

	return this.markers.line.getCoords(
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale()
	);
};

Modcharts.PriceIndicator.prototype.renderLine = function(data, lineColor, penPxOn, penPxOff){

	return this.markers.line.render(
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		lineColor || this.params.style.lineColor,
		this.params.style.lineWidth,
		false,
		penPxOn,
		penPxOff
	);
};

Modcharts.PriceIndicator.prototype.renderSteppedLine = function(data, lineColor){

	return this.markers.line.render(
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		lineColor || this.params.style.lineColor,
		this.params.style.lineWidth,
		true
	);
};

Modcharts.PriceIndicator.prototype.renderBar = function(data){

	return this.markers.bar.render(
		this.panel,
		this.panel.rootContext,
		data || [],
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor
	);
};

Modcharts.PriceIndicator.prototype.renderDot = function(data){

	var radius = this.params.style.diameterDot / 2;

	return this.markers.dot.render(
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		this.params.style.fillColorDot,
		radius,
		this.params.style.lineColorDot
	);
};

Modcharts.PriceIndicator.prototype.renderCandlestick = function(data){

	this.markers.candlestick.params.fillType = this.params.candleFillType;

	this.markers.candlestick.render(
		this.panel,
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.fillColorPos,
		this.params.style.fillColorNeg
	);
};

Modcharts.PriceIndicator.prototype.renderOHLC = function(data){

	this.markers.candlestick.renderOHLC(
		this.panel,
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		"ohlc"
	);
};

Modcharts.PriceIndicator.prototype.renderHLC = function(data){

	this.markers.candlestick.renderOHLC(
		this.panel,
		this.panel.rootContext,
		data,
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		"hlc"
	);
};

/**
 * Price Channel indicator
 * @constructor
 * @class PriceChannelIndicator
 * @extends Indicator
 */
Modcharts.PriceChannelIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.PriceChannelIndicator, Modcharts.Indicator);

Modcharts.PriceChannelIndicator.prototype.getDefaultParams = function() {

	return {
		id: "pricechannel",
		name: "Price Channel",
		description: "Price Channel is a trending indicator that shows the high and low prices for a period. It is typically a bullish signal, when a stock breaks out above the prior high for a period.",
		inputs: [
			{ name: "period", value: 20 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-pricechannel", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-pricechannel", "width"),
			fillColor: this.getStyle(".modcharts-indicator-pricechannel-fill", "color")
		}
	};
};

Modcharts.PriceChannelIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.pricechannel || [], function(i){ return +i.pricechannellower;});

};

Modcharts.PriceChannelIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.pricechannel || [], function(i){ return +i.pricechannelupper;});
};

Modcharts.PriceChannelIndicator.prototype.getMarkers = function(){

	return this.markers || {
		"lineUp": new Modcharts.LineMarker(),
		"lineDown": new Modcharts.LineMarker(),
		"lineFill": new Modcharts.LineMarker()
	};
};

Modcharts.PriceChannelIndicator.prototype.getDataMap = function(data, type){

	return data.map(function(d){ return [d.dateIndex, +d[type]];});

};

Modcharts.PriceChannelIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		x = this.xScale(),
		y = this.yScale(),
		dataUp = this.getDataMap(data.pricechannel || [], "pricechannelupper"),
		dataDown = this.getDataMap(data.pricechannel || [], "pricechannellower");

	this.markers.lineFill.renderFillBetween(ctx, dataUp, dataDown, x, y, this.params.style.fillColor);

	this.markers.lineUp.render(
		ctx,
		dataUp,
		x,
		y,
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

	this.markers.lineDown.render(
		ctx,
		dataDown,
		x,
		y,
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

};

/**
 * Price Rate of Change indicator
 * @constructor
 * @class PROCIndicator
 * @extends Indicator
 */
Modcharts.PROCIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.PROCIndicator, Modcharts.Indicator);

Modcharts.PROCIndicator.prototype.getDefaultParams = function() {

	return {
		id: "proc",
		name: "Price Rate of Change",
		description: "A technical indicator that measures the percentage change between the most recent price and the price \"n\" periods in the past. (Source: <a href=\"http://www.investopedia.com/terms/p/pricerateofchange.asp\">investopedia.com</a>)",
		inputs: [
			{ name: "period", value: 25 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-proc", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-proc", "width"),
			lineColorZero: this.getStyle(".modcharts-indicator-proc-zero", "color")
		}
	};
};

Modcharts.PROCIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.proc || [], function(i){ return +i.proc;});
};

Modcharts.PROCIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.proc || [], function(i){ return +i.proc;});

};

Modcharts.PROCIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.PROCIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.proc];});

};

Modcharts.PROCIndicator.prototype.renderZeroLine = function(ctx, yScale){

	var left = this.panel.size.padding.left,
		y0 = this.panel.px(yScale(0));

	ctx.beginPath();
	ctx.lineWidth = this.params.style.lineWidthZero;
	ctx.strokeStyle = this.params.style.lineColorZero;
	ctx.moveTo(left, y0);
	ctx.lineTo(this.panel.size.width + left, y0);
	ctx.stroke();
};

Modcharts.PROCIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		yScale = this.yScale();

	this.markers.line.render(
		ctx,
		this.getDataMap(data.proc || []),
		this.xScale(),
		yScale,
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

	this.renderZeroLine(ctx, yScale);
};

/**
 * PSAR indicator
 * @constructor
 * @class PSARIndicator
 * @extends Indicator
 */
Modcharts.PSARIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.PSARIndicator, Modcharts.Indicator);

Modcharts.PSARIndicator.prototype.getDefaultParams = function() {

	return {
		id: "psar",
		name: "PSAR",
		description: "Parabolic SAR signals the potential reversal of a trend.",
		inputs: [
			{ name: "initialPosition", value: 0 },
			{ name: "accelerationIncrease", value: 0.02 },
			{ name: "accelerationMaximum", value: 0.02 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-psar", "color"),
			radiusWidth: this.getStyle(".modcharts-indicator-psar", "width")
		}
	};
};

Modcharts.PSARIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.psar || [], function(i){ return +i.psar;});

};

Modcharts.PSARIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.psar || [], function(i){ return +i.psar;});

};

Modcharts.PSARIndicator.prototype.getMarkers = function(){

	return this.markers || {
		"pointPSAR": new Modcharts.PointMarker()
	};
};

Modcharts.PSARIndicator.prototype.getDataMap = function(data, type){

	return data.map(function(d){ return [d.dateIndex, +d[type]];});

};

Modcharts.PSARIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		dataPSAR = this.getDataMap(data.psar || [], "psar");

	this.markers.pointPSAR.render(ctx, dataPSAR, this.xScale(), this.yScale(), this.params.style.lineColor, this.params.style.radiusWidth);

	dataPSAR = null;

};

/**
 * Revenue indicator
 * @constructor
 * @class RevenuesIndicator
 * @extends Indicator
 */
Modcharts.RevenuesIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.RevenuesIndicator, Modcharts.Indicator);

Modcharts.RevenuesIndicator.prototype.getDefaultParams = function() {

	return {
		id: "revenues",
		name: "Revenues",
		description: "",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-revenue", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-revenue", "width")
		}
	};
};

Modcharts.RevenuesIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.revenues || [], function(i){ return +i.revenues * 0.95;});

};

Modcharts.RevenuesIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.revenues || [], function(i){ return +i.revenues * 1.05;});

};

Modcharts.RevenuesIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.RevenuesIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.revenues];});

};

Modcharts.RevenuesIndicator.prototype.render = function(data){

	var dataRevenues = this.getDataMap(data.revenues || []),
		xScale = this.xScale(),
		yScale = this.yScale();

	this.markers.line.render(
		this.panel.rootContext,
		dataRevenues,
		xScale,
		yScale,
		this.params.style.lineColor,
		this.params.style.lineWidth,
		true
	);

	// draw final segment to edge of chart
	if (dataRevenues.length){

		var core = this.panel.core,
			lastDate = core.dataPrimary[core.dataPrimary.length - 1].date,
			lastIndex = core.closestExchangeIndex(lastDate),
			x = xScale(lastIndex),
			y = yScale(dataRevenues[dataRevenues.length - 1][1]);

		this.panel.rootContext.lineTo(this.markers.line.px(x), this.markers.line.px(y));
		this.panel.rootContext.stroke();
	}

};

/**
 * Rolling Dividend indicator
 * @constructor
 * @class RollingDividendIndicator
 * @extends Indicator
 */
Modcharts.RollingDividendIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.RollingDividendIndicator, Modcharts.Indicator);

Modcharts.RollingDividendIndicator.prototype.getDefaultParams = function() {

	return {
		id: "rollingdividend",
		name: "Rolling Dividend",
		description: "",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-rollingdividend", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-rollingdividend", "width")
		}
	};
};

Modcharts.RollingDividendIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.rollingdividend || [], function(i){ return +i.rollingdividend * 0.95;});

};

Modcharts.RollingDividendIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.rollingdividend || [], function(i){ return +i.rollingdividend * 1.05;});

};

Modcharts.RollingDividendIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.RollingDividendIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.rollingdividend];});

};

Modcharts.RollingDividendIndicator.prototype.render = function(data){

	var dataDividend = this.getDataMap(data.rollingdividend || []),
		xScale = this.xScale(),
		yScale = this.yScale();

	this.markers.line.render(
		this.panel.rootContext,
		dataDividend,
		xScale,
		yScale,
		this.params.style.lineColor,
		this.params.style.lineWidth,
		true
	);

	// draw final segment to edge of chart
	if (dataDividend.length){

		var core = this.panel.core,
			lastDate = core.dataPrimary[core.dataPrimary.length - 1].date,
			lastIndex = core.closestExchangeIndex(lastDate),
			x = xScale(lastIndex),
			y = yScale(dataDividend[dataDividend.length - 1][1]);

		this.panel.rootContext.lineTo(this.markers.line.px(x), this.markers.line.px(y));
		this.panel.rootContext.stroke();
	}

};

/**
 * Rolling EPS indicator
 * @constructor
 * @class RollingEPSIndicator
 * @extends Indicator
 */
Modcharts.RollingEPSIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.RollingEPSIndicator, Modcharts.Indicator);

Modcharts.RollingEPSIndicator.prototype.getDefaultParams = function() {

	return {
		id: "rollingeps",
		name: "Rolling EPS",
		description: "A measure of a company's earnings per share based on the previous two quarters added to the upcoming two quarters' estimated EPS. (Source: <a href=\"http://www.investopedia.com/terms/r/rollingeps.asp\">investopedia.com</a>)",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-rollingeps", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-rollingeps", "width")
		}
	};
};

Modcharts.RollingEPSIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.rollingeps || [], function(i){ return +i.rollingeps * 0.95;});

};

Modcharts.RollingEPSIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.rollingeps || [], function(i){ return +i.rollingeps * 1.05;});

};

Modcharts.RollingEPSIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.RollingEPSIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.rollingeps];});

};

Modcharts.RollingEPSIndicator.prototype.render = function(data){

	var dataEPS = this.getDataMap(data.rollingeps || []),
		xScale = this.xScale(),
		yScale = this.yScale();

	this.markers.line.render(
		this.panel.rootContext,
		dataEPS,
		xScale,
		yScale,
		this.params.style.lineColor,
		this.params.style.lineWidth,
		true
	);

	// draw final segment to edge of chart
	if (dataEPS.length){

		var core = this.panel.core,
			lastDate = core.dataPrimary[core.dataPrimary.length - 1].date,
			lastIndex = core.closestExchangeIndex(lastDate),
			x = xScale(lastIndex),
			y = yScale(dataEPS[dataEPS.length - 1][1]);

		this.panel.rootContext.lineTo(this.markers.line.px(x), this.markers.line.px(y));
		this.panel.rootContext.stroke();
	}

};

/**
 * RSI indicator
 * @constructor
 * @class RSIIndicator
 * @extends Indicator
 */
Modcharts.RSIIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.RSIIndicator, Modcharts.Indicator);

Modcharts.RSIIndicator.prototype.getDefaultParams = function() {

	return {
		id: "rsi",
		name: "RSI",
		description: "The Relative Strength Index is a momentum indicator which measures the strength of price changes relative to prior moves.",
		inputs: [
			{ name: "period", value: 15 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-rsi", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-rsi", "width"),
			yAxisPaddingTop: 0,
			yAxisPaddingBottom: 0
		},
		bands: [
			{
				labelText: "Overbought",
				valHigh: 100,
				valLow: 70,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-rsi-overbought", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-rsi-overbought", "color")
				}
			},
			{
				labelText: "Oversold",
				valHigh: 30,
				valLow: 0,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-rsi-oversold", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-rsi-oversold", "color")
				}
			}
		]
	};
};

Modcharts.RSIIndicator.prototype.getRangeMin = function(){

	return 0;
};

Modcharts.RSIIndicator.prototype.getRangeMax = function(){

	return 100;

};

Modcharts.RSIIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"overbought": new Modcharts.BandMarker(this.params.bands[0]),
		"oversold": new Modcharts.BandMarker(this.params.bands[1])
	};

};

Modcharts.RSIIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.rsi];});

};

/**
 * period settings per JIRA NXC-368
 */
Modcharts.RSIIndicator.prototype.setBandsByPeriod = function(){

	var period = this.getInput("period") || 0,
		overBought = [100,70],
		overSold = [30,0];

	if (period <= 2){

		overBought = [100,90];
		overSold = [10,0];

	} else if (period >= 22){

		overBought = [100,60];
		overSold = [40,0];
	}

	this.markers.overbought.params.valHigh = overBought[0];
	this.markers.overbought.params.valLow = overBought[1];

	this.markers.oversold.params.valHigh = overSold[0];
	this.markers.oversold.params.valLow = overSold[1];

};

Modcharts.RSIIndicator.prototype.render = function(data){

	this.setBandsByPeriod();

	this.markers.overbought.render(
		this.panel,
		this.yScale()
	);

	this.markers.oversold.render(
		this.panel,
		this.yScale()
	);

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.rsi || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Sector Industry indicator
 * @constructor
 * @class SectorIndustryIndicator
 * @extends Indicator
 */
Modcharts.SectorIndustryIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.SectorIndustryIndicator, Modcharts.Indicator);

Modcharts.SectorIndustryIndicator.prototype.getDefaultParams = function() {

	return {
		id: "sectorindustry",
		name: "Sector & Industry",
		description: "",
		inputs: [
			{ name: "cusip", value: "INVALIDCUSIP" } // note: pass valid cusip when creating indicator
		],
		style: {
			lineColor: this.getStyle(".modcharts-indicator-sectorindustry", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-sectorindustry", "width")
		},
		valueMultiplier: 1
	};
};

Modcharts.SectorIndustryIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.sectorindustry || [], function(i){ return +i.sectorindustry;});

};

Modcharts.SectorIndustryIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.sectorindustry || [], function(i){ return +i.sectorindustry;});

};

Modcharts.SectorIndustryIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.SectorIndustryIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.sectorindustry];});

};

Modcharts.SectorIndustryIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.sectorindustry || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * SMA indicator
 * @constructor
 * @class SMAIndicator
 * @extends Indicator
 */
Modcharts.SMAIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.SMAIndicator, Modcharts.Indicator);

Modcharts.SMAIndicator.prototype.getDefaultParams = function() {

	return {
		id: "sma",
		name: "SMA",
		description: "Moving Averages are trend indicators that smooth stock price movements. Comparing the moving averages from multiple time frames can help investors spot changes in trend.",
		inputs: [
			{ name: "period", value: 15 }
		],
		style: {
			lineColor: this.getStyle(".modcharts-indicator-sma", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-sma", "width")
		}
	};
};

Modcharts.SMAIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.sma || [], function(i){ return +i.sma;});

};

Modcharts.SMAIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.sma || [], function(i){ return +i.sma;});

};

Modcharts.SMAIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.SMAIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.sma];});

};

Modcharts.SMAIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.sma || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Stochastics indicator
 * @constructor
 * @class StochasticsIndicator
 * @extends Indicator
 */
Modcharts.StochasticsIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.StochasticsIndicator, Modcharts.Indicator);

Modcharts.StochasticsIndicator.prototype.getDefaultParams = function() {

	return {
		id: "stochastics",
		name: "Stochastics",
		dataSeries: "stochastick",
		description: "Stochastics show periods when a stock is overbought or oversold.",
		inputs: [
			{ name: "kperiod", value: 13 },
			{ name: "smoothing", value: 3 },
			{ name: "dperiod", value: 3 }
		],
		style: {
			lineColor: this.getStyle(".modcharts-indicator-stochastics", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-stochastics", "width"),
			lineColorD: this.getStyle(".modcharts-indicator-stochastics-d", "color"),
			yAxisPaddingTop: 0,
			yAxisPaddingBottom: 0
		},
		bands: [
			{
				labelText: "Overbought",
				valHigh: 100,
				valLow:  80,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-stochastics-overbought", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-stochastics-overbought", "color")
				}
			},
			{
				labelText: "Oversold",
				valHigh: 20,
				valLow: 0,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-stochastics-oversold", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-stochastics-oversold", "color")
				}
			}
		]
	};
};

Modcharts.StochasticsIndicator.prototype.getRangeMin = function(){

	return 0;
};

Modcharts.StochasticsIndicator.prototype.getRangeMax = function(){

	return 100;

};

Modcharts.StochasticsIndicator.prototype.getMarkers = function(){

	return {
		"lineK": new Modcharts.LineMarker(),
		"lineD": new Modcharts.LineMarker(),
		"overbought": new Modcharts.BandMarker(this.params.bands[0]),
		"oversold": new Modcharts.BandMarker(this.params.bands[1])
	};

};

Modcharts.StochasticsIndicator.prototype.getDataMap = function(data, type){

	return data.map(function(d){ return [d.dateIndex, +d[type]];});

};

Modcharts.StochasticsIndicator.prototype.render = function(data){

	this.markers.overbought.render(
		this.panel,
		this.yScale()
	);

	this.markers.oversold.render(
		this.panel,
		this.yScale()
	);

	this.markers.lineK.render(
		this.panel.rootContext,
		this.getDataMap(data.stochastics || [], "stochastick"),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

	this.markers.lineD.render(
		this.panel.rootContext,
		this.getDataMap(data.stochastics || [], "stochasticd"),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColorD,
		this.params.style.lineWidth
	);
};

/**
 * Time Series Forecast indicator
 * @constructor
 * @class TSFIndicator
 * @extends Indicator
 */
Modcharts.TSFIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.TSFIndicator, Modcharts.Indicator);

Modcharts.TSFIndicator.prototype.getDefaultParams = function() {

	return {
		id: "tsf",
		name: "Time Series Forecast",
		description: "The Time Series Forecast function predicts a future value of a field using the value of a given period linear regression line.",
		inputs: [
			{ name: "period", value: 15 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-tsf", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-tsf", "width")
		}
	};
};

Modcharts.TSFIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.tsf || [], function(i){ return +i.tsf;});
};

Modcharts.TSFIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.tsf || [], function(i){ return +i.tsf;});

};

Modcharts.TSFIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.TSFIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.tsf];});

};

Modcharts.TSFIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.tsf || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Ultimate Oscillator indicator
 * @constructor
 * @class UltimateOscillatorIndicator
 * @extends Indicator
 */
Modcharts.UltimateOscillatorIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.UltimateOscillatorIndicator, Modcharts.Indicator);

Modcharts.UltimateOscillatorIndicator.prototype.getDefaultParams = function() {

	return {
		id: "ultimateoscillator",
		name: "Ultimate Oscillator",
		description: "The Ultimate Oscillator reduces the effect of time from the oscillator's bullish and bearish signals. This indicator is most effective when it offers a bullish or bearish divergence.",
		inputs: [
			{ name: "period1", value: 7 },
			{ name: "period2", value: 14 },
			{ name: "period3", value: 28 },
			{ name: "factor1", value: 4 },
			{ name: "factor2", value: 2 },
			{ name: "factor3", value: 1 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-ultimateoscillator", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-ultimateoscillator", "width"),
			yAxisPaddingTop: 0,
			yAxisPaddingBottom: 0
		},
		bands: [
			{
				labelText: "Overbought",
				valHigh: 100,
				valLow: 70,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-ultimateoscillator-overbought", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-ultimateoscillator-overbought", "color")
				}
			},
			{
				labelText: "Oversold",
				valHigh: 30,
				valLow: 0,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-ultimateoscillator-oversold", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-ultimateoscillator-oversold", "color")
				}
			}
		]
	};
};

Modcharts.UltimateOscillatorIndicator.prototype.getRangeMin = function(){

	return 0;
};

Modcharts.UltimateOscillatorIndicator.prototype.getRangeMax = function(){

	return 100;

};

Modcharts.UltimateOscillatorIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"overbought": new Modcharts.BandMarker(this.params.bands[0]),
		"oversold": new Modcharts.BandMarker(this.params.bands[1])
	};

};

Modcharts.UltimateOscillatorIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.ultimateoscillator];});

};

Modcharts.UltimateOscillatorIndicator.prototype.render = function(data){

	this.markers.overbought.render(
		this.panel,
		this.yScale()
	);

	this.markers.oversold.render(
		this.panel,
		this.yScale()
	);

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.ultimateoscillator || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * Up/Down indicator
 * @constructor
 * @class UpDownIndicator
 * @extends Indicator
 */
Modcharts.UpDownIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.UpDownIndicator, Modcharts.Indicator);

Modcharts.UpDownIndicator.prototype.getDefaultParams = function() {

	return {
		id: "updown",
		name: "Up/Down",
		description: "The Up/Down Ratio indicator shows the relationship between the volume of advancing issues and the volume of declining issues. Upside volume is simply the sum of all volume associated with stocks that closed up in price, while downside volume is the sum of all volume associated with stocks that closed down in price. (Source: <a href=\"http://bigcharts.marketwatch.com/help/glossary/detail.asp?LevelOneId=LowerIndicator&LevelTwoId=UpDownRatio\">Big Charts</a>)",
		style : {
			fillColor: this.getStyle(".modcharts-indicator-updown", "color")
		}
	};
};

Modcharts.UpDownIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.updown || [], function(i){ return +i.updown;});

};

Modcharts.UpDownIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.updown || [], function(i){ return +i.updown;});

};

Modcharts.UpDownIndicator.prototype.getMarkers = function(){

	return { "bar": new Modcharts.BarMarker() };

};

Modcharts.UpDownIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.updown];});

};

Modcharts.UpDownIndicator.prototype.render = function(data){

	this.markers.bar.render(
		this.panel,
		this.panel.rootContext,
		this.getDataMap(data.updown || []),
		this.panel.size.width,
		this.xScale(),
		this.yScale(),
		this.params.style.fillColor
	);
};

/**
 * Up/Down Ratio indicator
 * @constructor
 * @class UpDownIndicator
 * @extends Indicator
 */
Modcharts.UpDownRatioIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.UpDownRatioIndicator, Modcharts.Indicator);

Modcharts.UpDownRatioIndicator.prototype.getDefaultParams = function() {

	return {
		id: "updownratio",
		name: "Up/Down Ratio",
		description: "The Up/Down ratio indicator shows the relationship between the volume of advancing issues and the volume of declining issues. Upside volume is simply the sum of all volume associated with stocks that closed up in price, while downside volume is the sum of all volume associated with stocks that closed down in price. (Source: <a href=\"http://bigcharts.marketwatch.com/help/glossary/detail.asp?LevelOneId=LowerIndicator&LevelTwoId=UpDownRatio\">Big Charts</a>)",
		style : {
			lineColor: this.getStyle(".modcharts-indicator-updownratio", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-updownratio", "width")
		},
		inputs: [
			{ name: "Numerator", value: 10025197 },
			{ name: "Denominator", value: 10025198 }
		],
	};
};

Modcharts.UpDownRatioIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.updownratio || [], function(i) { return + i.updownratio; });
};

Modcharts.UpDownRatioIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.updownratio || [], function(i) { return + i.updownratio; });
};

Modcharts.UpDownRatioIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker()
	};

};

Modcharts.UpDownRatioIndicator.prototype.getDataMap = function(data){

	return data.map(function(d) { return [d.dateIndex, + d.updownratio];});

};

Modcharts.UpDownRatioIndicator.prototype.render = function(data) {

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.updownratio || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};
/**
 * Volume indicator
 * @constructor
 * @class VolumeIndicator
 * @extends Indicator
 */
Modcharts.VolumeIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.VolumeIndicator, Modcharts.Indicator);

Modcharts.VolumeIndicator.prototype.getDefaultParams = function() {

	return {
		id: "volume",
		name: "Volume",
		description: "Volume is the number of shares traded in a given period.",
		markerType: "default", // default, posneg
		style : {
			fillColor: this.getStyle(".modcharts-indicator-volume", "color"),
			fillColorPos: this.getStyle(".modcharts-indicator-volume-pos", "color"),
			fillColorNeg: this.getStyle(".modcharts-indicator-volume-neg", "color"),
			fillColorUnch: this.getStyle(".modcharts-indicator-volume-unch", "color") || "#999",
			yAxisPaddingBottom: 0
		}
	};
};

Modcharts.VolumeIndicator.prototype.getRangeMin = function(data){

	return this.min(0, d3.min(data.volume || [], function(i){ return +i.volume;}));

};

Modcharts.VolumeIndicator.prototype.getRangeMax = function(data){

	return this.max(0, d3.max(data.volume || [], function(i){ return +i.volume;}));

};

Modcharts.VolumeIndicator.prototype.getMarkers = function(){

	return { "bar": new Modcharts.BarMarker() };

};

Modcharts.VolumeIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.volume];});

};

Modcharts.VolumeIndicator.prototype.getDataMapPosNeg = function(data, dataPrice, type){

		// return pos/neg/unchanged volume data based against the price dataset
		switch (type){

		case "pos":

			return data.map(function(d, x){

				// fix undefined diffs with x > 0 (can happen after panning an OHLC chart)
				if (typeof dataPrice[x].diff === "undefined" && x > 0){
					dataPrice[x].diff = dataPrice[x].close - dataPrice[x-1].close;
				}

				return [d.dateIndex, (typeof dataPrice[x].diff === "number" && dataPrice[x].diff > 0) ? +d.volume : 0];

			});

		case "neg":

			return data.map(function(d, x){

				return [d.dateIndex, (typeof dataPrice[x].diff === "number" && dataPrice[x].diff < 0) ? +d.volume : 0];

			});

		case "unch":

			return data.map(function(d, x){

				return [d.dateIndex, !dataPrice[x].diff ? +d.volume : 0];

			});

	}

};

Modcharts.VolumeIndicator.prototype.render = function(data){

	if (this.params.markerType === "posneg" && data.price && data.price.length === data.volume.length){

		this.markers.bar.render(
			this.panel,
			this.panel.rootContext,
			this.getDataMapPosNeg(data.volume, data.price, "pos"),
			this.xScale(),
			this.yScale(),
			this.params.style.fillColorPos
		);

		this.markers.bar.render(
			this.panel,
			this.panel.rootContext,
			this.getDataMapPosNeg(data.volume, data.price, "neg"),
			this.xScale(),
			this.yScale(),
			this.params.style.fillColorNeg
		);

		this.markers.bar.render(
			this.panel,
			this.panel.rootContext,
			this.getDataMapPosNeg(data.volume, data.price, "unch"),
			this.xScale(),
			this.yScale(),
			this.params.style.fillColorUnch
		);

	} else {

		this.markers.bar.render(
			this.panel,
			this.panel.rootContext,
			this.getDataMap(data.volume || []),
			this.xScale(),
			this.yScale(),
			this.params.style.fillColor
		);

	}

};

/**
 * Volume By Price indicator
 * @constructor
 * @class VolumeByPriceIndicator
 * @extends Indicator
 */
Modcharts.VolumeByPriceIndicator = function (args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.VolumeByPriceIndicator, Modcharts.Indicator);

Modcharts.VolumeByPriceIndicator.prototype.getDefaultParams = function() {

	return {
		id: "volumebyprice",
		datasetId: "volume", // this will be the id sent to the chartAPI request.  typical indicators will not pass this.
		name: "Volume by Price",
		description: "An indicator that shows the amount of volume for a particular price range.",
		noClip: true,
		inputs: [
			{ name: "numBars", value: 12 },
			{ name: "gapSize", value: 1 },
			{ name: "barWidth", value: 0.5 }
		],
		style : {
			upColor: this.getStyle(".modcharts-indicator-volumebyprice-up", "color"),
			downColor: this.getStyle(".modcharts-indicator-volumebyprice-down", "color")
		}
	};
};

Modcharts.VolumeByPriceIndicator.prototype.getRangeMin = function(){ return null; };
Modcharts.VolumeByPriceIndicator.prototype.getRangeMax = function(){ return null; };
Modcharts.VolumeByPriceIndicator.prototype.getMarkers = function(){ return {}; };
Modcharts.VolumeByPriceIndicator.prototype.getDataMap = function(){ return null; };

Modcharts.VolumeByPriceIndicator.prototype.render = function(data){

	if (!data.volume || !data.price){

		this.panel.core.warn("The Volume indicator is needed to render Volume By Price");
		return;
	}

	var ctx = this.panel.rootContext,
		gapSize = this.params.inputs[1].value,
		maxData = this.panel.yAxis.scale[0].domain(),
		dist = maxData[0] - maxData[1],
		numBars = this.params.inputs[0].value,
		size = dist / numBars,
		barHeight = this.panel.size.height / numBars,
		bucketsUp = new Array(numBars),
		bucketsDown = new Array(numBars),
		bucketsUpWidth = new Array(numBars),
		xDomain = this.panel.xAxis.scale[0].domain(),
		x = 0 , y = 0, maxVal = 0,
		y0 = 0,
		width = 0,
		fullWidth = this.panel.size.width * this.params.inputs[2].value;

	// init buckets
	for (y=0; y < numBars; y++){

		bucketsUp[y] = 0;
		bucketsDown[y] = 0;
	}

	// populate buckets
	for (x=0; x < data.volume.length; x++){

		if (!data.price[x]) { continue; }

		var diff = (x > 0) ? data.price[x].close - data.price[x-1].close : 0,
			val = data.price[x].close,
			volume = data.volume[x].volume,
			threshold = maxData[1];

		// don't include datapoints that are offscreen
		if (!diff || data.price[x].dateIndex < xDomain[0] || data.price[x].dateIndex > xDomain[1]){
			continue;
		}

		// populate
		for (y=0; y < numBars; y++){

			if (val >= threshold && val < threshold + size){

				if (diff >= 0){

					bucketsUp[y] += volume;

				} else if (diff < 0){

					bucketsDown[y] += volume;
				}
			}

			threshold += size;
		}
	}

	// find max row
	for (y=0; y < numBars; y++){
		maxVal = Math.max(bucketsUp[y] + bucketsDown[y], maxVal);
	}

	// render bucketsUp
	ctx.beginPath();
	ctx.fillStyle = this.params.style.upColor;

	for (x = bucketsUp.length - 1; x >= 0; x--){

		width = (bucketsUp[x] / maxVal) * fullWidth;

		ctx.rect(0, y0 + gapSize, width, barHeight - gapSize * 2);

		y0 += barHeight;

		bucketsUpWidth[x] = width;

	}

	ctx.fill();

	// render bucketsDown
	ctx.beginPath();
	ctx.fillStyle = this.params.style.downColor;
	y0 = 0;

	for (x = bucketsDown.length - 1; x >= 0; x--){

		width = (bucketsDown[x] / maxVal) * fullWidth;

		ctx.rect(bucketsUpWidth[x], y0 + gapSize, width, barHeight - gapSize * 2);

		y0 += barHeight;

		bucketsUpWidth[x] = width;

	}

	ctx.fill();
};

/**
 * Volume Rate of Change indicator
 * @constructor
 * @class VROCIndicator
 * @extends Indicator
 */
Modcharts.VROCIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.VROCIndicator, Modcharts.Indicator);

Modcharts.VROCIndicator.prototype.getDefaultParams = function() {

	return {
		id: "vroc",
		name: "Volume Rate of Change",
		description: "Rate of Change measures the change in a stock's price over some period. It is useful in identifying periods where a security may be overbought or oversold.",
		inputs: [
			{ name: "period", value: 10 }
		],
		style: {
			lineColor: this.getStyle(".modcharts-indicator-vroc", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-vroc", "width"),
			lineColorZero: this.getStyle(".modcharts-indicator-vroc-zero", "color")
		}
	};
};

Modcharts.VROCIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.vroc || [], function(i){ return +i.vroc;});

};

Modcharts.VROCIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.vroc || [], function(i){ return +i.vroc;});

};

Modcharts.VROCIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.VROCIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.vroc];});

};

Modcharts.VROCIndicator.prototype.renderZeroLine = function(ctx, yScale){

	var left = this.panel.size.padding.left,
		y0 = this.panel.px(yScale(0));

	ctx.beginPath();
	ctx.lineWidth = this.params.style.lineWidthZero;
	ctx.strokeStyle = this.params.style.lineColorZero;
	ctx.moveTo(left, y0);
	ctx.lineTo(this.panel.size.width + left, y0);
	ctx.stroke();
};

Modcharts.VROCIndicator.prototype.render = function(data){

	var ctx = this.panel.rootContext,
		yScale = this.yScale();

	this.markers.line.render(
		ctx,
		this.getDataMap(data.vroc || []),
		this.xScale(),
		yScale,
		this.params.style.lineColor,
		this.params.style.lineWidth
	);

	this.renderZeroLine(ctx, yScale);
};

/**
 * Williams %R indicator
 * @constructor
 * @class WilliamsIndicator
 * @extends Indicator
 */
Modcharts.WilliamsIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.WilliamsIndicator, Modcharts.Indicator);

Modcharts.WilliamsIndicator.prototype.getDefaultParams = function() {

	return {
		id: "williamspctr",
		name: "Williams %R",
		description: "Williams %R uses a similar calculation to the Stochastic Oscillator and provides information on the price momentum of a security. It is also used to identify overbought and oversold levels.",
		inputs: [
			{ name: "period", value: 14 }
		],
		style : {
			lineColor: this.getStyle(".modcharts-indicator-williamspctr", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-williamspctr", "width"),
			yAxisPaddingTop: 0,
			yAxisPaddingBottom: 0
		},
		bands: [
			{
				labelText: "Overbought",
				valHigh: 0,
				valLow: -20,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-williamspctr-overbought", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-williamspctr-overbought", "color")
				}
			},
			{
				labelText: "Oversold",
				valHigh: -80,
				valLow: -100,
				style: {
					fillColor: this.getStyle(".modcharts-indicator-williamspctr-oversold", "background-color"),
					lineColor: this.getStyle(".modcharts-indicator-williamspctr-oversold", "color")
				}
			}
		]
	};
};

Modcharts.WilliamsIndicator.prototype.getRangeMin = function(){

	return -100;
};

Modcharts.WilliamsIndicator.prototype.getRangeMax = function(){

	return 0;

};

Modcharts.WilliamsIndicator.prototype.getMarkers = function(){

	return {
		"line": new Modcharts.LineMarker(),
		"overbought": new Modcharts.BandMarker(this.params.bands[0]),
		"oversold": new Modcharts.BandMarker(this.params.bands[1])
	};

};

Modcharts.WilliamsIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.williamspctr];});

};

Modcharts.WilliamsIndicator.prototype.render = function(data){

	this.markers.overbought.render(
		this.panel,
		this.yScale()
	);

	this.markers.oversold.render(
		this.panel,
		this.yScale()
	);

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.williamspctr || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * WMA indicator
 * @constructor
 * @class WMAIndicator
 * @extends Indicator
 */
Modcharts.WMAIndicator = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.WMAIndicator, Modcharts.Indicator);

Modcharts.WMAIndicator.prototype.getDefaultParams = function() {

	return {
		name: "WMA",
		id: "wma",
		description: "Moving Averages are trend indicators that smooth stock price movements. Comparing the moving averages from multiple time frames can help investors spot changes in trend. Like the EMA, Weighted Moving Averages place greater emphasis on more recent periods.",
		inputs: [
			{ name: "period", value: 15 }
		],
		style: {
			lineColor: this.getStyle(".modcharts-indicator-wma", "color"),
			lineWidth: this.getStyle(".modcharts-indicator-wma", "width")
		}
	};

};

Modcharts.WMAIndicator.prototype.getRangeMin = function(data){

	return d3.min(data.wma || [], function(i){ return +i.wma;});

};

Modcharts.WMAIndicator.prototype.getRangeMax = function(data){

	return d3.max(data.wma || [], function(i){ return +i.wma;});

};

Modcharts.WMAIndicator.prototype.getMarkers = function(){

	return { "line": new Modcharts.LineMarker() };

};

Modcharts.WMAIndicator.prototype.getDataMap = function(data){

	return data.map(function(d){ return [d.dateIndex, +d.wma];});

};

Modcharts.WMAIndicator.prototype.render = function(data){

	this.markers.line.render(
		this.panel.rootContext,
		this.getDataMap(data.wma || []),
		this.xScale(),
		this.yScale(),
		this.params.style.lineColor,
		this.params.style.lineWidth
	);
};

/**
 * mouse click fired.  based on current chart state, call various click handlers
 * @method onClick
 */
Modcharts.prototype.onClick = function(el) {

	//console.log("onClick");

	var mouse = d3.mouse(el),
		tool, activePanel = this.getActivePanel(mouse);

	d3.event.preventDefault();
	d3.event.stopPropagation();

	this.concealCrosshairs();

	if (!activePanel){ return; }

	if (this.state.preventClick){

		this.state.preventClick = null;
		return;
	}

	// Don't even render the handle if the domain of the y-axis is 0
	var domain = activePanel.yAxis.scale[0].domain();

	// we have a toolmode selected, eg we're about to draw a tool or continue a tool chord
	if (this.state.toolmode && Math.abs(domain[0] - domain[1])) {


		// first click, let's start a new tool
		if (!this.state.tool){

			switch (this.state.toolmode){

				case "line" : { tool = new Modcharts.LineTool(); break; }
				case "ray" : { tool = new Modcharts.RayLineTool(); break; }
				case "arrow" : { tool = new Modcharts.ArrowLineTool(); break; }
				case "extended" : { tool = new Modcharts.ExtendedLineTool(); break; }
				case "fibonacci" : { tool = new Modcharts.FibonacciLineTool(); break; }
				case "ellipse" : { tool = new Modcharts.EllipseLineTool(); break; }
				case "fibarc" : { tool = new Modcharts.FibArcTool(); break; }
				case "fibcircle" : { tool = new Modcharts.FibCircleTool(); break; }
				case "horizontal" : { tool = new Modcharts.HorizontalLineTool(); break; }
				case "rect" : { tool = new Modcharts.RectLineTool(); break; }
				case "gannfan" : { tool = new Modcharts.GannFanLineTool(); break; }
				case "text" : { tool = new Modcharts.TextTool(); break; }

			}

			tool.init(activePanel, {});

			activePanel.tools.push(tool);

			this.selectTool(tool);

			tool.onClickCanvas(mouse);

		} else if (this.state.tool.state.inProgressHandle){

			// currently in the middle of clicking handles for an in-progress tool (such as between two clicks)
			this.state.tool.onClickCanvas();
		}

		activePanel.clearTools();
		activePanel.renderTools();
	}

	if (this.onClickCallback){
		this.onClickCallback(mouse);
	}
};

/**
 * return price/date information about click.  return info for both mouse and priceline
 * @method getClickInfo
 */
Modcharts.prototype.getClickInfo = function(mouse) {

	var activePanel = this.getActivePanel(mouse);

	if (this.getPanelIndex(activePanel) === 0){

		var y = mouse[1],
			scaleIdx = Math.round(this.panels[0].xAxis.scale[0].invert(mouse[0])),
			datapointIdx = this.closestDomainIndex(scaleIdx, this.dataPrimary, "dateIndex"),
			date = new Date(this.exchangeDates[scaleIdx]),
			datapointValue = this.dataPrimary[datapointIdx].close,
			x = Math.round(this.panels[0].xAxis.scale[0](scaleIdx)),
			datapointY = this.panels[0].yAxis.scale[0](datapointValue),
			value = this.panels[0].yAxis.scale[0].invert(mouse[1]);

		return {
			mouse: { x: x, y: y, date: date, value: value },
			datapoint: {x: x, y: datapointY, date: date, value: datapointValue}
		};
	}
};

/**
 * mouse right click fired.
 * @method onRightClick
 */
Modcharts.prototype.onRightClick = function(el) {

	var mouse = d3.mouse(el),
		activePanel = this.getActivePanel(mouse);

	if (!activePanel){ return; }

	var valIdx = Math.round(activePanel.xAxis.scale[0].invert(mouse[0])),
		date = new Date(this.exchangeDates[valIdx]),
		value = activePanel.yAxis.scale[0].invert(mouse[1]);

	if (this.onRightClickCallback){

		this.onRightClickCallback(date, value, mouse);

		d3.event.preventDefault();
		d3.event.stopPropagation();
		d3.event.returnValue = false;

		return false;

	}
};

/**
 * mouse down fired.
 * if we were hovering over a panel resize handle, enter resizing state
 * call activepanel's tool's mousedown handlers
 * else call active panel's mousedown handler
 * @method onMousedown
 */
Modcharts.prototype.onMousedown = function(el) {

	//console.log("onMousedown");

	d3.event.preventDefault();
	d3.event.stopPropagation();
	d3.event.returnValue = false;

	if (this.status === 0){
		return;
	}

	var mouse = d3.mouse(el);

	if (this.state.hoverResizePanel){

		// we were hovering over a panel resizer, and moused down.  begin the panel resizing process.
		this.state.resizePanel = this.state.hoverResizePanel;
		this.unregisterZoom();
		this.state.resizePanelY = mouse[1];

	} else {

		// determine if we should begin any tool actions (drag handle or drag tool)

		var activePanel = this.getActivePanel(mouse),
			isMousedownTool = false;

		if (activePanel){

			// loop through all tools' handles to see if it was a mousedown on a handle or tool
			for (var t=0; t < activePanel.tools.length; t++){

				if (activePanel.tools[t].onMousedown(mouse)){

					isMousedownTool = true;

				}
			}
		}
	}

	return false;
};

/**
 * main chart mousemove handler
 * if a tool is in progress, fire its onmousemove handler
 * a tool is "inProgressHandle" when it's in the middle of a two- or three-chord click action and we're not yet done.
 * if no tools are in progress but we are in tool mode and just moused over a handle, fire its move handler
 * if no tools are in progress and we're not in the middle of zooming (pan/zoom), update the crosshair
 * @method onMousemove
 */
Modcharts.prototype.onMousemove = function(el) {

	//console.log("onMousemove");

	if (this.state.zooming || this.dataXHR || this.status === 0){
		this.concealCrosshairs();
		return;
	}

	var mouse = d3.mouse(el),
		activePanel = this.getActivePanel(mouse);

	// throttle mousemove events - chromium continues to fire mousemove during resting state
	// see https://code.google.com/p/chromium/issues/detail?id=170631
	if (this.state.prevMouse && this.state.prevMouse[0] === mouse[0] && this.state.prevMouse[1] === mouse[1]){
		d3.event.preventDefault();
		d3.event.stopPropagation();
		return false;
	}

	// track last mouse position
	this.state.prevMouse = [mouse[0], mouse[1]];

	// reset the cursor and exit when no longer on a panel
	if (!activePanel && !this.state.resizePanel){

		this.concealCrosshairs();
		this.setCursor("default");
		return;
	}

	if (this.state.resizePanel){

		this.handleMousemovePanelResize(mouse);

	} else if (this.state.tool !== null && this.state.tool.state.inProgressHandle){ // in the middle of dragging a tool handle

		this.handleMousemoveActiveToolHandle(mouse);

	} else if (this.state.tool !== null && this.state.dragTool){ // in the middle of dragging a tool

		this.handleMousemoveActiveTool(mouse);

	} else if (this.handleMousemoveToolDefault(mouse)){ // mousing over a tool

		return;

	} else if (this.handleMousemoveIndicatorDefault(mouse)){ // mousing over an indicator

		return;

	} else { // default mousemove handler

		this.handleMousemoveDefault(mouse, activePanel);
	}

	return false;
};

Modcharts.prototype.onDoubleClick = function(el) {

	// console.log("onDoubleClick");

	var withinTool = this.isWithinTool(d3.mouse(el));

	if (withinTool){
		withinTool.configTool();
	}

	return false;
};

/**
 * user is in the middle of resizing a panel
 */
Modcharts.prototype.handleMousemovePanelResize = function(mouse) {

	var deltaPct = (mouse[1] - this.state.resizePanelY) / this.size.height,
		minHeight = 0.05,
		panelUp,
		panelDown;

	for (var p=1; p < this.panels.length; p++){

		panelUp = this.panels[p-1];
		panelDown = this.panels[p];

		if (
			panelDown === this.state.resizePanel &&
			panelUp.size.heightPct + deltaPct > minHeight &&
			panelDown.size.heightPct - deltaPct > minHeight
		){

			panelUp.size.heightPct += deltaPct;
			panelDown.size.heightPct -= deltaPct;

			panelUp.params.size.heightPct = panelUp.size.heightPct;
			panelDown.params.size.heightPct = panelDown.size.heightPct;

			break;
		}
	}

	this.state.resizePanelY = mouse[1];
	this.resize();
	this.render();

};

/**
 * user is mousing over the chart with no other interaction.  also called when in toolmode but haven't started drawing yet.
 */
Modcharts.prototype.handleMousemoveDefault = function(mouse, activePanel) {

	//console.log("handleMousemoveDefault");

	var prevEventHover = this.state.eventHover,
		self = this,
		overResizeHandle = false;

	this.concealCrosshairs();

	this.state.eventHover = null;

	// user is mousing over an event icon
	this.eachPanel(function(panel){
		for (var t = 0; t < panel.events.length; t++){

			var eventWithin = panel.events[t].isWithin(mouse);

			if (eventWithin !== null){

				self.state.eventHover = eventWithin;

			}
		}
	});

	// there was an event hover but now there is none.  fire event mouseout callback.
	if (prevEventHover !== null && self.state.eventHover === null){

		if (self.onMouseoutChartEventCallback){
			self.onMouseoutChartEventCallback(prevEventHover);
		}

	} else if (self.state.eventHover !== null && self.state.eventHover !== prevEventHover){

		if (self.onMouseoverChartEventCallback){
			self.onMouseoverChartEventCallback(self.state.eventHover);
		}
	}

	if (this.params.panelResize){

		// user is mousing over a panel resize handle
		var firstTop = self.panels[0].params.padding.top;

		this.eachPanel(function(panel){

			// don't activate handle on first panel or fixed-height panels
			if (mouse[1] > firstTop + 5 && !self.params.panelHeightLower){

				var top = panel.getPanelTop();

				if (mouse[1] > top - 6 && mouse[1] < top + 5) {

					self.state.hoverResizePanel = panel;
					overResizeHandle = true;
					return false;
				}
			}
		});
	}

	if (overResizeHandle){

		// mousing over resize handle
		this.setCursor("ns-resize");
		this.concealCrosshairs();

	} else if (activePanel && activePanel.isWithin(mouse)){

		var isUpper = activePanel.isUpper();

		// within chart region.  regular mouseover with crosshair active
		this.state.hoverResizePanel = null;

		// set cursor to cross if we are not hovering over an event
		if(!this.state.eventHover){
			this.setCursor("cross");
		}

		// create a snap handle
		if (isUpper && !this.state.snapHandle && this.params.toolSnapOHLC){
			this.state.snapHandle = new Modcharts.SnapHandle(activePanel);
		}

		if (this.state.toolmode !== "text"){

			if (isUpper && this.params.toolSnapOHLC && this.state.toolmode){

				// clear tools canvas
				activePanel.clearTools();

				// re-render
				activePanel.renderTools();

				// snap handle
				this.state.snapHandle.render(mouse);

			} else {

				this.updateCrosshair(mouse, activePanel);
				this.revealCrosshairs();
			}
		}

	} else {

		// not yet within chart region
		this.state.hoverResizePanel = null;

		this.setCursor("default");
		this.concealCrosshairs();

	}

};

/**
 * user is mousing over the toolmode chart.  set cursor and hover state of tools
 */
Modcharts.prototype.handleMousemoveToolDefault = function(mouse) {

	//console.log("handleMousemoveToolDefault");

	var cursor = "cross",
		hoverTool = this.getHoverTool(mouse),
		isRender = false;

	this.concealCrosshairs();

	// call onmouseout on all non-hovered tools
	this.eachPanel(function(panel){

		for (var t=0; t < panel.tools.length; t++){

			if ((!hoverTool || panel.tools[t] !== hoverTool) && panel.tools[t].state.hover){

				$.each(panel.tools[t].handle, function(){
					// remove handle hover state
					this.onMouseout();
				});

				isRender = true;
			}
		}
	});

	// call onmouseover of hovered tool
	this.eachPanel(function(panel){

		for (var t=0; t < panel.tools.length; t++){

			if (hoverTool && panel.tools[t] === hoverTool && !panel.tools[t].state.hover){

				cursor = "pointer";

				$.each(panel.tools[t].handle, function(){
					// set handle hover state
					this.onMouseover();
				});

				isRender = true;
			}
		}
	});

	// re-render tools if hover state changed
	if (isRender){

		this.setCursor(cursor);

		// render tool canvases
		this.eachPanel(function(panel){

			if (panel.tools.length){

				panel.clearTools();
				panel.renderTools();
			}
		});
	}

	return hoverTool;
};

/**
 * handle mouseover of indicators
 */
Modcharts.prototype.handleMousemoveIndicatorDefault = function(mouse) {

	//console.log("handleMousemoveIndicatorDefault");

	var indicatorHover = null,
		cursor = "cross";

	var panel = this.panels[0], isRender = false;

	for (var i=panel.indicators.length - 1; i >= 0; i--){

		if (panel.indicators[i].state && !indicatorHover){

			var oldHover = panel.indicators[i].state.hover;

			panel.indicators[i].state.hover = panel.indicators[i].isWithin(mouse);

			if (oldHover !== panel.indicators[i].state.hover){
				isRender = true;
			}

			if (panel.indicators[i].state.hover){
				cursor = "pointer";
				indicatorHover = panel.indicators[i];
			}
		}
	}

	// re-render indicators if hover state changed
	if (isRender){

		this.setCursor(cursor);

		panel.clearPanel();
		panel.render();
	}

	return indicatorHover;
};

/**
 * are we hovering over any tools or handles?
 */
Modcharts.prototype.getHoverTool = function(mouse) {

	var panel, tool, mousePanel = [];

	for (var x=0, xLen = this.panels.length; x < xLen; x++){

		panel = this.panels[x];
		mousePanel = [mouse[0], mouse[1] - panel.size.top];

		for (var t=0, tLen = panel.tools.length; t < tLen; t++){

			tool = panel.tools[t];

			// is within tool body or handle?
			if (tool.isWithin(mousePanel) || tool.isWithinHandle(mousePanel)){

				return tool;

			}
		}
	}

	return null;

};

/**
 * a tool is currently in the middle of drawing
 */
Modcharts.prototype.handleMousemoveActiveTool = function(mouse) {

	//console.log("handleMousemoveActiveTool");

	this.state.tool.onMousemove(mouse);

	this.eachPanel(function(panel){

		panel.clearTools();
		panel.renderTools();

	});

};

/**
 * a tool handle is being modified
 */
Modcharts.prototype.handleMousemoveActiveToolHandle = function(mouse) {

	//console.log("handleMousemoveActiveToolHandle");

	this.state.tool.onMousemove(mouse);

	this.eachPanel(function(panel){

		panel.clearTools();
		panel.renderTools();

	});

	// snap handle
	if (this.state.snapHandle && this.state.toolmode !== "text" && this.state.toolmode !== "horizontal"){

		this.state.snapHandle.render(mouse);

	}
};

/**
 * onMouseout of chart itself
 * @method onMouseout
 */
Modcharts.prototype.onMouseout = function() {

	//console.log("onMouseout");

	if (this.panels.length) { this.concealCrosshairs(); }

};

/**
 * onMouseover of chart itself
 * @method onMouseover
 */
Modcharts.prototype.onMouseover = function() {

	//console.log("onMouseover");

};

/**
 * onMouseover of a tool object
 * @method onToolMouseover
 */
Modcharts.prototype.onToolMouseover = function(tool) {

	//console.log("onToolMouseover", tool.params.id);

	if (this.onToolMouseoverCallback){

		this.onToolMouseoverCallback(tool);

	}
};

/**
 * onMouseout of a tool object
 * @method onToolMouseout
 */
Modcharts.prototype.onToolMouseout = function(tool) {

	//console.log("onToolMouseout", tool.params.id);

	if (this.onToolMouseoutCallback){

		this.onToolMouseoutCallback(tool);

	}
};

/**
 * callback when a tool is rendered
 * @method onToolRender
 */
Modcharts.prototype.onToolRender = function(tool) {

	//console.log("onToolRender", tool.params.id);

	if (this.onToolRenderCallback){

		this.onToolRenderCallback(tool);

	}
};

/**
 * onMousedown of a tool object (or tool handle)
 * @method onToolMousedown
 */
Modcharts.prototype.onToolMousedown = function(tool) {

	//console.log("onToolMousedown", tool.params.id);

	if (this.onToolMousedownCallback){

		this.onToolMousedownCallback(tool);

	}
};

/**
* onMouseup of a tool object (or tool handle)
* @method onToolMouseup
*/
Modcharts.prototype.onToolMouseup = function (tool) {

	//console.log("onToolMouseup", tool);

	if (this.onToolMouseupCallback) {

		this.onToolMouseupCallback(tool);

	}
};

/**
* onMousemove of a tool object (or tool handle)
* @method onToolMousemove
*/
Modcharts.prototype.onToolMousemove = function (tool) {

	//console.log("onToolMousemove", tool);

	if (this.onToolMousemoveCallback) {

		this.onToolMousemoveCallback(tool);

	}
};

/**
* on select of a tool object (or tool handle)
* @method onToolSelect
*/
Modcharts.prototype.onToolSelect = function (tool) {

	//console.log("onToolSelect", tool);

	if (this.onToolSelectCallback) {

		this.onToolSelectCallback(tool);

	}
};



/**
 * handle backspace/delete to remove tools (needs to be onkeydown instead of onkeyup
 * to prevent the browser's "back button" action)
 * @method onKeyDown
 */
Modcharts.prototype.onKeyDown = function() {

	//console.log("onKeyDown");

	if (!d3.event) {
		return;
	}

	var keyCode = d3.event.keyCode;

	if (keyCode === 8 || keyCode === 46){ // backspace || delete

		var d = d3.event.target || d3.event.srcElement || {},
			tagName = d.tagName ? d.tagName.toLowerCase() : "",
			tagType = d.type ? d.type.toLowerCase() : "",
			allowDefault = (tagName === "textarea" || tagName === "input" && /text|number|password|file|email|search|date/.test(tagType));

		if (!allowDefault){

			d3.event.preventDefault();

			var selectedTool = this.getSelectedTool();

			if (selectedTool){

				selectedTool.remove();
				this.setCursor("cross");

				if (this.onToolRemoveCallback){

					this.onToolRemoveCallback();

				}
			}
		}
	}
};

/**
 * @method onKeyUp
 */
Modcharts.prototype.onKeyUp = function() {

	//console.log("onKeyUp");

};

/**
 * enforce pan limits and call onZoomCallback
 * @method onZoom
 */
Modcharts.prototype.onZoom = function() {

	if (this.status === 0 || this.dataXHR){ return; }

	// render if valid
	if (!this.state.resizePanel){
		this.renderQueue();
	}

	// zoom callback
	if (this.onZoomCallback){
		this.onZoomCallback(this.zoom.scale(), this.zoom.translate());
	}
};

/**
 * fires when zoom action begins
 * @method onZoomStart
 */
Modcharts.prototype.onZoomStart = function() {

	//console.log("onZoomStart");

	// reset zoomreset
	window.clearTimeout(this.zoomResetTimeout);

	if (this.status === 0 || this.state.toolmode || this.dataXHR || !this.params.zoomEnabled || this.state.resizePanel){

		this.unregisterZoom();
		return;
	}

	// unselect any selected tools
	this.selectTool(null);

	this.state.zooming = true;

	// store date of zoom
	this.state.zoomDate = new Date();

	this.concealCrosshairs();
	this.setCursor("closed_hand");

	// store zoom start domain
	this.state.domainAtZoomStart = this.panels[0].xAxis.scale[0].domain();

	// zoom start callback
	if (this.onZoomStartCallback){
		this.onZoomStartCallback(this.zoom.scale(), this.zoom.translate());
	}

};

/**
 * fires when zoom action has finished
 * @method onZoomEnd
 */
Modcharts.prototype.onZoomEnd = function() {

	//console.log("onZoomEnd");

	var domain = this.panels[0].xAxis.scale[0].domain();
	var isBackfill = this.params.backfill;

	// set chart params dateStart/Stop to ensure that any backfills/polls return to the same domain range.
	if (this.exchangeDates){

		var domainFirst = this.exchangeDates[Math.floor(domain[0])],
			domainLast = this.exchangeDates[Math.floor(domain[1])];

		if (domainFirst && domainLast){
			this.params.dateStart = new Date(domainFirst);
			this.params.dateStop = new Date(domainLast);
		}
	}

	this.normalizePanelDomains();

	// check these boundaries to see if we need to do a backfill request, zoom reset, or intraday > interday conversion

	if (this.exchangeDates && this.status !== 0){

		var left = new Date(this.exchangeDates[Math.max(0, Math.floor(domain[0]))]),
			right = new Date(this.exchangeDates[Math.min(this.exchangeDates.length - 1, Math.floor(domain[1]))]),
			domainDiff = right - left,
			msLimit = this.LIMIT_INTRADAY_DAYS * 1000 * 60 * 60 * 24;

		if (!this.params.zoomLimitIntraday && this.state.isIntraday && domainDiff > msLimit && /Hour|Minute/.test(this.params.dataPeriod)) {

			this.params.dataPeriod = "Day";
			this.params.dataInterval = 1;
			this.params.days = this.LIMIT_INTRADAY_DAYS + 1;
			this.params.dateStart = null;
			this.params.dateStop = null;
			this.exchangeDates = [];

			this.unregisterZoom();
			this.panels[0].xAxis.scale[0].domain([0, 0]);
			this.loadData();
			isBackfill = false;

		} else if (this.params.zoomReset){

			this.updateZoom();
			this.registerZoom(this.rootMouse);

			this.enforceZoomReset();
		}

		if (isBackfill){
			this.backfillData();
		}

	}

	this.state.zooming = false;
	this.state.domainAtZoomStart = null;

	// zoom end callback
	if (this.onZoomEndCallback){
		this.onZoomEndCallback(this.zoom.scale(), this.zoom.translate());
	}
};

Modcharts.prototype.enforceZoomReset = function(){

	var lastIndex, self = this;

	if (this.params.zoomResetBoundary === "ruler"){

		// boundary is the edge of the axis ruler
		lastIndex = this.exchangeDates.length - 1;

	} else {

		if (this.state.isIntraday && this.state.typicalSessions){

			// boundary is edge of most recent intraday session
			var typicalClose = new Date(this.dataPrimary[this.dataPrimary.length - 1].date);
			typicalClose.setHours(0);
			typicalClose.setSeconds(0);
			typicalClose.setMilliseconds(0);
			typicalClose.setMinutes(this.state.typicalSessions.max);

			lastIndex = Math.min(this.exchangeDates.length - 1, this.closestExchangeIndex(typicalClose) - 1);

		} else {

			// boundary is edge of data
			lastIndex = this.dataPrimary[this.dataPrimary.length - 1].dateIndex;
		}
	}

	if (lastIndex){

		var panel = this.panels[0],
			currDomain = panel.xAxis.scale[0].domain();

		if (currDomain[1] > lastIndex || currDomain[0] < 0) {

			var domainChange = currDomain[1] > lastIndex ? currDomain[1] - lastIndex : currDomain[0],
				newRightDomain = currDomain[1] - domainChange < lastIndex ? currDomain[1] - domainChange : lastIndex,
				newLeftDomain = currDomain[0] - domainChange > 0 ? currDomain[0] - domainChange : 0,
				//newDomain = [Math.round(newLeftDomain), Math.round(newRightDomain)],
				extendsLeft = Math.round(currDomain[0]) < 0,
				extendsRight = Math.round(currDomain[1]) > lastIndex;

			if (this.state.domainAtZoomStart && this.state.domainAtZoomStart[0] > currDomain[0] && this.state.domainAtZoomStart[1] < currDomain[1]) { // zooming out

				this.unregisterZoom();

				this.state.zoomResetTimeout = window.setTimeout(function () {

					panel.xAxis.scale[0].domain([newLeftDomain, newRightDomain]);
					self.zoom.x(panel.xAxis.getScale([newLeftDomain, newRightDomain])).event(self.rootMouse);

				}, 100);

			} else if (extendsRight && extendsLeft){

				panel.xAxis.scale[0].domain([newLeftDomain, newRightDomain]);
				self.zoom.x(panel.xAxis.getScale([newLeftDomain, newRightDomain])).event(self.rootMouse);
				//this.render();

			} else if (extendsRight || extendsLeft && !this.state.isZoomToBoundary){ // panning

				//this.zoomToBoundary(newDomain, extendsRight);
				panel.xAxis.scale[0].domain([newLeftDomain, newRightDomain]);
				self.zoom.x(panel.xAxis.getScale([newLeftDomain, newRightDomain])).event(self.rootMouse);

			}
		}
	}
};

/**
 * @method zoomToBoundary
 * has problems with 20y interday
 */
Modcharts.prototype.zoomToBoundary = function(newDomain, extendsRight) {

	var panel = this.panels[0];
	var domainIndex = extendsRight ? 1 : 0;
	var endIndex = extendsRight ? this.exchangeDates.length - 1 : 0;
	var startPx = panel.xAxis.scale[0](panel.xAxis.scale[0].domain()[domainIndex]);
	var endPx = panel.xAxis.scale[0](endIndex);
	var self = this;

	this.state.isZoomToBoundary = true;

	this.rootMouse
		.transition()
			.duration(1500)
			.call(
				this.zoom.translate([startPx - endPx,0]).event
			)
			.each("end", function(){

				panel.xAxis.scale[0].domain(newDomain);
				self.unregisterZoom();
				self.updateZoom();
				self.registerZoom();

				self.zoom.x(panel.xAxis.getScale(newDomain)).event(self.rootMouse);

				self.state.isZoomToBoundary = false;

			});
};

/**
 * @method onMouseup
 */
Modcharts.prototype.onMouseup = function() {

	//console.log("onMouseup");

	this.state.resizePanel = null;
	this.state.hoverResizePanel = null;

	if (this.params.zoomEnabled){
		this.setZoomEnabled(true);
	}

	if (this.state.dragTool) {

		this.state.preventClick = true;
		this.state.dragTool.onMouseup();
	}
};

/**
 * reset the main properties of the zoom object (usually needed when scales or data changed)
 * set the zoom center depending how much data is visible
 * attempt to keep right edge of data from ever drifting left on a zoom.
 * attempt to keep left edge of data from ever drifting right on a zoom.
 * prevent zooming in too far
 * @method updateZoom
 */
Modcharts.prototype.updateZoom = function(){

	if (this.panels.length && this.state.toolmode === null){

		var panel = this.panels[0];

		this.zoom.x(panel.xAxis.scale[0]);
		this.zoom.size([panel.size.width,this.size.height]);
		this.zoom.y(panel.yAxis.scale[0]);
		//this.zoom.scaleExtent([0.8,5]);

		this.zoom.center(null);

		/*

		var dataPrimary = this.dataPrimary,
			scale = panel.xAxis.scale[0],
			domain = scale.domain();

		if (dataPrimary){

			var firstIndex = this.closestExchangeIndex(dataPrimary[0].date),
				lastIndex = this.closestExchangeIndex(dataPrimary[dataPrimary.length - 1].date),
				lastX = scale(lastIndex);

			// if we're zoomed in both sides, drive zoom center via mouse position
			if (firstIndex < domain[0] && lastIndex > domain[1]){

				this.zoom.center(null);

			} else {

				// set to right edge
				//this.zoom.center([rightEdge, 0]);
				var newX = Math.min(lastX, rightEdge);
				this.zoom.center([newX, 0]);

			}

		} else {

			// set to right edge
			this.zoom.center([rightEdge, 0]);
			//console.info("setting zoom center to right edge");

		}*/
	}
};

Modcharts.Label = function(args){

	this.index = args.index;
	this.date = args.date;
	this.format = args.format;
	this.stepCompare = args.stepCompare;
	this.pairedFirst = args.pairedFirst;

};

/**
 * performs these actions on a ruler: create labels, align labels, position labels, render labels
 */
Modcharts.Labeler = function(axis, args){

	this.axis = axis;
	this.args = args;
	this.labels = {};
	this.labelCache = {};
	this.rowTemplate = {};

};

Modcharts.Labeler.prototype.format = function(date, labelType, formatType) {

	var core = this.axis.panel.core;

	switch(labelType){

		case "minutes":	{

			// 12:06pm
			return [Number(core.timeFormat("%I")(date)), core.timeFormat("%M")(date)].join(":") + core.timeFormat("%p")(date).toLowerCase();
		}

		case "hours": {

			// 08:00am
			return [Number(core.timeFormat("%I")(date)), ":", core.timeFormat("%M")(date), core.timeFormat("%p")(date).toLowerCase()].join("");
		}

		case "days": {

			if (formatType === "full"){

				// 11/26/14 Wednesday
				return [core.timeFormat("%x")(date), core.timeFormat("%A")(date)].join(" ");

			} else {

				// 26
				return Number(core.timeFormat("%e")(date));

			} break;
		}

		case "weeks": {

			// 12/15
			return core.timeFormat(core.locale[core.params.localeId].shortDate)(date);
		}

		case "months": {

			// November
			return core.timeFormat("%B")(date);
		}

		case "years": {

			// 2007
			return core.timeFormat("%Y")(date);
		}

		default: {

			return null;
		}
	}

};

Modcharts.Labeler.prototype.step = function(dist, labelType) {

	switch(labelType){

		case "minutes":	{

			//console.log("minutes: " + dist);
			return (dist > 50) ? 1 : (dist > 11) ? 5 : (dist > 7) ? 10 : (dist > 4) ? 15 : (dist > 1.7) ? 30 : (dist > 1.1) ? 60 : 0;
		}

		case "hours": {

			//console.log("hours: " + dist);
			return (dist > 60) ? 1 : (dist > 20) ? 2 : (dist > 15) ? 4 : 12;
		}

		case "days": {

			// console.log("days: " + dist);
			return (dist > 30) ? 1 : (dist > 25) ? 2 : (dist > 15) ? 3 : 1;
		}

		case "weeks": {

			//console.log("weeks: " + dist);
			return (dist > 30) ? 1 : (dist > 15) ? 2 : (dist > 5) ? 4 : (dist >= 1) ? 16 : 26;
		}

		case "months": {

			// suppress 1-step months on interday
			var isIntraday =  this.axis.panel.core.state.isIntraday;
			// console.log("months: " + dist);
			return (dist > 65) ? 1 : (dist > 45) ? 2 : (dist > 20) ? 3 : (dist > 9) ? 6 : (isIntraday) ? 1 : 0;
		}

		case "years": {

			// console.log("years: " + dist);
			return (dist > 40) ? 1 : (dist > 16) ? 2 : (dist > 5) ? 5 : 10;
		}

		default: {

			return 0;
		}
	}

};

Modcharts.Labeler.prototype.createLabels = function() {

	var core = this.axis.panel.core,
		exchangeDates = core.exchangeDates,
		years = [], months = [], weeks = [], days = [], hours = [], mins = [],
		isIntraday = (typeof core.state.isIntraday === "boolean") ? core.state.isIntraday : core.params.days <= core.LIMIT_INTRADAY_DAYS,
		denseLabelLimitLeft = new Date().setDate(new Date().getDate() - core.LIMIT_INTRADAY_DAYS - 10),
		denseLabelLimitRight = new Date().setDate(new Date().getDate() + 4),
		lastYear, lastMonth, lastWeek, lastDay, lastHour, lastMin,
		date, dateLabel, year, month, week, day, hour, min;

	for (var i=0; i < exchangeDates.length; i++){

		date = new Date(exchangeDates[i]);
		dateLabel = new Date(date);

		year = date.getFullYear();
		month = date.getMonth();
		week = this.getWeeks(date);
		day = date.getDate();
		hour = date.getHours();
		min = date.getMinutes();

		if (year !== lastYear){

			years.push({
				index: i,
				date: date,
				format: {
					default: this.format(date, "years"),
					first: this.format(date, "years")
				},
				stepCompare: date.getFullYear()
			});

			lastYear = year;

		}

		// first = for this label, what would the label be below it in the next bigger timeframe?
		// note: should match the default format of the next bigger timeframe.

		if (month !== lastMonth){

			months.push({
				index: i,
				date: date,
				format: {
					default: this.format(date, "months"),
					first: this.format(date, "years"),
					firstAlt: [this.format(date, "months"), this.format(date, "years")].join(" ")
				},
				stepCompare: date.getMonth(),
				pairedFirst: "years"
			});

			lastMonth = month;

		}

		if (week !== lastWeek){

			weeks.push({
				index: i,
				date: date,
				format: {
					default: this.format(date, "weeks"),
					first: [this.format(date, "months"), this.format(date, "years")].join(" "),
					firstAlt: [this.format(date, "months"), this.format(date, "years")].join(" ")
				},
				stepCompare: this.getWeeks(date),
				pairedFirst: "months"
			});

			lastWeek = week;

		}

		if (day !== lastDay){

			days.push({
				index: i,
				date: date,
				format: {
					default: this.format(date, "days"),
					intraday: this.format(date, "days", "full"),
					first: [this.format(date, "months"), this.format(date, "years")].join(" "),// + "D"
					firstAlt: [core.timeFormat("%x")(date), core.timeFormat("%A")(date)].join(" ")// + "Alt"
				},
				stepCompare: date.getDate(),
				pairedFirst: "months"
			});

			lastDay = day;

		}

		// if intraday and within dense label limits, add hour and minute
		if (isIntraday && date > denseLabelLimitLeft && date < denseLabelLimitRight){

			if (hour !== lastHour){

				hours.push({
					index: i,
					date: date,
					format: {
						default: this.format(dateLabel, "hours"),
						first: [core.timeFormat("%x")(dateLabel), core.timeFormat("%A")(dateLabel)].join(" ")
					},
					stepCompare: date.getHours(),
					pairedFirst: "days"
				});

				lastHour = hour;
			}

			if (min !== lastMin){

				mins.push({
					index: i,
					date: date,
					format: {
						default: this.format(dateLabel, "minutes"),
						first: [core.timeFormat("%x")(dateLabel), core.timeFormat("%A")(dateLabel)].join(" ")
					},
					stepCompare: date.getMinutes(),
					pairedFirst: "days"
				});

				lastMin = min;
			}
		}
	}

	this.labels = this.measureLabels({
		minutes: mins,
		hours: hours,
		days: days,
		weeks: weeks,
		months: months,
		years: years,
	});

	//console.log("this.labels",this.labels);

};

Modcharts.Labeler.prototype.measureLabels = function(labels) {

	var panel = this.axis.panel,
		ctx = panel.rootContext,
		style = panel.params.style;

	// before measuring labels, set to axis label style
	ctx.font = [style.axisFontWeight, style.axisFontSize + "px", style.axisFontFamily].join(" ");

	$.each(labels, function(){

		$.each(this, function(){

			this.width = {};

			var width = this.width;

			$.each(this.format || {}, function(el, val){

				width[el] = ctx.measureText(val).width;

			});
		});
	});

	return labels;
};

/**
 * return number of non-weekend days between two dates
 * @param {Date} startDate
 * @param {Date} endDate
 * @return {int}
 */
Modcharts.Labeler.prototype.getWeekdays = function(startDate, endDate){

	var weekDay,
		num = 0,
		currentDate = new Date(startDate);

	while (currentDate <= endDate) {

		weekDay = currentDate.getDay();

		if (weekDay !== 0 && weekDay !== 6){
			num++;
		}

		currentDate.setDate(currentDate.getDate() + 1);
	}

	return num;
};

/**
 * return numeric week of year
 * @param {Date} UTC date
 * @return {int}
 */
Modcharts.Labeler.prototype.getWeeks = function(date) {

	var jan = new Date(date.getFullYear(),0,1);
	return Math.ceil((((date - jan) / 86400000) + jan.getDay()+1)/7);
};

/**
 * given current xScale domain, trim labels collection to just the appropriate labels
 * @returns {object}
 */
Modcharts.Labeler.prototype.filterLabels = function(){

	var self = this,
		panel = this.axis.panel,
		core = panel.core,
		ruler = core.exchangeDates,
		domain = this.axis.scale[0].domain(),
		domainLeft = Math.max(0, Math.floor(domain[0])),
		domainRight = Math.min(ruler.length - 1, Math.floor(domain[1])),
		i,
		dist,
		lastX,
		rowLabel,
		labels = {},
		idxLeft, idxRight, step, newLabels,
		loopLabels = {},
		count,amt;

	this.rowTemplate = this.getRowTemplate(domainRight, domainLeft);

	//console.log("this.rowTemplate",JSON.stringify(this.rowTemplate));

	loopLabels[this.rowTemplate.upper] = self.labels[this.rowTemplate.upper];

	if (this.rowTemplate.lower){

		loopLabels[this.rowTemplate.lower] = self.labels[this.rowTemplate.lower];
	}

	// trim all labels down to what's in current range
	$.each(loopLabels, function labelLoop(rowId, rowLabels){

		if (!rowLabels || !rowLabels.length){
			return;
		}

		idxLeft = Math.max(0, panel.core.closestDomainIndex(domainLeft, rowLabels) - 1);
		idxRight = Math.min(rowLabels.length - 1, panel.core.closestDomainIndex(domainRight, rowLabels) + 1);

		labels[rowId] = $.extend(true, [], rowLabels.slice(idxLeft, idxRight + 1));

		// calculate x positions of all rows and max dist
		count=0;
		amt = 0;

		lastX = false;

		// loop backward so we can splice
		for (i = labels[rowId].length - 1; i >= 0; i--) {

			rowLabel = labels[rowId][i];
			rowLabel.x0 = panel.xAxis.scale[0](rowLabel.index);

			// trim if outside of chart boundaries
			if (rowLabel.x0 < panel.size.padding.left || rowLabel.x0 >= panel.size.padding.left + panel.size.width) {

				labels[rowId].splice(i, 1);

			} else if (lastX && i > 0){ // don't include label 0 since its dist is often much shorter and throws off the step calculation

				amt += lastX - rowLabel.x0;
				count++;

			}

			lastX = rowLabel.x0;
		}

		dist = amt/count;

		// trim out row if dist is too small
		if (dist < 0.1){
			labels[rowId] = null;
			return true;
		}

		// now figure out a good step
		step = self.step(dist, rowId);

		// trim vals in each row that don't match the step
		newLabels = labels[rowId].filter(function(row){

			return row.stepCompare % step === 0;

		});

		if (rowId === "hours"){

			newLabels.forEach(function(row){
				row.step = step;
			});
		}

		labels[rowId] = newLabels;

		// other removals

		// trim out years if we have days and months
		if (rowId === "years" && labels.days && labels.days.length && labels.months && labels.months.length) {
			labels.years = null;
			return true;
		}

		// trim out hours if we have days and minutes
		if (rowId === "hours" && labels.minutes && labels.minutes.length) {
			labels.hours = null;
			return true;
		}

		// trim out weeks if we have days
		if (rowId === "weeks" && labels.days && labels.days.length) {
			labels.weeks = null;
			return true;
		}

	});

	if (this.axis.panel.core.state.currency === "USD" && this.axis.panel.core.params.symbolCompare.length === 0){

		// 9:30 fix - if hours and step is 2, replace 10:00am label with one at 9:30am
		if (labels.hours && labels.hours.length && labels.days){

			for (i = 0; i < labels.hours.length; i++) {

				step = labels.hours[i].step;

				// replace all 10:00 labels with their 9:30 equivalents
				if (step === 2 && labels.hours[i].format["default"] === "10:00am"){

					this.updateStartLabel(labels.hours[i]);
				}
			}
		}
	}

	return labels;

};

Modcharts.Labeler.prototype.updateStartLabel = function(label){

	var origDate = new Date(label.date);

	origDate.setHours(9);
	origDate.setMinutes(30);

	var closestIndex = this.axis.panel.core.closestExchangeIndex(origDate),
		x0 = this.axis.panel.xAxis.scale[0](closestIndex);

	if (Math.ceil(x0) >= this.axis.panel.size.padding.left - 1){

		label.index = closestIndex;
		label.date = origDate;
		label.format["default"] = "9:30am";
		label.x0 = x0;

	}

	return label;

};

/**
 * get upper/lower row templates
 */
Modcharts.Labeler.prototype.getRowTemplate = function(rulerRight, rulerLeft){

	var hours,
		days,
		width = this.axis.panel.size.width,
		isThumbnail = width < 150,
		isLarge = width > 900,
		core = this.axis.panel.core,
		isIntraday= core.state.isIntraday;

	if (isIntraday){

		hours = (rulerRight - rulerLeft) / 60;

	} else {

		if (core.params.customData){

			var ruler = core.exchangeDates;

			// the labeler is tuned for trading days so estimate trading days
			// from calendar days (assume 104 weekend days and 9 holidays or 31% of the year)
			days = Math.ceil( ((ruler[rulerRight] - ruler[rulerLeft]) / 1000 / 60 / 60 / 24) * 0.69 );

		} else {

			days = rulerRight - rulerLeft;
		}
	}

	// three different label templates - thumbnail, large, default

	if (isThumbnail){

		if (isIntraday) {

			return {
				upper: "days",
				lower: "months"
			};

		} else if (days < 15) {

			return {
				upper: "days",
				lower: "months"
			};

		} else if (days < 365) {

			return {
				upper: "weeks",
				lower: "years"
			};

		} else if (days < 365 * 10) {

			return {
				upper: "months",
				lower: "years"
			};

		} else {

			return {
				upper: "years",
				lower: null
			};
		}

	} else if (isLarge) {

		// determine number of minutes of exchange ruler data there are

		if (isIntraday && hours < 4){

			return {
				upper: "minutes",
				lower: "days"
			};

		} else if (isIntraday && hours < 50) {

			return {
				upper: "hours",
				lower: "days"
			};

		} else if (isIntraday && hours < 130) {

			return {
				upper: "days",
				lower: "months"
			};

		} else if (isIntraday) {

			return {
				upper: "days",
				lower: "months"
			};

		} else if (days < 30) {

			return {
				upper: "days",
				lower: "months"
			};

		} else if (days < 80) {

			return {
				upper: "weeks",
				lower: "months"
			};

		} else if (days < 365 * 11) {

			return {
				upper: "months",
				lower: "years"
			};

		} else {

			return {
				upper: "years",
				lower: null
			};
		}

	} else { //default size

		if (isIntraday && hours < 4){

			return {
				upper: "minutes",
				lower: "days"
			};

		} else if (isIntraday && hours < 24) {

			return {
				upper: "hours",
				lower: "days"
			};

		} else if (isIntraday && hours < 60) {

			return {
				upper: "days",
				lower: "months"
			};

		}  else if (isIntraday) {

			return {
				upper: "days",
				lower: "months"
			};

		} else if (days < 17) {

			return {
				upper: "days",
				lower: "months"
			};

		} else if (days < 150) {

			return {
				upper: "weeks",
				lower: "months"
			};

		} else if (days < 365 * 11) {

			return {
				upper: "months",
				lower: "years"
			};

		} else {

			return {
				upper: "years",
				lower: null
			};
		}
	}
};

/**
 * render each row (years, months, days, etc) of labels
 */
Modcharts.Labeler.prototype.render = function(labels){

	var panel = this.axis.panel,
		ctx = panel.rootContext,
		style = panel.params.style,
		y0 = panel.size.height + panel.size.padding.top + (style.xaxisPaddingTop || 0),
		paddingLeft = style.xaxisPaddingLeft,
		paddingRight = style.xaxisPaddingRight,
		thisEl = {},
		rowNum = 0,
		newY = 0,
		i = 0,
		left = 0,
		right = 0,
		elFormat = "",
		rightCollide = false,
		limitRight = panel.size.padding.left + panel.size.width + (panel.size.padding.right / 2),
		limitLeft = panel.size.padding.left / 2;

	// init ctx
	ctx.beginPath();
	ctx.fillStyle = style.axisFontColor;
	ctx.font = [style.axisFontWeight, style.axisFontSize + "px", style.axisFontFamily].join(" ");
	ctx.textAlign = style.xaxisTextAlign;
	ctx.textBaseline = "top";

	// modify specific labels based on special case rules
	labels = this.applyRenderLabelRules(labels);

	// draw rows from small to large - minutes first, years last)
	$.each(labels, function(row, el){

		// draw from right to left
		for (i = el.length - 1; i >= 0; i--) {

			thisEl = el[i];
			elFormat = thisEl.format;
			left = thisEl.x0 + paddingLeft - paddingRight;
			right = left + thisEl.width["default"];

			// check for collision with (valid and visible) right-hand neighbor
			rightCollide = (i < el.length - 1) && el[i+1].x0 && right >= el[i+1].x0;

			// draw non-colliding labels
			if (right < limitRight && left > limitLeft && !rightCollide){

				// use lineHeight setting to determine row height
				newY = y0 + (rowNum * style.xaxisLineHeight);

				// draw label
				ctx.fillText(elFormat["default"], left, newY);

			} else {

				// null out element so subsequent el can potentially draw
				el[i].x0 = null;

			}
		}

		if (el.length) {
			rowNum++;
		}
	});
};

/**
 * just before rendering, modify specific labels based on rules
 */
Modcharts.Labeler.prototype.applyRenderLabelRules = function(labels){

	var panel = this.axis.panel,
		self = this,
		style = panel.params.style,
		paddingLeft = style.xaxisPaddingLeft,
		paddingRight = style.xaxisPaddingRight,
		thisEl = {},
		rowNum = 0,
		i = 0,
		left = 0,
		elFormat = "";

	// rule: apply bottom row first label formatting
	$.each(labels, function(row, el){

		if (el.length && el[0].format && row !== "years"){

			labels = self.updatePairedLabelRow(el[0], labels);
			return false;
		}
	});

	// apply special case rules by overwriting the default format and width properties for matching labels
	$.each(labels, function(row, el){

		// work from right to left
		for (i = el.length - 1; i >= 0; i--) {

			thisEl = el[i];
			elFormat = thisEl.format;
			left = thisEl.x0 + paddingLeft - paddingRight;

			// rule: bottom row intraday labels use "intraday" formatting
			if (elFormat.intraday && i > 0 && ((labels.hours && labels.hours.length)||(labels.minutes && labels.minutes.length))){
				elFormat["default"] = elFormat.intraday;
				thisEl.width["default"] = thisEl.width.intraday;
			}

			// rule: add year to january labels when bottom row is "months" (eg use the "firstAlt" formatting)
			if (
				row === "months" &&
				rowNum > 0 &&
				thisEl.date.getMonth() === 0
			){
				elFormat["default"] = elFormat.firstAlt;
				thisEl.width["default"] = thisEl.width.firstAlt;
			}
		}

		if (el.length) {
			rowNum++;
		}
	});

	return labels;

};

/**
 * insert a label into the bottom row that has alternative formatting (usually to ensure the year is always visible)
 * take "first" formatting from the top label's formats and insert a new label into the paired bottom row label collection.
 */
Modcharts.Labeler.prototype.updatePairedLabelRow = function(el, labels){

	// get the paired label collection so we can add the "first"-styled label to it
	var pairedId = el.pairedFirst,
		paired = labels[pairedId];

	if (!paired || !paired.length){ // there were no paired elements, create new

		paired = labels[pairedId] = [$.extend(true, {}, el)];

		paired[0].format["default"] = paired[0].format.first;
		paired[0].width["default"] = paired[0].width.first;

	} else {

		// insert label at beginning of collection if it preceeds the first paired label
		// otherwise we'll directly modify the first paired label instead
		if (paired[0].date - el.date > 0){
			paired.splice(0, 0, $.extend(true, {}, el));
		}

		paired[0].format["default"] = el.format.first;
		paired[0].width["default"] = el.width.first;
		paired[0].x0 = el.x0;

		var style = this.axis.panel.params.style,
			paddingLeft = style.xaxisPaddingLeft,
			paddingRight = style.xaxisPaddingRight,
			left = paired[0].x0 + paddingLeft - paddingRight,
			right = left + paired[0].width["default"];

		// remove neighboring paired label(s) if the new label is now overlapping.
		// we do this here to ensure this label always shows up since the render loop
		// prioritizes right-hand labels.
		for (var x=paired.length - 1; x >= 1; x--){

			if (paired[x].x0 && paired[x].x0 <= right){
				paired.splice(1, 1);
			}
		}
	}

	return labels;
};

Modcharts.prototype.locale["en_GB"] = {
	"decimal": ".",
	"thousands": ",",
	"grouping": [3],
	"currency": ["$", ""],
	"dateTime": "%a %b %e %X %Y", // %c
	"time": "%H:%M:%S", // %X
	"periods": ["AM", "PM"], // %p
	"date": "%-d/%-m/%Y", // %x
	"shortDate": "%-d/%-m",
	"days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], // %A
	"shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], // %a
	"months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], // %B
	"shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] // %b
};

Modcharts.prototype.locale["en_US"] = {
	"decimal": ".",
	"thousands": ",",
	"grouping": [3],
	"currency": ["$", ""],
	"dateTime": "%a %b %e %X %Y", // %c
	"time": "%H:%M:%S", // %X
	"periods": ["AM", "PM"], // %p
	"date": "%-m/%-d/%Y", // %x
	"shortDate": "%-m/%-d",
	"days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], // %A
	"shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], // %a
	"months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], // %B
	"shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] // %b
};

Modcharts.prototype.locale["fr_CA"] = {
	"decimal": ".",
	"thousands": ",",
	"grouping": [3],
	"currency": ["$", ""],
	"dateTime": "%a %b %e %X %Y", // %c
	"time": "%H:%M:%S", // %X
	"periods": ["AM", "PM"], // %p
	"date": "%-m/%-d/%Y", // %x
	"shortDate": "%-m/%-d",
	"days": ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"], // %A
	"shortDays": ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"], // %a
	"months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"], // %B
	"shortMonths": ["janv", "fév", "mars", "avr", "mai", "juin", "juill", "août", "sept", "oct", "nov", "déc"] // %b
};

/**
 * Marker objects can directly alter the DOM using primitive shapes and lines
 * and are intended to be managed via Indicator objects
 * @class Marker
 * @constructor
 */
Modcharts.Marker = function(params) {

	this.params = this.getParams(params);

};

/**
 * A wrapper for getDefaultParams
 * @return {object}
 */
Modcharts.Marker.prototype.getParams = function(params) {

	var markerParams = this.getDefaultParams();

	// then merge with any custom params that were passed
	$.extend(true, markerParams, params || {});

	return markerParams;
};

/**
 * return the default params for this type of Marker
 * @return {object}
 */
Modcharts.Marker.prototype.getDefaultParams = function() {
	throw new Error("Required Marker method not found");
};


/**
 * canvas rectangle utility function
 * @param {CanvasRenderingContext2D} ctx
 * @param {int} x
 * @param {int} y
 * @param {int} w
 * @param {int} height
 */
Modcharts.Marker.prototype.rect = function(ctx, x, y, w, h){
	ctx.rect(this.px(x), this.px(y), Math.round(w), Math.round(h));
};

Modcharts.Marker.prototype.lineTo = function(ctx, x, y){
	ctx.lineTo(this.px(x), this.px(y));
};

Modcharts.Marker.prototype.moveTo = function(ctx, x, y){
	ctx.moveTo(this.px(x), this.px(y));
};

/**
 * canvas subpixel offset
 * @param {double} val
 * @return {double}
 */
Modcharts.Marker.prototype.px = function(val){
	return Math.round(val) + 0.5;
};

/**
 * update dom elements using primitive shapes and lines
 */
Modcharts.Marker.prototype.render = function() {
	throw new Error("Required Marker method not found");
};

/**
 * calculate dynamic bar width based on data period and panel domain
 * (method used by more than one marker subclass so it lives here)
 * @param {Panel} panel
 * @return {int}
 */
Modcharts.Marker.prototype.getBarWidth = function(panel) {

	var domain = panel.xAxis.scale[0].domain(),
		width = panel.size.width,
		len = domain[1] - domain[0],
		w0;

	switch(panel.core.params.dataPeriod){

		case "Year": len /= 365; break;
		case "Month": len /= 15; break;
		case "Week": len /= 3; break;
		case "Day": break;
		case "Hour": len /= 30; break;
		case "Minute": len /= panel.core.params.dataInterval; break;
	}

	w0 = Math.min(15, Math.max(0, Math.floor((width / len) / 2) / 2));

	return w0;
};

/**
 * Band marker
 * @constructor
 * @class BandMarker
 * @extends Marker
 */
Modcharts.BandMarker = function(args){

	this.superclass.call(this, args);

};

Modcharts.Extend(Modcharts.BandMarker, Modcharts.Marker);

Modcharts.BandMarker.prototype.getDefaultParams = function() {

	return {
		style: {
			fillColor: "rgba(150,150,150,0.3)",
			lineColor: "rgba(200,200,200,0.5)",
			labelColor: "#CCC",
			labelFontFamily: "Arial",
			labelFontSize: 11,
		},
		labelText: "Band",
		valHigh: 100,
		valLow: 0
	};

};

Modcharts.BandMarker.prototype.render = function(panel, yScale){

	var ctx = panel.rootContext,
		panelLeft = panel.size.padding.left,
		panelWidth = panel.size.width,
		panelHeight = panel.size.height,
		yHigh = yScale(this.params.valHigh),
		yLow = yScale(this.params.valLow),
		yMin = Math.floor(Math.max(0, Math.min(yHigh, yLow))),
		yMax = Math.ceil(Math.min(panelHeight, Math.max(yHigh, yLow)));

	ctx.fillStyle = this.params.style.fillColor;
	ctx.strokeStyle = this.params.style.lineColor;
	ctx.beginPath();

	// fill rect
	this.rect(ctx, panelLeft, yMin, panelWidth, yMax - yMin);
	ctx.fill();

	ctx.beginPath();

	// upper and lower borders
	this.moveTo(ctx, panelLeft, yMin);
	this.lineTo(ctx, panelLeft + panelWidth, yMin);

	this.moveTo(ctx, panelLeft, yMax);
	this.lineTo(ctx, panelLeft + panelWidth, yMax);
	ctx.stroke();

	if (yMax - yMin > 18){
		// label text
		ctx.textBaseline = "middle";
		ctx.font = [this.params.style.labelFontSize + "px", this.params.style.labelFontFamily].join(" ");
		ctx.fillStyle = this.params.style.labelColor;
		ctx.fillText(this.params.labelText, 5, yMin + ((yMax-yMin) / 2));
	}

};

/**
 * Bar marker
 * @constructor
 * @class BarMarker
 * @extends Marker
 */
Modcharts.BarMarker = function(){

	this.superclass.call(this);

};

Modcharts.Extend(Modcharts.BarMarker, Modcharts.Marker);

Modcharts.BarMarker.prototype.getDefaultParams = function() {

	return {
		fillColor : "#000"
	};

};

Modcharts.BarMarker.prototype.render = function(panel, ctx, data, xScale, yScale, fillColor){

	var w0 = this.getBarWidth(panel),
		x, xLen, x0, y0, h0, val,
		yZero = yScale(0.0),
		xLast = Math.round(xScale(data[data.length - 1])),
		yLast = Math.round(yScale(data[data.length - 1]));

	ctx.lineWidth = 0;
	ctx.fillStyle = fillColor || this.params.fillColor;
	ctx.strokeStyle = ctx.fillStyle;

	// temp fix for finding 0.0 on log scales
	if (isNaN(yZero)){
		yZero = yScale(yScale.domain()[1]);
	}

	ctx.beginPath();

	for (x=0, xLen = data.length; x < xLen; x++){

		val = data[x][1];
		if (val === 0) { continue; }

		x0 = xScale(data[x][0]);
		y0 = Math.floor(yScale(val));

		h0 = yZero - y0 - 1;
		y0 = this.px(y0);

		// remove undrawable bars for speed
		if (x0 !== xLast || (y0 < yLast)) {

			if (w0 > 0){

				this.rect(ctx, x0 - w0, y0, w0 * 2, h0);

			} else {

				// not wide enough for a rect - use single line instead
				panel.moveTo(ctx, x0, y0);
				panel.lineTo(ctx, x0, y0 + h0);
			}

		}

		xLast = x0;
		yLast = y0;
	}

	if (w0 > 0){
		ctx.fill();
		ctx.stroke();
	} else {
		ctx.stroke();
	}

};


/**
 * Candlestick marker
 * @constructor
 * @class CandlestickMarker
 * @extends Marker
 */
Modcharts.CandlestickMarker = function(params){

	this.superclass.call(this, params);

};

Modcharts.Extend(Modcharts.CandlestickMarker, Modcharts.Marker);

Modcharts.CandlestickMarker.prototype.getDefaultParams = function() {

	return {
		fillType: "hollow", // "hollow", "filled"
		lineColor : "#666",
		fillColorNeg : "#000",
		fillColorPos : "#fff"
	};

};

/**
 * calculate dynamic bar width based on data period and panel domain
 * (method used by more than one marker subclass so it lives here)
 * @param {Panel} panel
 * @return {int}
 */
Modcharts.CandlestickMarker.prototype.getBarWidth = function(panel) {

	var domain = panel.xAxis.scale[0].domain(),
		width = panel.size.width,
		len = domain[1] - domain[0],
		w0;

	switch(panel.core.params.dataPeriod){

		case "Year": len /= 365; break;
		case "Month": len /= 15; break;
		case "Week": len /= 3; break;
		case "Day": break;

		case "Hour": len /= 30; break;
		case "Minute": len /= panel.core.params.dataInterval; break;
	}

	w0 = Math.max(0, Math.floor(Math.min(30, 0.6 * width / len)));

	return w0;
};

Modcharts.CandlestickMarker.prototype.render = function(panel, ctx, data, xScale, yScale, lineColor, fillColorPos, fillColorNeg ){

	var w0 = this.getBarWidth(panel),
		w1 = w0 / 2,
		d = new Array(data.length), // date
		o = new Array(data.length), // open
		h = new Array(data.length), // high
		l = new Array(data.length), // low
		c = new Array(data.length), // close
		x = 0,
		dataRow = [],
		isFilled = this.params.fillType === "filled";

	// pos wicks
	ctx.strokeStyle = fillColorPos;
	ctx.lineWidth = 1;
	ctx.beginPath();

	for (x=0; x < data.length; x++){

		dataRow = data[x];

		// cache xScale/yScale lookups
		// Math.round to ensure array of ints instead of doubles
		d[x] = Math.round(xScale(dataRow[0]));
		o[x] = Math.round(yScale(dataRow[2]));
		h[x] = Math.round(yScale(dataRow[3]));
		l[x] = Math.round(yScale(dataRow[4]));
		c[x] = Math.round(yScale(dataRow[1]));

		// get diff (for determining color)
		if (x > 0){
			dataRow[5] = dataRow[1] - data[x-1][1];
		} else {
			dataRow[5] = 0;
		}

		// get candle hollow bool
		dataRow[6] = dataRow[1] > dataRow[2] ? 1 : 0;

		if (dataRow[5] > 0){

			if (w0 > 1){

				panel.moveTo(ctx, d[x], h[x]);
				panel.lineTo(ctx, d[x], Math.min(o[x], c[x]));
				panel.moveTo(ctx, d[x], Math.max(o[x], c[x]));
				panel.lineTo(ctx, d[x], l[x]);

			} else {

				panel.moveTo(ctx, d[x], h[x]);
				panel.lineTo(ctx, d[x], l[x]);
			}
		}
	}
	ctx.closePath();
	ctx.stroke();

	// neg wicks
	ctx.strokeStyle = fillColorNeg;
	ctx.beginPath();

	for (x=0; x < data.length; x++){

		dataRow = data[x];

		if (dataRow[5] < 0){

			if (w0 > 1){

				panel.moveTo(ctx, d[x], h[x]);
				panel.lineTo(ctx, d[x], Math.min(o[x], c[x]));
				panel.moveTo(ctx, d[x], Math.max(o[x], c[x]));
				panel.lineTo(ctx, d[x], l[x]);

			} else {

				panel.moveTo(ctx, d[x], h[x]);
				panel.lineTo(ctx, d[x], l[x]);
			}
		}

	}
	ctx.closePath();
	ctx.stroke();

	// unchanged wicks
	ctx.strokeStyle = "#999999";
	ctx.beginPath();

	for (x=0; x < data.length; x++){

		dataRow = data[x];

		if (dataRow[5] === 0){

			if (w0 > 1){

				panel.moveTo(ctx, d[x], h[x]);
				panel.lineTo(ctx, d[x], Math.min(o[x], c[x]));
				panel.moveTo(ctx, d[x], Math.max(o[x], c[x]));
				panel.lineTo(ctx, d[x], l[x]);

			} else {

				panel.moveTo(ctx, d[x], h[x]);
				panel.lineTo(ctx, d[x], l[x]);
			}
		}

	}
	ctx.closePath();
	ctx.stroke();

	if (w0 > 1){

		//unchanged fill
		ctx.fillStyle = "#999999";
		ctx.strokeStyle = "#999999";

		for (x=0; x < data.length; x++){

			dataRow = data[x];

			if (dataRow[5] === 0){
				if (dataRow[6] === 0 || isFilled){
					panel.fillRect(ctx, d[x] - w1, o[x], w0, c[x] - o[x]);
				} else if (dataRow[6] === 1){
					panel.strokeRect(ctx, d[x] - w1, o[x], w0, c[x] - o[x]);
				}
			}
		}

		// pos filled/hollow
		ctx.fillStyle = fillColorPos;
		ctx.strokeStyle = fillColorPos;

		for (x=0; x < data.length; x++){

			dataRow = data[x];

			if (dataRow[5] > 0){
				if (dataRow[6] === 0 || isFilled){
					panel.fillRect(ctx, d[x] - w1, o[x], w0, c[x] - o[x]);
				} else if (dataRow[5] > 0 && dataRow[6] === 1){
					panel.strokeRect(ctx, d[x] - w1, o[x], w0, c[x] - o[x]);
				}
			}
		}

		// draw neg filled/hollow
		ctx.strokeStyle = fillColorNeg;
		ctx.fillStyle = fillColorNeg;

		for (x=0; x < data.length; x++){

			dataRow = data[x];

			if (dataRow[5] < 0){
				if (!dataRow[6] || isFilled){
					panel.fillRect(ctx, d[x] - w1, o[x], w0, c[x] - o[x]);
				} else {
					panel.strokeRect(ctx, d[x] - w1, o[x], w0, c[x] - o[x]);
				}
			}
		}
	}

	/*
	// debug label
	for (x=0; x < data.length; x++){

		dataRow = data[x];

		ctx.fillText(dataRow[5] + "," + dataRow[6], d[x], l[x]);
	}
	*/
};

Modcharts.CandlestickMarker.prototype.renderOHLC = function(panel, ctx, data, xScale, yScale, lineColor, markerType){

	var w0 = this.getBarWidth(panel) * 0.7,
		d = [],
		x,
		xLen = data.length;

	// 0 = date
	// 1 = close
	// 2 = open
	// 3 = high
	// 4 = low

	ctx.lineWidth = 1;
	ctx.strokeStyle = lineColor || this.params.lineColor;
	ctx.beginPath();

	for (x=0; x < xLen; x++){

		d[x] = xScale(data[x][0]);

		// vert
		panel.moveTo(ctx, d[x], yScale(data[x][3]));
		panel.lineTo(ctx, d[x], yScale(data[x][4]));

		if (markerType === "ohlc"){

			// open
			panel.moveTo(ctx, d[x] - w0, yScale(data[x][2]));
			panel.lineTo(ctx, d[x], yScale(data[x][2]));
		}

		// close
		panel.moveTo(ctx, d[x], yScale(data[x][1]));
		panel.lineTo(ctx, d[x] + w0, yScale(data[x][1]));

	}

	ctx.stroke();

};

/**
 * Line marker
 * @constructor
 * @class LineMarker
 * @extends Marker
 */
Modcharts.LineMarker = function(){

	this.superclass.call(this);

};

Modcharts.Extend(Modcharts.LineMarker, Modcharts.Marker);

Modcharts.LineMarker.prototype.getDefaultParams = function() {

	return {
		lineWidth : 1,
		lineColor : "#000",
		fillColor : "none",
		fillBetweenColor : "#aaa"
	};

};

Modcharts.LineMarker.prototype.render = function(ctx, data, xScale, yScale, color, lineWidth, isStepped, penPxOn, penPxOff) {

	if (!data.length || !data[0].length) { /* console.error("No data passed to LineMarker render"); */ return; }

	if (ctx.setLineDash && (penPxOn || penPxOff)){
		ctx.setLineDash([penPxOn, penPxOff]);
	}

	ctx.lineJoin = "round";

	// lineWidth defaults
	if (lineWidth === null){ lineWidth = this.params.lineWidth; }

	// don't render if lineWidth is 0
	if (lineWidth === 0) { return; }

	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = color || this.params.lineColor;

	ctx.beginPath();

	ctx.moveTo(this.px(xScale(data[0][0])), this.px(yScale(data[0][1])));

	this.getLine(ctx, data, xScale, yScale, false, isStepped);

	ctx.stroke();

	// reset dashed line
	if (ctx.setLineDash){
		ctx.setLineDash([]);
	}

};

Modcharts.LineMarker.prototype.getCoords = function(ctx, data, xScale, yScale) {

	if (!data.length || !data[0].length) { /* console.error("No data passed to LineMarker getCoords"); */ return; }

	var coords = [];

	coords.push([this.px(xScale(data[0][0])), this.px(yScale(data[0][1]))]);

	$.extend(coords, this.getLine(ctx, data, xScale, yScale, true, true));

	return coords;

};

Modcharts.LineMarker.prototype.renderFill = function(ctx, data, height, xScale, yScale, fillStyle, fillToValue) {

	if (!data.length || data.length < 2 || !data[0].length) { /* console.error("No data passed to LineMarker renderFill"); */ return; }

	ctx.lineJoin = "round";
	ctx.fillStyle = fillStyle || this.params.fillColor;
	ctx.beginPath();

	var firstIndex = this.getLine(ctx, data, xScale, yScale),
		y0;

	if (typeof fillToValue === "number"){

		y0 = this.px(Math.min(yScale(fillToValue), height));

	} else {

		y0 = this.px(height);

	}

	if (data.length > 0){
		ctx.lineTo(this.px(xScale(data[data.length - 1][0])), y0);
	}

	if (typeof firstIndex === "number" && typeof data[firstIndex] !== "undefined"){
		ctx.lineTo(this.px(xScale(data[firstIndex][0])), y0);
	}

	ctx.fill();

};

Modcharts.LineMarker.prototype.renderFillBetween = function(ctx, dataUp, dataDown, xScale, yScale, fillStyle) {

	if (!dataUp.length || !dataUp[0].length) { /* console.error("No data passed to LineMarker renderFillBetween"); */ return; }

	ctx.lineJoin = "round";
	ctx.fillStyle = fillStyle || this.params.fillBetweenColor;
	ctx.beginPath();

	ctx.moveTo(this.px(xScale(dataUp[0][0])), this.px(yScale(dataUp[0][1])));

	this.getLine(ctx, dataUp, xScale, yScale);

	ctx.lineTo(this.px(xScale(dataDown[dataDown.length - 1][0])), this.px(yScale(dataUp[dataUp.length - 1][1])));
	ctx.lineTo(this.px(xScale(dataDown[dataDown.length - 1][0])), this.px(yScale(dataDown[dataDown.length - 1][1])));

	this.getLine(ctx, Array.prototype.slice.call(dataDown).reverse(), xScale, yScale);

	ctx.lineTo(this.px(xScale(dataDown[0][0])), this.px(yScale(dataDown[0][1])));

	ctx.fill();
};

Modcharts.LineMarker.prototype.getLine = function(ctx, data, xScale, yScale, getData, isStepped) {

	var x0 = 0, y0 = 0, x = 0, xLen = data.length, xLast = 0, yLast = 0, firstIndex, coords = [];

	for (x=0; x < xLen; x++){

		x0 = this.px(xScale(data[x][0]));
		y0 = this.px(yScale(data[x][1]));

		if (!isNaN(y0) && !isNaN(x0)){

			if (typeof firstIndex !== "number"){
				firstIndex = x;
			}

			if (x0 !== xLast || y0 !== yLast) {

				if (yLast && isStepped){

					coords.push([x0, yLast]);
				}

				coords.push([x0, y0]);
			}

			xLast = x0;
			yLast = y0;
		}
	}

	// draw coords collection
	for (x=0, xLen = coords.length; x < xLen; x++){

		ctx.lineTo(coords[x][0], coords[x][1]);

	}

	if (getData) {
		return coords;
	} else {
		return firstIndex;
	}

};

/**
 * Point marker
 * @constructor
 * @class PointMarker
 * @extends Marker
 */
Modcharts.PointMarker = function(){

	this.superclass.call(this);

};

Modcharts.Extend(Modcharts.PointMarker, Modcharts.Marker);

Modcharts.PointMarker.prototype.getDefaultParams = function() {

	return {
		fillColor : "#CCC"
	};

};

Modcharts.PointMarker.prototype.render = function(ctx, data, xScale, yScale, fillColor, radius, lineColor){

	ctx.lineWidth = 1;
	ctx.fillStyle = fillColor || this.params.fillColor;

	if (lineColor && lineColor.length){
		ctx.lineWidth = 0.5;
		ctx.strokeStyle = lineColor;
	}

	var x0, y0, x, xLen;

	for (x=0, xLen = data.length; x < xLen; x++){

		ctx.beginPath();

		x0 = xScale(data[x][0]);
		y0 = yScale(data[x][1]);

		ctx.arc(x0, y0, radius || 2, 0, Math.PI*2);

		ctx.fill();

		if (lineColor && lineColor.length){
			ctx.stroke();
		}
	}
};

/**
 * Panels are related groups of axes, indicators and markers on a shared pane.
 * Multiple panels can be stacked vertically and are managed by the parent chart.
 * @constructor
 * @class Panel
 */
Modcharts.Panel = function(){};

/**
 * initialize the fundamental collections of params, scales and indicators for a single panel
 * initialize the canvas dom element
 */
Modcharts.Panel.prototype.init = function(core, params){

	var self = this;

	this.core = core;

	// first populate params.style using rules derived from CSS
	this.params = this.getDefaultParams();

	// then merge with any custom params that were passed to init
	$.extend(true, this.params, params || {});

	// unique id
	this.uid = this.core.getUID();

	// deprecated id, here for backward compatibility
	this.id = this.uid;

	// use this.size collection internally instead of modifying the original params
	this.size = {
		heightPct: this.params.size.heightPct,
		padding: $.extend(true, {}, this.params.padding),
		margin: $.extend(true, {}, this.params.margin),
		width: +this.core.size.width - this.params.padding.left - this.params.padding.right
	};

	// use fixed or dynamic height
	this.size.height = this.getPanelHeight();

	// set up important collections
	this.yAxis = new Modcharts.AxisNumber(this);
	this.xAxis = new Modcharts.AxisDate(this);

	this.indicators = [];
	this.events = [];
	this.tools = [];
	this.flags = {};

	// set up important dom nodes

	// container for all panel nodes
	this.rootPanel = this.core.rootModchart.insert("div", "div.modcharts-rootmouse")
		.attr("class", "modcharts-panel");

	// container for panel legend
	this.rootLegend = this.rootPanel.append("div")
		.attr("class", "modcharts-legend" + ((this.core.getPanelIndex(this) === 0) ? " first": ""))
		.attr("uid", this.uid)
		.on("mouseup", function(){
			self.core.onMouseup(this);
		});

	// main panel drawing canvas
	this.rootCanvas = this.rootPanel.append("canvas")
		.attr("width",  this.size.width)
		.attr("height", this.size.height)
		.style("position", "absolute")
		.attr("class", "modcharts-panel-root");

	// tool canvas
	this.rootTools = this.rootPanel.append("canvas")
		.attr("width",  this.size.width)
		.attr("height", this.size.height)
		.style("position", "absolute")
		.attr("class", "modcharts-panel-tools");

	// crosshair/overlay root svg
	this.rootOverlay = this.rootPanel.append("svg")
		.attr("width",  this.core.size.width)
		.attr("height", this.size.height)
		.style("position", "absolute")
		.attr("class", "modcharts-rootoverlay")
		.append("g");

	// error message
	this.rootError = this.rootPanel.append("div")
		.style({
			"position": "absolute",
			"display": "none"
		})
		.attr("class", "modcharts-panel-error");

	// save reference to frequently-used contexts
	this.rootContext = this.getContext(this.rootCanvas.node());
	this.rootToolContext = this.getToolContext(this.rootTools.node());

	return this;
};

Modcharts.Panel.prototype.getContext = function(rootCanvasNode) {
	var context = rootCanvasNode.getContext("2d");

	if(!context.setLineDash) {
		context.setLineDash = function() {};
	}

	return context;
};

Modcharts.Panel.prototype.getToolContext = function(rootToolsNode) {
	var context = rootToolsNode.getContext("2d");

	if(!context.setLineDash) {
		context.setLineDash = function() {};
	}

	return context;
};

/**
 *
 */
Modcharts.Panel.prototype.getDefaultParams = function(){

	return {
		style: {
			gridColor: this.core.getStyle(".modcharts-grid", "color") || "#ccc",
			gridColorAlt: this.core.getStyle(".modcharts-grid-alt", "color"),
			gridColorHoriz: this.core.getStyle(".modcharts-grid-horiz", "color"),
			gridColorBorder: this.core.getStyle(".modcharts-grid-border", "color"),
			gridColorBorderLeft: this.core.getStyle(".modcharts-grid-border-left", "color"),
			gridColorBorderRight: this.core.getStyle(".modcharts-grid-border-right", "color"),
			gridColorBorderTop: this.core.getStyle(".modcharts-grid-border-top", "color"),
			gridColorBorderBottom: this.core.getStyle(".modcharts-grid-border-bottom", "color"),
			gridColorTicks: this.core.getStyle(".modcharts-grid-ticks", "color"),
			gridColorTicksHoriz: this.core.getStyle(".modcharts-grid-ticks-horiz", "color"),
			gridColorTicksAlt: this.core.getStyle(".modcharts-grid-ticks-alt", "color"),
			gridColorVertNormalize: this.core.getStyle(".modcharts-grid-vert-normalize", "color") || "none",
			gridColorHorizNormalize: this.core.getStyle(".modcharts-grid-horiz-normalize", "color") || "none",
			gridSizeHoriz: this.core.getStyle(".modcharts-grid-horiz", "width"),
			gridSizeVert: this.core.getStyle(".modcharts-grid-vert", "width"),
			gridVertPenPxOn: this.core.getStyle(".modcharts-grid-vert-penpxon", "width"),
			gridVertPenPxOff: this.core.getStyle(".modcharts-grid-vert-penpxoff", "width"),
			gridHorizPenPxOn: this.core.getStyle(".modcharts-grid-horiz-penpxon", "width"),
			gridHorizPenPxOff: this.core.getStyle(".modcharts-grid-horiz-penpxoff", "width"),
			gridVertAltPenPxOn: this.core.getStyle(".modcharts-grid-vert-alt-penpxon", "width"),
			gridVertAltPenPxOff: this.core.getStyle(".modcharts-grid-vert-alt-penpxoff", "width"),
			gridBgColor: this.core.getStyle(".modcharts-grid", "background-color"),
			labelClosureColor: this.core.getStyle(".modcharts-label-closure", "color"),
			crosshairCircleRadius: this.core.getStyle(".modcharts-crosshair-circle", "width"),
			axisFontColor: this.core.getStyle(".modcharts-axis", "color"),
			axisFontSize: this.core.getStyle(".modcharts-axis", "font-size"),
			axisFontFamily: this.core.getStyle(".modcharts-axis", "font-family"),
			axisFontWeight: this.core.getStyle(".modcharts-axis", "font-weight") || "normal",
			xaxisBgColor: this.core.getStyle(".modcharts-xaxis", "background-color") || "none",
			xaxisTextAlign: this.core.getStyle(".modcharts-xaxis", "text-align") || "left",
			xaxisTickHeight: this.core.getStyle(".modcharts-xaxis-tick", "height") || 5,
			xaxisTickHeightAlt: this.core.getStyle(".modcharts-xaxis-tick-alt", "height") || 10,
			xaxisPaddingLeft: this.core.getStyle(".modcharts-xaxis", "padding-left") || 0,
			xaxisPaddingRight: this.core.getStyle(".modcharts-xaxis", "padding-right") || 0,
			xaxisPaddingTop: this.core.getStyle(".modcharts-xaxis", "padding-top"),
			xaxisLineHeight: this.core.getStyle(".modcharts-xaxis", "line-height") || 12,
			yaxisBgColor: this.core.getStyle(".modcharts-yaxis", "background-color") || "none",
			yaxisPaddingTop: this.core.getStyle(".modcharts-yaxis", "padding-top") || 0,
			yaxisPaddingBottom: this.core.getStyle(".modcharts-yaxis", "padding-bottom") || 0,
			yLabelFormat: this.getDefaultYLabelFormat()
		},
		hasXAxis: null,
		yAxisFormat: "default",
		yAxisRange: null, // custom axis range. ex: [-100, 100]
		size: {
			heightPct: null
		},
		padding: {
			top: 0,
			right: this.core.getStyle(".modcharts-panel", "padding-right") || 50,
			bottom: this.core.getStyle(".modcharts-panel", "padding-bottom") || 35,
			left: 0
		},
		margin: {
			bottom: this.core.getStyle(".modcharts-panel", "margin-bottom") || 0
		}
	};
};

/**
 * separate buckets for label formatting, based on current yaxis range.
 * for each button there can be a label format for regular and normalized values.
 * see https://github.com/mbostock/d3/wiki/Formatting for more information about format strings
 */
Modcharts.Panel.prototype.getDefaultYLabelFormat = function(){

	return {
		"default": {
			"format": "0,.2f",
			"formatPercent": "0,.2%"
		},
		"large": {
			"format": "0,.1s",
			"formatPercent": "0,.1%"
		},
		"small": {
			"format": "0.3f",
			"formatPercent": "0.2%"
		},
		"micro": {
			"format": "0.4f",
			"formatPercent": "0.2%"
		}
	};
};

/**
 * remove root panel canvas
 */
Modcharts.Panel.prototype.remove = function(){

	$(this.rootPanel.node()).empty().remove();

};

/**
 * add a new Indicator object to the indicators collection
 * @param {string} id
 * @param {object} params
 * @returns {Indicator}
 */
Modcharts.Panel.prototype.addIndicator = function(id, params, callback){

	if (!params){
		params = {id: id};
	}

	if (id && !params.id){
		params.id = id;
	}

	var newIndicator = this.addIndicators([params]);

	if (callback) {

		callback(this, newIndicator);

	} else {

		return (newIndicator.length > 0) ? newIndicator[0] : null;

	}

};

/**
 * add multiple Indicator objects to the indicators collection
 * @param {array} indicators - an array of indicator params (panel reference added automatically)
 * @returns [{Indicator}]
 */
Modcharts.Panel.prototype.addIndicators = function(indicators, callback){

	var self = this,
		indicator,
		indicatorClass,
		newIndicators = [];

	$.each(indicators, function(idx){

		// temporary: support old bollinger id
		if (indicators[idx].id === "bollingerbands") {
			indicators[idx].id = "bollinger";
		}

		if (indicators[idx].id === "updownnyse") {
			console.warn("Please update your indicator to use 'updownratio' instead of 'updownnyse'");
			indicators[idx].id = "updownratio";
		}

		indicatorClass = Modcharts.Indicator.getIndicatorClassName(indicators[idx].id);

		if (indicatorClass){

			indicator = new Modcharts[indicatorClass]({
				panel: self,
				params: indicators[idx]
			});

			self.indicators.push(indicator);
		}

		newIndicators.push(indicator);

	});

	if (callback) {

		return callback(this, newIndicators);

	} else {

		return newIndicators;
	}

};

/**
 * return true if mouse coordinates are within chart region (not including padding)
 */
Modcharts.Panel.prototype.isWithin = function(mouse){

	var size = this.size,
		x = mouse[0],
		y = mouse[1],
		top = this.size.top,
		padding = size.padding;

	return x > padding.left && x < padding.left + size.width && y > top + padding.top && y < top + padding.top + size.height;
};

/**
 * add a new Event object to the events collection
 * @param {string} id
 * @param {object} params
 */
Modcharts.Panel.prototype.addEvent = function(id, params, callback){

	var self = this,
		args = { params: params, panel: this},
		event;

	switch (id){
		case "dividends": event = new Modcharts.DividendEvent(args); break;
		case "splits": event = new Modcharts.SplitsEvent(args); break;
		case "earnings": event = new Modcharts.EarningsEvent(args); break;
		case "dividendscustom": event = new Modcharts.DividendCustomEvent(args); break;
		case "splitscustom": event = new Modcharts.SplitsCustomEvent(args); break;
		case "earningscustom": event = new Modcharts.EarningsCustomEvent(args); break;
		case "announcedearnings": event = new Modcharts.AnnouncedEarningsEvent(args); break;
		case "custom": event = new Modcharts.CustomEvent(args); break;
	}

	if (event){
		self.events.push(event);
	}

	if (callback) {
		callback(self);
	}

	return event;
};

/**
 * set primary yaxis scaling method
 * @param {string} scale ("linear", "log")
 */
Modcharts.Panel.prototype.setScale = function (scaleType){

	// don't allow log scales on normalized charts
	if (scaleType === "log" && this.isNormalized()){
		scaleType = "linear";
	}

	if (this.core.getPanelIndex(this) > 0){
		scaleType = "linear";
	}

	this.core.params.yAxisScale = scaleType;

	this.yAxis.scale[0] = this.yAxis.getScale(this.yAxis.scale[0].domain(), scaleType);

	if (this.core.onSetScaleCallback){
		this.core.onSetScaleCallback(scaleType);
	}
};

/**
 * based on the current slice of data, return the min/max data range for all indicator datasets
 * also accomodate yaxis padding settings
 * @param {array} data
 * @returns {object}
 */
Modcharts.Panel.prototype.getDataRange = function(data){

	// min/max calcs
	var min = Infinity,
		max = -Infinity,
		el = {}, i = 0, ds = {},
		primarySymbol = this.core.params.symbol,
		symbolData, rangeMin, rangeMax,
		maxLineWidth = 1;

	// get min/max of each indicator's current range
	for (i = 0; i < this.indicators.length; i++) {

		el = this.indicators[i];

		if (el.params.style && typeof el.params.style.lineWidth === "number"){

			maxLineWidth = Math.max(maxLineWidth, el.params.style.lineWidth);
		}

		symbolData = el.params.symbol || primarySymbol;

		for (var e in data[symbolData]) { if (data[symbolData].hasOwnProperty(e)){

			if (data[symbolData][e][el.params.uid]){

				ds = {};
				ds[e] = data[symbolData][e][el.params.uid];

				rangeMin = el.getRangeMin(ds);
				rangeMax = el.getRangeMax(ds);

				if (typeof rangeMin === "number") { min = Math.min(min, rangeMin); }
				if (typeof rangeMax === "number") { max = Math.max(max, rangeMax); }

				// ensure the yaxis has a range when min === max
				if (min === max){
					min = min * 0.95;
					max = max * 1.05;
				}
			}
		}}
	}

	// vertical yaxis padding (used to carve out room for chart legends, etc)
	var yaxisPadding = this.getYAxisPadding();

	if (this.core.params.yAxisScale === "log" && this.isUpper()){

		var ticks = this.yAxis.scale[0].ticks();

		if (ticks.length > 1){

			var diffTop = ticks[ticks.length - 1] - ticks[ticks.length - 2],
				distTop = Math.abs(this.yAxis.scale[0](ticks[ticks.length - 2]) - this.yAxis.scale[0](ticks[ticks.length - 1])),
				pxTop = Math.max(0.2, distTop / diffTop);

			// adjust max value by the specific price value to create a gap of specified pixel height
			max += yaxisPadding.top / pxTop;

		}

		min = Math.max(min, 0.00001); // ensure min doesn't contain 0

	} else {

		// get number of pixels per price unit
		var pxDist = this.size.height / (max - min);

		// adjust max value by the specific price value to create a gap of specified pixel height
		max += yaxisPadding.top / pxDist;

		// adjust min value by the specific price value to create a gap of specified pixel height
		min -= yaxisPadding.bottom / pxDist;

		// adjust max/min for the width of marker lines themselves
		max += maxLineWidth / pxDist;
		min -= maxLineWidth / pxDist;

	}

	return { min: min, max: max };
};

/**
 * inspect panel and indicator params for current padding value.
 */
Modcharts.Panel.prototype.getYAxisPadding = function(){

	var top = 0,
		bottom = 0;

	// panel level
	if (typeof this.params.style.yaxisPaddingTop === "number"){
		top = this.params.style.yaxisPaddingTop;
	}

	if (typeof this.params.style.yaxisPaddingBottom === "number"){
		bottom = this.params.style.yaxisPaddingBottom;
	}

	// certain indicators can override the value (currently those that contain bands)
	$.each(this.indicators, function(idx, indicator){

		if (typeof indicator.params.style.yAxisPaddingTop === "number"){
			top = indicator.params.style.yAxisPaddingTop;
		}

		if (typeof indicator.params.style.yAxisPaddingBottom === "number"){
			bottom = indicator.params.style.yAxisPaddingBottom;
		}
	});

	return {top:top, bottom:bottom};
};

/**
 * similar to getDataRange, this determines the min/max for all custom datasets based on the current slice
 * of data about to be rendered.
 */
Modcharts.Panel.prototype.getCustomDataRange = function(data){

	// min/max calcs
	var min = Infinity,
		max = -Infinity,
		rangeMin, rangeMax,
		el, i,
		maxLineWidth = 0;

	for (i = 0; i < this.indicators.length; i++) {

		el = this.indicators[i];

		if (el.params.style && el.params.style.lineWidth){

			maxLineWidth = Math.max(maxLineWidth, el.params.style.lineWidth);
		}

		rangeMin = el.getRangeMin(data[el.params.datasetId]);
		rangeMax = el.getRangeMax(data[el.params.datasetId]);

		min = Math.min(rangeMin, min);
		max = Math.max(rangeMax, max);
	}

	/**
	 * vertical padding (used to carve out room for chart legends, etc)
	 */

	// get number of pixels per price unit
	var pxDist = this.size.height / (max - min);

	if (this.params.style.yaxisPaddingTop){
		// adjust max value by the specific price value to create a gap of specified pixel height
		max += this.params.style.yaxisPaddingTop / pxDist;
	}

	if (this.params.style.yaxisPaddingBottom && min !== 0){
		// adjust min value by the specific price value to create a gap of specified pixel height
		min -= this.params.style.yaxisPaddingBottom / pxDist;
	}

	// adjust max/min for the width of marker lines themselves
	max += maxLineWidth / pxDist;
	min -= maxLineWidth / pxDist;

	return {min:min, max:max};
};

/**
 * search panel for indicator id ("sma", "bollinger")
 */
Modcharts.Panel.prototype.getIndicatorsByID = function(id){

	var indicators = [];

	for (var x=0; x < this.indicators.length; x++){

		if (id === this.indicators[x].params.id){

			indicators.push(this.indicators[x]);

		}
	}

	return indicators;
};

/**
 * measure the preceding panels' heights to get current top position
 */
Modcharts.Panel.prototype.getPanelTop = function() {

	var top = 0,
		self = this;

	this.core.eachPanel(function(panel){

		if (panel === self){
			return false;
		}

		var size = panel.size,
			padding = size.padding;

		top += size.height + padding.top + padding.bottom + size.margin.bottom;

	});

	return top;
};

/**
 * return overall panel height including padding and margin, adjusted for size.heightPct if not manually set
 */
Modcharts.Panel.prototype.getPanelHeight = function() {

	var isUpper = this.isUpper(),
		index = this.core.getPanelIndex(this),
		self = this;

	if (this.params.size.height){

		// manually-set height
		return this.params.size.height;

	} else if (this.core.params.panelHeightUpper && isUpper){

		// a fixed upper height was defined in core.params
		return this.core.params.panelHeightUpper;

	} else if (this.core.params.panelHeightLower && !isUpper){

		// a fixed lower height was defined in core.params
		return this.core.params.panelHeightLower;

	} else {

		// auto height calc
		var height = 0;

		this.core.eachPanel(function(panel){

			height += panel.size.padding.top;

			if (index === self.core.panels.length - 1){
				height += Math.max(panel.size.padding.bottom, panel.size.margin.bottom);
			} else {
				height += panel.size.padding.bottom + panel.size.margin.bottom;
			}

		});

		return Math.round(this.size.heightPct * (this.core.size.height - height));
	}

};

/**
 * return ratio between devicepixelratio and backingstoreratio
 * http://www.html5rocks.com/en/tutorials/canvas/hidpi/
 */
Modcharts.Panel.prototype.getScreenRatio = function() {

	var rootContext = this.rootContext,
		devicePixelRatio = window.devicePixelRatio || 1,
        backingStoreRatio = rootContext.webkitBackingStorePixelRatio || rootContext.mozBackingStorePixelRatio || rootContext.msBackingStorePixelRatio || rootContext.oBackingStorePixelRatio || rootContext.backingStorePixelRatio || 1;

	return devicePixelRatio / backingStoreRatio;

};

/**
 * resize and reposition panel dom elements.  update panel.size collection.
 */
Modcharts.Panel.prototype.resize = function() {

	var core = this.core,
		top = this.getPanelTop(),
		rootOverlay = d3.select(this.rootOverlay.node().parentNode);

	// update size collection
	this.size.width = core.size.width - this.size.padding.left - this.size.padding.right;
	this.size.height = this.getPanelHeight();
	this.size.top = top;

	// update dom elements
	var panelWidth = this.size.padding.left + this.size.width + this.size.padding.right,
		panelHeight = this.size.padding.top + this.size.height + this.size.padding.bottom,
		ratio = this.getScreenRatio();

	core.rootMouse.style("width", panelWidth + "px");
	this.rootPanel.style("top", top + "px");

	// set new canvas height/widths
	$.each([this.rootCanvas, rootOverlay, this.rootTools], function(idx, el){

		if (ratio !== 1 && el !== rootOverlay){

			// scale canvas by device ratio
			var canvas = el.node();

			canvas.width = Math.round(panelWidth * ratio);
			canvas.height = Math.round(panelHeight * ratio);

			canvas.style.width = panelWidth + "px";
			canvas.style.height= panelHeight + "px";

			canvas.getContext("2d").scale(ratio, ratio);

		} else {

			if (panelHeight >= 0){

				el.attr("width", panelWidth);
				el.attr("height", panelHeight);

			}
		}
	});

	this.rootError.style({
		"width": panelWidth + "px",
		"height": panelHeight + "px",
		"line-height": this.size.height + "px"
	});

	// legend
	this.rootLegend.style("padding-left", this.size.padding.left + "px");
};

/**
 * check mouse y position to see if it's within panel boundaries
 * (useful for tool drawing)
 */
Modcharts.Panel.prototype.isWithinPanel = function(y) {

	var offset = $(this.rootCanvas.node()).offset();
	offset.top -= $(this.core.rootModchart.node()).offset().top;
	return y >= offset.top && y < offset.top + this.size.padding.top + this.size.height + this.size.padding.bottom;
};

/**
 * return true if panel is using normalized data
 */
Modcharts.Panel.prototype.isNormalized = function() {

	var isUpper = this.isUpper();

	if (this.core.params.dataNormalized && isUpper){
		return true;
	}

	if (this.core.params.symbolCompare.length && isUpper){
		return true;
	}

	if (this.getIndicatorsByID("crs").length > 0){
		return true;
	}

	if (this.getIndicatorsByID("sectorindustry").length){
		return true;
	}

	return false;
};

/**
 * return true if panel is first on chart
 */
Modcharts.Panel.prototype.isUpper = function() {

	return this === this.core.panels[0];

};

/**
 * create a clip region and begin clip
 */
Modcharts.Panel.prototype.clipPanel = function(ctx){

	ctx = ctx || this.rootContext;

	ctx.beginPath();

	var pad = this.size.padding,
		top = pad.top,
		right = pad.left + this.size.width,
		bottom = pad.top + this.size.height,
		left = pad.left;

	ctx.moveTo(left, top);
	ctx.lineTo(right, top);
	ctx.lineTo(right, bottom);
	ctx.lineTo(left, bottom);

	ctx.closePath();
	ctx.clip();
};

/**
 * render all axes, indicators and tools for this panel
 * clip contents to panel region to remove any overlaps
 */
Modcharts.Panel.prototype.render = function(data, dateLabels) {

	if (!data && this.prevData){ data = this.prevData; }
	if (!dateLabels && this.prevDateLabels){ dateLabels = this.prevDateLabels; }

	this.prevData = data;
	this.prevDateLabels = dateLabels;

	// legend
	this.revealLegend();

	// render axes
	this.renderAxes(this.xAxis.scale[0], this.yAxis.scale[0], dateLabels || {});

	// render borders
	this.renderBorders();

	// prepare main clip
	this.rootContext.save();

	// clip region around panel
	this.clipPanel(this.rootContext);

	// render indicators
	this.renderIndicators(data);

	// restore clipped panel
	this.rootContext.restore();

	// render event icons outside of clip
	this.renderEvents(data);

	// render no-clip indicators outside of clip
	this.renderNoClipIndicators(data);

	// render tools
	this.renderTools();

	// render indicator flags outside of clip
	this.renderFlags();

};

/**
 */
Modcharts.Panel.prototype.renderIndicators = function(data) {

	var indicatorSymbol = "",
		indicator = {},
		elType = "",
		ds = {},
		i = 0,
		wsodIssue = "",
		exchangeId = "",
		primarySymbol = this.core.params.symbol;

	this.sessionClips = {};

	for (i = 0; i < this.indicators.length; i++) {

		indicator = this.indicators[i];

		// skip no-clip indicators
		if (indicator.params.noClip){
			continue;
		}

		// Custom indicators using custom datasets
		if (indicator.params.id === "custom" && data[indicator.params.datasetId]){

			indicator.render(data[indicator.params.datasetId]);

		}

		indicatorSymbol = indicator.params.symbol || primarySymbol;

		// API-based indicators (data.MSFT.price, data.MSFT.sma, ...)
		for (elType in data[indicatorSymbol]){ if (data[indicatorSymbol].hasOwnProperty(elType)){

			// data.MSFT.price.<uid>
			if (data[indicatorSymbol][elType][indicator.params.uid]){

				// construct the dataset passed to this indicator's render method
				ds = {};
				ds[elType] = data[indicatorSymbol][elType][indicator.params.uid];

				// special case: the "posneg" price indicator needs an additional previousclose datapoint in order to render
				if (data[indicatorSymbol].previousclose && elType === "price" && indicator.params.markerType === "posneg"){

					ds["previousclose"] = this.core.getFirstDataset(data[indicatorSymbol].previousclose);
				}

				// special case: the "volume" indicator will need the price dataset when in "posneg" mode.
				if (data[indicatorSymbol].price && elType === "volume" && indicator.params.markerType === "posneg"){

					ds["price"] = this.core.getFirstDataset(data[indicatorSymbol].price);
				}

				// special case: the "linearregression" indicator is rendered using the price dataset.
				if (elType === "linearregression"){

					if (indicator.params.parentUID){

						var parentIndicator = this.core.getIndicatorByUID(indicator.params.parentUID);

						ds["linearregression"] = this.core.getFirstDataset(data[parentIndicator.params.symbol || indicatorSymbol][parentIndicator.params.id]);

					} else if (data[indicatorSymbol].price){

						ds["linearregression"] = this.core.getFirstDataset(data[indicatorSymbol].price);
					}
				}

				// if intraday we need to clip to individual exchange sessions
				if (this.core.state.isIntraday){

					wsodIssue = this.core.getWSODIssueByTicker(indicatorSymbol);

					if (wsodIssue && this.core.xref[wsodIssue]){

						exchangeId = this.core.xref[wsodIssue].exchangeId;

						// clip rectangular regions around intraday sessions
						if (this.core.params.clipSessions){

							this.renderSession(ds, exchangeId, indicator, "NormalSession");

							if (elType === "price"){
								this.renderSession(ds, exchangeId, indicator, "SessionBreak");
							}

						} else {

							// don't clip sessions
							indicator.render(ds);
						}

					} else {

						this.core.warn("Intraday clip: Could not find issue for " + indicatorSymbol);
						indicator.render(ds);
					}

				} else {

					// not intraday; render everything
					indicator.render(ds);
				}
			}
		}}
	}
};

Modcharts.Panel.prototype.renderSession = function(ds, exchangeId, indicator, sessionType) {

	this.rootContext.save();

	if (!this.sessionClips[exchangeId]){

		this.sessionClips[exchangeId] = {};
	}

	if (!this.sessionClips[exchangeId][sessionType]){
		this.sessionClips[exchangeId][sessionType] = this.getSessionClips(exchangeId, sessionType);
	}

	this.clipIntradaySessions(this.sessionClips[exchangeId][sessionType]);

	indicator.render(ds, sessionType);

	this.rootContext.restore();

};

Modcharts.Panel.prototype.renderEvents = function(data) {

	// render event icons outside of clip
	for (var i = 0; i < this.events.length; i++) {
		this.events[i].render(data[this.core.params.symbol] || {});
	}

};

/**
 */
Modcharts.Panel.prototype.renderNoClipIndicators = function(data) {

	var indicatorSymbol = "", indicator = {}, elType = "", ds = {}, i = 0, primarySymbol = this.core.params.symbol;

	for (i = 0; i < this.indicators.length; i++) {

		indicator = this.indicators[i];

		// only draw no-clip indicators
		if (!indicator.params.noClip){
			continue;
		}

		indicatorSymbol = indicator.params.symbol || primarySymbol;
		ds = {};

		// Non-API driven indicators
		if (indicator.params.id === "highlow"){

			// the highlow indicator uses the price dataset
			if (data[primarySymbol] && data[primarySymbol].price){

				ds["price"] = this.core.getFirstDataset(data[primarySymbol].price);

			}

			// special case:  the "highlow" indicator can use the previousclose dataset to avoid collisions.
			if (data[primarySymbol].previousclose){

				ds["previousclose"] = this.core.getFirstDataset(data[primarySymbol].previousclose);
			}

			indicator.render(ds);

			continue;

		} else if (indicator.params.id === "volumebyprice"){

			// the volumebyprice indicator uses the price dataset and volume dataset
			if (data[primarySymbol] && data[primarySymbol].price){

				ds["price"] = this.core.getFirstDataset(data[primarySymbol].price);

			}

			if (data[primarySymbol] && data[primarySymbol].volume){

				ds["volume"] = this.core.getFirstDataset(data[primarySymbol].volume);
			}

			indicator.render(ds);

			continue;

		} else if (indicator.params.id === "horizontalannotation"){

			indicator.render();

			continue;
		}

		// API-based indicators (data.MSFT.price, data.MSFT.sma, ...)
		for (elType in data[indicatorSymbol]){ if (data[indicatorSymbol].hasOwnProperty(elType)){

			// data.MSFT.price.<uid>
			if (data[indicatorSymbol][elType][indicator.params.uid]){

				// construct the dataset passed to this indicator's render method
				ds = {};
				ds[elType] = data[indicatorSymbol][elType][indicator.params.uid];

				indicator.render(ds);
			}
		}}
	}
};

/**
 * get session clips
 */
Modcharts.Panel.prototype.getSessionClips = function(exchangeId, sessionType) {

	var clips = [],
		dates = this.core.exchangeDates,
		padding = this.size.padding,
		scale = this.xAxis.scale[0],
		sessions = this.core.timeService.typicalSessions,
		session = [],
		debugSessions = false,
		left = 0,
		right = 0,
		mid = 0,
		s = 0,
		labelWidth = 0,
		labelHeight = 10,
		sLen = 0,
		ctx = {},
		dateStart = new Date(dates[0]),
		dateStop = new Date(dates[dates.length - 1]),
		dateLeft = new Date(),
		dateRight = new Date(),
		exchangeClosure = null;

	// default sessiontype
	if (!sessionType){
		sessionType = "NormalSession";
	}

	// start at midnight
	dateStart.setHours(0);
	dateStart.setMinutes(0);
	dateStart.setSeconds(0);
	dateStart.setMilliseconds(0);

	while (dateStart < dateStop){

		session = sessions[dateStart.getDay()].sessions;

		exchangeClosure = this.getExchangeClosure(dateStart, exchangeId);

//console.log(dateStart,exchangeId,exchangeClosure);

		sLen = session.length;

		if (sLen && !exchangeClosure){

			for (s=0; s < sLen; s++){

				if (session[s].exchangeId === exchangeId && (!session[s].sessionType || session[s].sessionType === sessionType)){

					// left edge of current session
					dateLeft = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate(), 0, session[s].open);

					// right edge of current session
					dateRight = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate(), 0, session[s].close);

					left = scale(this.core.closestExchangeIndex(dateLeft));
					right = scale(this.core.closestExchangeIndex(dateRight));

					clips.push({
						left: left,
						top: padding.top,
						width: Math.ceil(right - left),
						height: this.size.height + padding.top,
						debugColor: "rgba(255, 0, 50, 0.1)",
						exchangeId: session[s].exchangeId
					});
				}
			}
		}

		// draw holiday closure labels
		if (exchangeClosure && this.core.params.showClosureLabels && this.isUpper() && this.core.params.symbolCompare.length){

			var typicalSession = this.core.timeService.typicalSessions[dateStart.getDay()];

			if (typicalSession.rulerSessions[exchangeId]){

				var rulerSession = typicalSession.rulerSessions[exchangeId];

				// left edge
				dateLeft = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate(), 0, rulerSession.open);

				// right edge
				dateRight = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate(), 0, rulerSession.close);

				ctx = this.rootContext;

				labelWidth = ctx.measureText(exchangeClosure.name).width;

				left = scale(this.core.closestExchangeIndex(dateLeft));
				right = scale(this.core.closestExchangeIndex(dateRight));
				mid = left + ((right - left) / 2) - (labelHeight / 2);

				// draw label if it fits
				if (this.size.height > labelWidth && right - left > labelHeight){
					ctx.save();
					ctx.translate(this.px(mid), (this.size.height / 2) + (labelWidth / 2));
					ctx.rotate(-Math.PI/2);
					ctx.fillStyle = this.params.style.labelClosureColor || "#777";
					ctx.fillText(exchangeClosure.name, 0, 0);
					ctx.restore();
				}
			}
		}

		// increment by 1 day
		dateStart.setDate(dateStart.getDate() + 1);

	}

	// render optional debug information
	if (debugSessions){

		this.rootContext.strokeWidth = 1;

		for (var x=0; x < clips.length; x++){

			if (clips[x].left + clips[x].width > 0){

				this.rootContext.fillStyle = (x%2===0)?clips[x].debugColor: "rgba(255,255,50,0.1)";
				this.rootContext.fillRect(clips[x].left, clips[x].top, clips[x].width, clips[x].height);

				if (clips[x].width > 20){
					this.rootContext.fillStyle = "#FFFFFF";
					this.rootContext.fillText(clips[x].exchangeId, clips[x].left + 5, clips[x].height - 8);
				}
			}
		}
	}

	return clips;

};

/**
 * get session clips
 */
Modcharts.Panel.prototype.clipIntradaySessions = function(sessionClips) {

	var ctx = this.rootContext, clip = {};

	// create one big clip region with several rectangles, one per session
	ctx.beginPath();

	for (var r=0; r < sessionClips.length; r++){

		clip = sessionClips[r];

		if (clip.left + clip.width > 0){

			ctx.moveTo(clip.left, clip.top);  //nw
			ctx.lineTo(clip.left, clip.height); //sw
			ctx.lineTo(clip.left + clip.width, clip.height); //se
			ctx.lineTo(clip.left + clip.width, clip.top); //ne

		}
	}

	ctx.clip();
	ctx.closePath();

};

/**
 * return true if there is a closure for this exchange and date
 */
Modcharts.Panel.prototype.getExchangeClosure = function(date, exchangeId) {

	var closures = this.core.timeService.fullClosures;

	for (var x=0, xLen = closures.length; x < xLen; x++){

		if (date - closures[x].date === 0){

			for (var i = 0, iLen = closures[x].exchangeIds.length; i < iLen; i++) {

				if (closures[x].exchangeIds[i] === exchangeId){
					return closures[x];
				}
			}
		}
	}

	return false;
};

/**
 * render tools clipped to chart boundaries
 */
Modcharts.Panel.prototype.renderTools = function() {

	// clip the panel so that no marker can overlap edges
	this.rootToolContext.save();
	this.clipPanel(this.rootToolContext);

	$.each(this.tools, function(idx, el){
		el.render();
	});

	this.rootToolContext.restore();

};

/**
 * render indicator flags (currently only the primary price indicator)
 * hide flags if showFlags mode is false
 */
Modcharts.Panel.prototype.renderFlags = function() {

	var ind = {}, core = this.core;

	for (var i = 0; i < this.indicators.length; i++) {

		ind = this.indicators[i];

		$.each(ind.flags, function(){

			if (core.params.showFlags){
				this.render();
			} else {
				this.hide();
			}
		});
	}
};

/**
 * clear out the current context and tools
 */
Modcharts.Panel.prototype.clearPanel = function() {

	var style = this.params.style,
		size = this.size,
		width = size.width,
		height = size.height,
		padding = size.padding,
		fullWidth = width + padding.left + padding.right,
		fullHeight = size.height + padding.top + padding.bottom;

	// empty canvas contents
	this.rootContext.clearRect(0, 0, fullWidth, fullHeight);

	// fill grid area rect
	if (style.gridBgColor && style.gridBgColor !== "none"){
		this.rootContext.fillStyle = style.gridBgColor;
		this.rootContext.fillRect(padding.left, padding.top, width, height);
	}

	// fill yaxis rect
	if (style.yaxisBgColor && style.yaxisBgColor !== "none"){
		this.rootContext.fillStyle = style.yaxisBgColor;
		this.rootContext.fillRect(padding.left + width, padding.top, padding.right, height);
	}

	// fill xaxis rect
	if (style.xaxisBgColor && style.xaxisBgColor !== "none"){

		this.rootContext.fillStyle = style.xaxisBgColor;
		this.rootContext.fillRect(padding.left, padding.top + height, fullWidth, padding.bottom);
	}

	// clear tools canvas
	this.clearTools();

	// clear legends
	this.concealLegend();

	// clear flags
	this.clearFlags();

};

/**
 * hide all panel and indicator flags
 */
Modcharts.Panel.prototype.clearFlags = function() {

	// remove panel flags
	$.each(this.flags, function(){

		this.hide();
	});

	// remove indicator flags
	$.each(this.indicators, function(){

		$.each(this.flags, function(){

			this.hide();

		});
	});
};

Modcharts.Panel.prototype.clearTools = function() {

	var width = this.size.width + this.size.padding.left + this.size.padding.right,
		height = this.size.height + this.size.padding.top + this.size.padding.bottom;

	this.rootToolContext.clearRect(0, 0, width, height);
};

Modcharts.Panel.prototype.rect = function(ctx, x, y, w, h){
	ctx.rect(this.px(x), this.px(y), w, h);
};

Modcharts.Panel.prototype.fillRect = function(ctx, x, y, w, h){
	ctx.fillRect(Math.round(x), Math.round(y), Math.round(w)+1, Math.round(h)+1);
};

Modcharts.Panel.prototype.strokeRect = function(ctx, x, y, w, h){
	ctx.strokeRect(this.px(x), this.px(y), Math.round(w), Math.round(h));
};

Modcharts.Panel.prototype.lineTo = function(ctx, x, y){
	ctx.lineTo(this.px(x), this.px(y));
};

Modcharts.Panel.prototype.moveTo = function(ctx, x, y){
	ctx.moveTo(this.px(x), this.px(y));
};

/**
 * apply subpixel offset to value
 * @param {number} val
 * @returns {number}
 */
Modcharts.Panel.prototype.px = function(val){
	return Math.round(val) + 0.5;
};

/**
 * call renderAxis() on all axes within the panel
 * @param {d3.scale.linear} xScale
 * @param {d3.scale.linear} yScale
 */
Modcharts.Panel.prototype.renderAxes = function(xScale, yScale, dateLabels){

	if (!xScale) { xScale = this.xAxis.scale[0]; }
	if (!yScale) { yScale = this.yAxis.scale[0]; }

	this.yAxis.render();
	this.renderVerticalGrid(dateLabels);
	this.xAxis.render(dateLabels);
};

/**
 * render an overall panel border and/or selected edges
 */
Modcharts.Panel.prototype.renderBorders = function(){

	var ctx = this.rootContext,
		size = this.size,
		pad = size.padding,
		style = this.params.style,
		//index = this.core.getPanelIndex(this),
		width = size.width,
		height = size.height,
		left = pad.left,
		top = pad.top;

	// height adjustment: when panel is not immediately above another panel,
	// reduce height 1px to ensure draws show up on canvas
	if (this.size.margin.bottom > 0){
		height -= 1;
	}

	ctx.beginPath();

	// render full border rectangle
	if (style.gridColorBorder){

		ctx.strokeStyle = style.gridColorBorder;

		this.rect(ctx, left, top, width, height);
		ctx.stroke();

	}

	// render left border line
	if (style.gridColorBorderLeft){

		if (ctx.strokeStyle !== style.gridColorBorderLeft){
			ctx.beginPath();
			ctx.strokeStyle = style.gridColorBorderLeft;
		}

		this.moveTo(ctx, left, top);
		this.lineTo(ctx, left, top + height);
		ctx.stroke();
	}

	// render right border line
	if (style.gridColorBorderRight){

		if (ctx.strokeStyle !== style.gridColorBorderRight){
			ctx.beginPath();
			ctx.strokeStyle = style.gridColorBorderRight;
		}

		this.moveTo(ctx, left + width, top);
		this.lineTo(ctx, left + width, top + height);
		ctx.stroke();
	}

	// render top border line
	if (style.gridColorBorderTop){

		if (ctx.strokeStyle !== style.gridColorBorderTop){
			ctx.beginPath();
			ctx.strokeStyle = style.gridColorBorderTop;
		}

		this.moveTo(ctx, left, top);
		this.lineTo(ctx, left + width, top);
		ctx.stroke();
	}

	// render bottom border line
	if (style.gridColorBorderBottom){

		if (ctx.strokeStyle !== style.gridColorBorderBottom){
			ctx.beginPath();
			ctx.strokeStyle = style.gridColorBorderBottom;
		}

		this.moveTo(ctx, left, top + height);
		this.lineTo(ctx, left + width, top + height);
		ctx.stroke();
	}
};

/**
 */
Modcharts.Panel.prototype.renderLunchBreaks = function(dataIn) {

	var core = this.core;

	if (!dataIn[core.params.symbol] || !dataIn[core.params.symbol].price){ return; }

	// find lunch breaks for typical sessions

	var data = core.getFirstDataset(dataIn[core.params.symbol].price),
		dateEnd = data[data.length - 1].date.getTime() + 86400000,
		typicalBreaks = [],
		session = {},
		x = 0,
		s = 0,
		date = new Date(data[0].date),
		ctx = this.rootContext,
		day = 0,
		dateLeft = new Date(),
		dateRight = new Date(),
		dateMid = new Date(),
		scale = this.xAxis.scale[0],
		xLeft = 0.0,
		xRight = 0.0,
		xMid = 0.0;

	for (x=0; x < core.timeService.typicalSessions.length; x++){

		typicalBreaks[x] = [];

		for (s=0; s < core.timeService.typicalSessions[x].sessions.length; s++){

			session = core.timeService.typicalSessions[x].sessions[s];

			if (session.sessionType === "SessionBreak") {

				var sessionLength = session.close - session.open;

				if (sessionLength >= 60){

					typicalBreaks[x] = [session.open, session.close];
				}

			}
		}
	}

	// draw labels

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	while (date <= dateEnd){

		day = date.getDay();

		dateLeft = new Date(date);
		dateLeft.setSeconds(0);
		dateLeft.setHours(0);
		dateLeft.setMilliseconds(0);
		dateLeft.setMinutes(typicalBreaks[day][0]);

		dateRight = new Date(date);
		dateRight.setHours(0);
		dateRight.setSeconds(0);
		dateRight.setMilliseconds(0);
		dateRight.setMinutes(typicalBreaks[day][1]);

		dateMid = new Date(dateLeft.getTime() + ((dateRight - dateLeft) / 2));

		xLeft = scale(core.closestExchangeIndex(dateLeft));
		xRight = scale(core.closestExchangeIndex(dateRight));
		xMid = scale(core.closestExchangeIndex(dateMid));

		// draw label if gap is wide enough and label falls within the panel region
		if (xRight - xLeft > 20 && xMid < this.size.padding.left + this.size.width - 5){
			ctx.save();
			ctx.translate(xMid, 100);
			ctx.rotate(-Math.PI/2);
			this.glowText(ctx, "Lunch break", 0, 0, "#777", "#FFF");
			ctx.restore();
		}

		date.setDate(date.getDate() + 1);
	}
};

/**
 * fillText with a glow behind it
 */
Modcharts.Panel.prototype.glowText = function(ctx, labelText, x, y, textColor, glowColor){

	// background
	if (typeof glowColor === "string" && glowColor !== "none"){
		ctx.strokeStyle = glowColor;
		ctx.lineWidth = 2;
		ctx.strokeText(labelText, x, y);
	}

	// foreground
	ctx.fillStyle = textColor;
	ctx.lineWidth = 1;
	ctx.fillText(labelText, x, y);

};

/**
 * remove from indicators collection
 */
Modcharts.Panel.prototype.removeIndicator = function(indicator){

	// final cleanup before removal
	indicator.remove();

	// remove from panel's indicators collection
	for (var x = this.indicators.length -1; x >= 0; x--){

		if (indicator === this.indicators[x]){

			this.indicators.splice(x,1);

			break;
		}
	}

};

/**
 * remove from events collection
 */
Modcharts.Panel.prototype.removeEvent = function(id, uid){

	var x = 0, type = "";

	if (typeof id === "object" && id.params){

		type = id.params.id;
		uid = id.params.uid;

	} else {

		type = id;

	}

	for (x = this.events.length - 1; x >= 0; x--){

		if (type === this.events[x].params.id){

			if (!uid || this.events[x].params.uid === uid) {

				this.events[x].remove();
				this.events.splice(x,1);
			}
		}
	}

	this.core.render();

};

/**
 * remove all tools from this panel
 */
Modcharts.Panel.prototype.removeTools = function(){

	for (var x = this.tools.length - 1; x >= 0; x--){

		this.tools[x].remove();
	}

	this.core.render();
};

/**
 */
Modcharts.Panel.prototype.updateLegend = function(){

	$(this.rootLegend.node()).empty();

	if (this.applyLegendContent){
		this.applyLegendContent(this.rootLegend, this.indicators);
	}
};

/**
 */
Modcharts.Panel.prototype.concealLegend = function(){

	this.rootLegend.style("visibility", "hidden");
};

/**
 */
Modcharts.Panel.prototype.concealCrosshairs = function(){

	// conceal horiz line
	if (this.crosshairHoriz){
		this.crosshairHoriz.style("visibility", "hidden");
	}

	// conceal vert line
	if (this.crosshairVert){
		this.crosshairVert.style("visibility", "hidden");
	}

	// conceal crosshair flag (only will exist on first panel)
	if (this.flags["crosshair"]){
		this.flags["crosshair"].hide();
	}

	// conceal circle (only will exist on first panel)
	if (this.crosshairCircle){
		this.crosshairCircle.style("visibility", "hidden");
	}
};

/**
 */
Modcharts.Panel.prototype.revealLegend = function(){

	if (this.rootLegend.style("display") !== "none"){
		this.rootLegend.style("visibility", "visible");
	}
};

/**
 * update the html for this panel's legend.  the function receives a root dom element and collection of indicator objects.
 * the currently-active indicator params can be found in each indicator's "params"
 * style/color properties will be in params.style
 * specific indicator inputs (period, smoothing) will be in params.inputs
 */
/*
Modcharts.Panel.prototype.applyLegendContent = function(root, indicators){};
*/

/**
 * @method onClickRemoveLegendIndicator
 * Event handler that excecutes when the Delete button next to the indicator name is clicked.
 * This will remove the indicator, call various update methods, then request new data.
 * call this method with one of:
 *    - indicator reference
 *    - an indicator UID
 *    - a d3 selector that points to an element with an "idx" and "panelId" attribute
 */
Modcharts.Panel.prototype.onClickRemoveLegendIndicator = function(arg){

	if (d3.event) { d3.event.preventDefault(); }

	var core = this.core,
		loadData = false,
		removeCompare = false,
		overlays = [],
		panel = {},
		indicator;

	// argument was indicator reference
	if (arg.params && arg.params.uid){

		indicator = arg;

	} else if (typeof arg === "string"){ // argument was an indicator uid

		indicator = core.getIndicatorByUID(arg);

	}

	if (indicator){

		panel = indicator.panel;

	} else { // argument was a d3 selector

		var el = d3.select(arg),
			idx = el.attr("idx");

		panel = core.getPanelByUID(el.attr("panelId"));

		if (panel){
			indicator = panel.indicators[idx];
		}

	}

	if (!indicator){
		this.core.warn("Indicator reference not found.");
		return;
	}

	// check if this is a lower indicator with overlays
	for (var x=1; x < panel.indicators.length; x++){

		if (panel.indicators[x].params.parentUID === indicator.params.uid){
			overlays.push(panel.indicators[x]);
		}
	}

	// special handling for price markers
	if (indicator.params.id === "price" && indicator.params.symbol){

		// always reload data after deleting a symbol (helps restore a chart if it just broke due to adding a bad symbol)
		loadData = true;

		// remove from symbolCompare collection
		var inArray = $.inArray(indicator.params.symbol, panel.core.params.symbolCompare);

		if (inArray !== -1){

			panel.core.params.symbolCompare.splice(inArray, 1);
			removeCompare = true;

		}
	}

	// always reload data after deleting a sectorindustry
	if (indicator.params.id === "sectorindustry"){
		loadData = true;
	}

	// remove indicator object
	this.removeIndicator(indicator);

	// remove the entire panel if that was its last non-overlay indicator
	if (this.indicators.length === 0 || overlays.length > 0){

		core.removePanel(this);
		core.resize();

	} else if (removeCompare){

		core.resetDomain();

		if (core.params.dateStart && core.params.dateStop){

			var daysRange = Math.ceil((core.params.dateStop.getTime() - core.params.dateStart.getTime()) / 1000 / 60 / 60 / 24);

			core.params.days = Math.min(core.state.isIntraday ? core.LIMIT_INTRADAY_DAYS : core.LIMIT_INTERDAY_DAYS, daysRange);

		}

		this.updateLegend();

	} else {

		// update legend immediately
		this.updateLegend();
	}

	// load new data or render
	if (loadData){
		core.loadData();
	} else {
		core.render();
	}

	if (core.onClickRemoveLegendIndicatorCallback){

		core.onClickRemoveLegendIndicatorCallback(this);

	}

	return false;
};

/**
 * render vertical grid lines and xaxis ticks
 * @params {array} labels
 */
Modcharts.Panel.prototype.renderVerticalGrid = function(labels){

	// render ticks

	var ctx = this.rootContext,
		x0,
		y0 = this.size.padding.top,
		self = this,
		altLabels = [],
		i, y,
		ticks = [],
		allowVertical = this.params.style.gridVertPenPxOff !== 0 || this.params.style.gridVertPenPxOn !== 0,
		allowVerticalAlt = this.params.style.gridVertAltPenPxOff !== 0 || this.params.style.gridVertAltPenPxOn !== 0;

	// vertical grid labels
	ctx.beginPath();
	ctx.lineWidth = this.params.style.gridSizeVert;
	ctx.strokeStyle = this.params.style.gridColor;

	// dashed line
	if (this.params.style.gridVertPenPxOff && this.params.style.gridVertPenPxOn && ctx.setLineDash){
		ctx.setLineDash([this.params.style.gridVertPenPxOn, this.params.style.gridVertPenPxOff]);
	}

	// draw regular vertical grid lines and collect alt grid lines
	$.each(labels, function(row, el){

		if (!el){ return true; }

		labelLoop:
		for (i = el.length - 1; i >= 0; i--) {

			x0 = self.px(self.xAxis.scale[0](el[i].index));

			if (row === "months" && labels.years){

				// check years for same index, if so add to alt collection and don't draw here.
				for (y=0; y < labels.years.length; y++){
					if (labels.years[y].index === el[i].index){
						altLabels.push(x0);
						continue labelLoop;
					}
				}

			} else if (/minutes|hours/.test(row) && labels.days){

				// check days for same index, if so add to alt collection and don't draw here.
				for (y=0; y < labels.days.length; y++){
					if (labels.days[y].index === el[i].index){
						altLabels.push(x0);
						continue labelLoop;
					}
				}
			}

			ticks.push(x0);

			if (allowVertical){
				ctx.moveTo(x0, y0);
				ctx.lineTo(x0, y0 + self.size.height);
			}

		}

		// only draw grids for the first applicable row of labels
		// (ex: months, not both months and years)
		if (el.length){
			return false;
		}

	});

	ctx.stroke();

	if (allowVerticalAlt){

		// draw alt grid lines
		ctx.beginPath();
		ctx.strokeStyle = this.params.style.gridColorAlt;

		// alt dashed line
		if (ctx.setLineDash){
			ctx.setLineDash([this.params.style.gridVertAltPenPxOn, this.params.style.gridVertAltPenPxOff]);
		}

		// alt lines
		for (i = 0; i < altLabels.length; i++) {

			ctx.moveTo(altLabels[i], y0);
			ctx.lineTo(altLabels[i], y0 + self.size.height);

		}

		ctx.stroke();
	}

	// reset dashed line
	if (ctx.setLineDash){
		ctx.setLineDash([]);
	}

	// xaxis ticks
	ctx.beginPath();
	ctx.strokeStyle = this.params.style.gridColorTicks;

	y0 = this.size.padding.top + this.size.height;

	for (i = 0; i < ticks.length; i++) {

		x0 = ticks[i];
		ctx.moveTo(x0, y0);
		ctx.lineTo(x0, y0 + this.params.style.xaxisTickHeight);
	}

	ctx.stroke();

	// xaxis ticks - alt
	ctx.beginPath();
	ctx.strokeStyle = this.params.style.gridColorTicksAlt;

	y0 = this.size.padding.top + this.size.height;

	for (i = 0; i < altLabels.length; i++) {

		x0 = altLabels[i];
		ctx.moveTo(x0, y0);
		ctx.lineTo(x0, y0 + this.params.style.xaxisTickHeightAlt);
	}

	ctx.stroke();

};

/**
 * render error message on top of a panel
 * @param  {string} message 
 */
Modcharts.Panel.prototype.renderErrorMessage = function (message) {

	this.rootError.html(message)
		.style("display", "initial");
};

/**
 * convert a normalized close value to an actual
 */
Modcharts.Panel.prototype.normalizedToActual = function(val){

	if (this.core.params.normalizeValues && this.core.params.normalizeValues.Close){

		var normalizedValue = this.core.params.normalizeValues.Close,
			valOrig = normalizedValue || 0,
			valNew = ((val / 100) * valOrig) + valOrig;

		return valNew;
	}

	return val;
};

/**
 * convert an actual value to normalized
 * see also: https://wiki.wsod.local/wsodwiki/index.php/Percent_Change_Display_Policy
 */
Modcharts.Panel.prototype.actualToNormalized = function(val){

	var normalizedValue = 0;

	if (this.core.params.normalizeValues){
		normalizedValue = this.core.params.normalizeValues.Close;
	}

	var valOrig = normalizedValue || this.core.params.normalizeValue;

	return ((val - valOrig) / valOrig) * 100;

};

/**
 * A line with customizable arrowheads
 * @constructor
 * @class ArrowLineTool
 * @extends LineTool
 */
Modcharts.ArrowLineTool = function(){};

Modcharts.Extend(Modcharts.ArrowLineTool, Modcharts.LineTool);

Modcharts.ArrowLineTool.prototype.getDefaultParams = function() {

	return {
		id: "arrow",
		name: "Arrow",
		arrow: true,
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-arrow", "color") || "steelblue",
			lineWidth: this.getStyle(".modcharts-tool-line-arrow", "width") || 2,
			arrowWidth: this.getStyle(".modcharts-tool-line-arrow", "width") || 5,
			arrowHeight: this.getStyle(".modcharts-tool-line-arrow", "height") || 15
		}
	};
};

Modcharts.ArrowLineTool.prototype.drawArrowheads = function(ctx, x1, y1, x2, y2){

	// draw the ending arrowhead
	var endRadians=Math.atan((y2-y1)/(x2-x1));
	endRadians+=((x2>=x1)?90:-90)*Math.PI/180;
	this.drawArrowhead(ctx,x2,y2,endRadians);

};

Modcharts.ArrowLineTool.prototype.drawArrowhead = function(ctx,x,y,radians){

	ctx.save();
	ctx.beginPath();
	ctx.translate(x,y);
	ctx.rotate(radians);
	ctx.moveTo(0,0);
	ctx.lineTo(this.params.style.arrowWidth, this.params.style.arrowHeight);
	ctx.lineTo(-this.params.style.arrowWidth, this.params.style.arrowHeight);
	ctx.closePath();
	ctx.restore();
	ctx.fill();

};

/**
 * Button to customize tool options
 * @constructor
 * @class ConfigButton
 * @extends Handle
 */
Modcharts.ConfigButton = function(tool, params){

	this.superclass.call(this, tool, params || {});

};

Modcharts.Extend(Modcharts.ConfigButton, Modcharts.Handle);

Modcharts.ConfigButton.prototype.onClick = function(){

	// custom click handler
	if (typeof this.onClickCustom === "function"){

		return this.onClickCustom(this.coords, this.tool.params);

	}

	var self = this,
		style = this.tool.params.style;

	if (!this.el) {

		this.el = $("<div class=\"modcharts-toolconfig\"></div>").appendTo($(this.tool.panel.core.rootModchart)).hide();

		this.elContent = $("<div class=\"modcharts-toolconfig-content modcharts-contains\"></div>")
			.css("display","block").appendTo(this.el)
			//.css("width","auto")
			.css("height","auto");

		this.elContent.append("<p><em>"+this.tool.params.name+"</em></p>");

		// expose "value" if it exists
		if (this.tool.params.value){
			self.elContent.append("<p><div class=\"modcharts-toolconfig-content-key\">Value</div><textarea paramid=\"value\">"+this.tool.params.value+"</textarea></p>");
		}

		$.each(style, function(el){

			self.elContent.append("<p><div class=\"modcharts-toolconfig-content-key\">"+el+"</div><input type=\"text\" styleid=\""+el+"\" value=\""+style[el]+"\" /></p>");

		});

		this.elContent.append("<p><input type=\"button\" class=\"apply\" value=\"OK\"/><input type=\"button\" class=\"cancel\" value=\"Close\"/></p>");

		this.elContent.find(".apply").on("click", function(e){

			var params = $(this).parent().parent().find(":text,textarea");

			params.each(function(){

				var styleId = $(this).attr("styleid");
				var paramId = $(this).attr("paramid");

				if (styleId) {
					self.tool.params.style[styleId] = $(this).val();
				}

				if (paramId){
					self.tool.params[paramId] = $(this).val().substring(0, 1028);
				}

			});

			self.tool.panel.core.clearPanels();
			self.tool.panel.core.render();

			e.preventDefault();

			self.el.fadeOut(100);

			return false;

		});


		this.elContent.find(".cancel").on("click", function(e){

			self.el.fadeOut(100);

			e.preventDefault();
			return false;

		});
	}

	// show config
	if (!this.el.is(":visible")){

		this.el.css("left", this.coords[0] + 50)
			.css("top", this.coords[1] + 50)
			.fadeIn(100);

	} else {

		// hide config
		this.el.fadeOut(100);

	}

};

Modcharts.ConfigButton.prototype.render = function(){

	if (this.tool.panel.core.state.toolmode !== null){

		var ctx = this.tool.panel.rootToolContext,
			size = (this.state.hover) ? 4 : 3;

		this.coords = this.tool.handle[0].getCoords();

		if (!this.coords){
			return;
		}

		this.coords[0] -= 10;
		this.coords[1] -= 10;

		// circle
		ctx.fillStyle = "#fff";
		ctx.strokeStyle = "#333";
		ctx.beginPath();
		ctx.arc(this.coords[0] - (size / 2), this.coords[1] - (size / 2), size * 2 ,0 , 2 * Math.PI);
		ctx.fill();
		ctx.stroke();

		// text
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.font = "9px Arial";
		ctx.fillStyle = "#555";
		ctx.fillText("?", this.coords[0] - 2 , this.coords[1] + 2);
	}

};

/**
 * Ellipse tool
 * @constructor
 * @class EllipseLineTool
 * @extends LineTool
 */
Modcharts.EllipseLineTool = function(){

	this.factorRadius = 1.4;

};

Modcharts.Extend(Modcharts.EllipseLineTool, Modcharts.LineTool);

Modcharts.EllipseLineTool.prototype.getDefaultParams = function() {

	return {
		id: "ellipse",
		name: "Ellipse",
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-ellipse", "color") || "#000",
			lineWidth: this.getStyle(".modcharts-tool-line-ellipse", "width") || 1,
			fillColor: this.getStyle(".modcharts-tool-line-ellipse", "background-color") || "orange",
			fillOpacity: this.getStyle(".modcharts-tool-line-ellipse", "opacity") || 0.05
		}
	};
};

Modcharts.EllipseLineTool.prototype.isWithin = function(mousePanel){

	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	if (!coords[0] || !coords[1]){
		return;
	}

	var ctx = this.panel.rootToolContext,
		xDist = coords[1][0] - coords[0][0],
		yDist = coords[1][1] - coords[0][1],
		center = [coords[0][0] + (xDist / 2), coords[0][1] + (yDist / 2)];

	// within a slightly larger ellipse?
	this.getEllipsePath(ctx, center[0], center[1], Math.abs(xDist / this.factorRadius) + 8, Math.abs(yDist / this.factorRadius) + 8);
	var isWithinOuter = ctx.isPointInPath(mousePanel[0], mousePanel[1]);

	// within a slightly smaller ellipse?
	this.getEllipsePath(ctx, center[0], center[1], Math.abs(xDist / this.factorRadius) - 5, Math.abs(yDist / this.factorRadius) - 5);
	var isWithinInner = ctx.isPointInPath(mousePanel[0], mousePanel[1]);

	// has to be within outer but not inner
	return isWithinOuter && !isWithinInner;

};

Modcharts.EllipseLineTool.prototype.render = function(){

	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	if (!coords[0] || !coords[1]){
		return;
	}

	var ctx = this.panel.rootToolContext,
		xDist = coords[1][0] - coords[0][0],
		yDist = coords[1][1] - coords[0][1],
		lineDist = this.distance(coords[0], coords[1]),
		center = [coords[0][0] + (xDist / 2), coords[0][1] + (yDist / 2)];

	ctx.beginPath();

	ctx.strokeStyle = this.params.style.lineColor;
	ctx.fillStyle = this.params.style.fillColor;
	ctx.lineWidth = this.params.style.lineWidth;

	// ellipse
	if (d3.event && d3.event.shiftKey) {

		this.getCirclePath(ctx, center, lineDist);

	} else {

		this.getEllipsePath(ctx, center[0], center[1], xDist / this.factorRadius, yDist / this.factorRadius);

	}

	if (this.params.style.fillColor !== "none") {

		ctx.globalAlpha = this.params.style.fillOpacity;
		ctx.fill();
		ctx.globalAlpha = 1;

	}

	ctx.stroke();

	if (this.state.selected || this.state.hover) {
		this.handle[0].render();
		this.handle[1].render();
	}

	this.panel.core.onToolRender(this);

};

Modcharts.EllipseLineTool.prototype.getCirclePath = function(ctx, center, lineDist){

	ctx.arc(center[0], center[1], lineDist / 2,0,2*Math.PI);

};

Modcharts.EllipseLineTool.prototype.getEllipsePath = function(ctx, cx, cy, rx, ry){

	ctx.save(); // save state
	ctx.beginPath();

	ctx.translate(cx-rx, cy-ry);
	ctx.scale(rx, ry);
	ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);

	ctx.restore(); // restore to original state
};

Modcharts.EllipseLineTool.prototype.getHalfArcPath = function(ctx, cx, cy, rx, ry, isSmiley) {
	ctx.save(); // save state
	ctx.beginPath();

	ctx.translate(cx-rx, cy-ry);
	ctx.scale(rx, ry);
	if(isSmiley) {
		ctx.arc(1, 1, 1, 0, Math.PI, false);
	} else {
		ctx.arc(1, 1, 1, Math.PI, 2 * Math.PI, false);
	}

	ctx.restore(); // restore to original state
};

Modcharts.EllipseLineTool.prototype.getDonutSegmentPath = function(ctx, cx, cy, rx1, ry1, rx2, ry2, isSmiley) {
	ctx.save(); // save state
	ctx.beginPath();

	var beginArc, middleArc, endArc, screenRatio = this.panel.getScreenRatio();

	if(isSmiley) {
		beginArc = 0;
		middleArc = Math.PI;
		endArc = Math.PI * 2;
	} else {
		beginArc = Math.PI;
		middleArc = 0;
		endArc = Math.PI;
	}

	ctx.translate(cx-rx1, cy-ry1);
	ctx.scale(rx1, ry1);
	ctx.arc(1, 1, 1, beginArc, middleArc, false);
	ctx.setTransform(screenRatio, 0, 0, screenRatio, 0, 0);
	ctx.translate(cx-rx2, cy-ry2);
	ctx.scale(rx2, ry2);
	ctx.arc(1, 1, 1, middleArc, endArc, true);

	ctx.restore();

};

Modcharts.EllipseLineTool.prototype.getDonutPath = function(ctx, cx, cy, rx1, ry1, rx2, ry2) {
	ctx.save(); // save state
	ctx.beginPath();

	var screenRatio = this.panel.getScreenRatio();

	ctx.translate(cx-rx1, cy-ry1);
	ctx.scale(rx1, ry1);
	ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);
	ctx.setTransform(screenRatio, 0, 0, screenRatio, 0, 0);
	ctx.translate(cx-rx2, cy-ry2);
	ctx.scale(rx2, ry2);
	ctx.arc(1, 1, 1, 0, 2 * Math.PI, true);

	ctx.restore();
};


/**
 * Extended line tool
 * @constructor
 * @class ExtendedLineTool
 * @extends LineTool
 */
Modcharts.ExtendedLineTool = function(){};

Modcharts.Extend(Modcharts.ExtendedLineTool, Modcharts.LineTool);

Modcharts.ExtendedLineTool.prototype.getDefaultParams = function() {

	return {
		id: "extended",
		name: "Extended Line",
		extendLeft: true,
		extendRight: true,
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-extended", "color") || "#000",
			lineWidth: this.getStyle(".modcharts-tool-line-extended", "width") || 2
		}
	};
};

/**
 * Fibonacci Arc tool
 * @constructor
 * @class FibArcTool
 * @extends EllipseLineTool
 */
Modcharts.FibArcTool = function() {
	this.thresholds = [0.236, 0.382, 0.5, 0.618, 1];
	this.fibSectionColors = ["#ff0000", "#EEAD0E", "#24B829", "#378A6E", "#555555"];
	this.RADIUS_FACTOR = 0.707;
	this.COLOR_BAR_OPACITY = 0.2;
	this.CENTERING_PADDING = 10;
};

Modcharts.Extend(Modcharts.FibArcTool, Modcharts.EllipseLineTool);

Modcharts.FibArcTool.prototype.getDefaultParams = function() {
	return {
		id: "fibarc",
		name: "Fibonacci Arc",
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-fibarc", "color") || "#666",
			lineWidth: this.getStyle(".modcharts-tool-line-fibarc", "width") || 1,
			fillColor: this.getStyle(".modcharts-tool-line-fibarc", "background-color") || "#ddd",
			fillOpacity: this.getStyle(".modcharts-tool-line-fibarc", "opacity") || 0.05,
			lineColor236: this.getStyle(".modcharts-tool-line-fibarc-236", "color") || "#133aac",
			lineColor382: this.getStyle(".modcharts-tool-line-fibarc-382", "color") || "orange",
			lineColor5: this.getStyle(".modcharts-tool-line-fibarc-5", "color") || "#887a00",
			lineColor618: this.getStyle(".modcharts-tool-line-fibarc-618", "color") || "#062170"
		}
	};
};

Modcharts.FibArcTool.prototype.isWithin = function(mousePanel) {
	return this.isWithinLineTool(mousePanel);
};

Modcharts.FibArcTool.prototype.drawControlLine = function(ctx, coords) {
	ctx.save();
	ctx.strokeStyle = "#ccc";
	ctx.setLineDash([2,3]);
	ctx.beginPath();
	ctx.moveTo(coords[0][0], coords[0][1]);
	ctx.lineTo(coords[1][0], coords[1][1]);
	ctx.stroke();

	// Reset line dashed setting back to solid
	ctx.restore();
};

Modcharts.FibArcTool.prototype.fillHalfEllipse = function(ctx, center, xDist, yDist, i, isSmiley) {
	ctx.save();
	ctx.globalAlpha = this.COLOR_BAR_OPACITY;

	ctx.beginPath();
	if(i !== 0) {
		this.getDonutSegmentPath(ctx, center[0], center[1], xDist * this.thresholds[i], yDist * this.thresholds[i], xDist * this.thresholds[i - 1], yDist * this.thresholds[i - 1], isSmiley);
	} else {
		this.getDonutSegmentPath(ctx, center[0], center[1], xDist * this.thresholds[i], yDist * this.thresholds[i], 1, 1, isSmiley);
	}
	ctx.fill();
	ctx.restore();
};

Modcharts.FibArcTool.prototype.render = function() {

	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	if (!coords[0] || !coords[1]) {
		return;
	}

	var ctx = this.panel.rootToolContext, i,
		upSlope = coords[0][1] > coords[1][1],
		xDist = Math.abs(coords[0][0] - coords[1][0]), // x radius component
		yDist = Math.abs(coords[0][1] - coords[1][1]), // y radius component
		center = [coords[1][0], coords[1][1]];

	ctx.font = "12px Arial";
	ctx.lineWidth = this.params.style.lineWidth;

	for(i = this.thresholds.length - 1; i >= 0; i--) {
		ctx.strokeStyle = this.fibSectionColors[i];
		ctx.beginPath();
		this.getHalfArcPath(ctx, center[0], center[1], (xDist * this.thresholds[i]), (yDist * this.thresholds[i]), upSlope);
		ctx.stroke();

		ctx.fillStyle = this.fibSectionColors[i];
		this.fillHalfEllipse(ctx, center, xDist, yDist, i, upSlope);
		ctx.textAlign = "center";
		if(upSlope) {
			ctx.fillText(this.thresholds[i], center[0], center[1] + yDist * this.thresholds[i] - 5);
		} else {
			ctx.fillText(this.thresholds[i], center[0], center[1] - yDist * this.thresholds[i] + 15); // to put it inside the rings
		}
	}

	ctx.textAlign = "left"; // reset the text alignment

	if (this.state.selected || this.state.hover) {
		this.handle[0].render();
		this.handle[1].render();
	}

	this.drawControlLine(ctx, coords);

	this.panel.core.onToolRender(this);

};

/**
 * Fibonacci Circle tool
 * @constructor
 * @class FibCircleTool
 * @extends EllipseLineTool
 */
Modcharts.FibCircleTool = function() {
	this.thresholds = [0.236, 0.382, 0.5, 0.618, 1];
	this.fibSectionColors = ["#ff0000", "#EEAD0E", "#24B829", "#378A6E", "#555555"];
	this.RADIUS_FACTOR = 0.707;
	this.COLOR_BAR_OPACITY = 0.2;
};

Modcharts.Extend(Modcharts.FibCircleTool, Modcharts.EllipseLineTool);

Modcharts.FibCircleTool.prototype.getDefaultParams = function() {
	return {
		id: "fibcircle",
		name: "Fibonacci Circle",
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-fibcircle", "color") || "#666",
			lineWidth: this.getStyle(".modcharts-tool-line-fibcircle", "width") || 1,
			fillColor: this.getStyle(".modcharts-tool-line-fibcircle", "background-color") || "#ddd",
			fillOpacity: this.getStyle(".modcharts-tool-line-fibcircle", "opacity") || 0.05,
			lineColor236: this.getStyle(".modcharts-tool-line-fibcircle-236", "color") || "#133aac",
			lineColor382: this.getStyle(".modcharts-tool-line-fibcircle-382", "color") || "orange",
			lineColor5: this.getStyle(".modcharts-tool-line-fibcircle-5", "color") || "#887a00",
			lineColor618: this.getStyle(".modcharts-tool-line-fibcircle-618", "color") || "#062170"
		}
	};
};

Modcharts.FibCircleTool.prototype.isWithin = function(mousePanel) {
	return this.isWithinLineTool(mousePanel);
};

Modcharts.FibCircleTool.prototype.drawControlLine = function(ctx, coords) {
	ctx.strokeStyle = "#ccc";
	ctx.setLineDash([2,3]);
	ctx.beginPath();
	ctx.moveTo(coords[0][0], coords[0][1]);
	ctx.lineTo(coords[1][0], coords[1][1]);
	ctx.stroke();

	// Reset line dashed setting back to solid
	ctx.setLineDash([]);
};

Modcharts.FibCircleTool.prototype.fillEllipse = function(ctx, center, xDist, yDist, i) {
	var adjustedXDist = xDist * this.RADIUS_FACTOR,
	adjustedYDist = yDist * this.RADIUS_FACTOR;
	ctx.save();
	ctx.globalAlpha = this.COLOR_BAR_OPACITY;

	if(i !== 0) { // Don't need to clip the center-most point
		this.getDonutPath(ctx, center[0], center[1], adjustedXDist * this.thresholds[i], adjustedYDist * this.thresholds[i], adjustedXDist * this.thresholds[i - 1], adjustedYDist * this.thresholds[i - 1]);
	} else {
		this.getDonutPath(ctx, center[0], center[1], adjustedXDist * this.thresholds[i], adjustedYDist * this.thresholds[i]);
	}
	ctx.fillStyle = this.fibSectionColors[i];
	ctx.fill();

	ctx.restore();
};

Modcharts.FibCircleTool.prototype.render = function() {

	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	if (!coords[0] || !coords[1]) {
		return;
	}

	var ctx = this.panel.rootToolContext, i,
		upSlope = coords[0][1] > coords[1][1],
		xDist = coords[1][0] - coords[0][0], // x radius component
		yDist = coords[1][1] - coords[0][1],
		center = [coords[0][0] + (xDist / 2), coords[0][1] + (yDist / 2)],
		adjustedXDist = xDist * this.RADIUS_FACTOR,
		adjustedYDist = yDist * this.RADIUS_FACTOR;

	ctx.beginPath();
	ctx.font = "12px Arial";
	ctx.strokeStyle = "#CCC";
	ctx.fillStyle = "#CCC";
	ctx.lineWidth = this.params.style.lineWidth;

	for (i = this.thresholds.length - 1; i >= 0 ; i--) {
		ctx.strokeStyle = this.fibSectionColors[i];
		ctx.fillStyle = this.fibSectionColors[i];
		this.getEllipsePath(ctx, center[0], center[1], adjustedXDist * this.thresholds[i], adjustedYDist * this.thresholds[i]);
		ctx.stroke();
		ctx.textAlign = "center";
		if(upSlope) {
			ctx.fillText(this.thresholds[i], center[0], (center[1] + adjustedYDist * this.thresholds[i]) + 15);
		} else {
			ctx.fillText(this.thresholds[i], center[0], (center[1] + adjustedYDist * this.thresholds[i]) - 4);
		}


		this.fillEllipse(ctx, center, xDist, yDist, i);
	}

	if (this.state.selected || this.state.hover) {
		this.handle[0].render();
		this.handle[1].render();
	}

	ctx.textAlign = "left"; // reset the text alignment
	this.drawControlLine(ctx, coords);

	this.panel.core.onToolRender(this);

};

/**
 * Fibonacci retracement tool
 * @constructor
 * @class FibonacciLineTool
 * @extends LineTool
 */
Modcharts.FibonacciLineTool = function(){

	this.thresholds = [0, 0.236, 0.382, 0.5, 0.618, 1];
	this.fibSectionColors = ["#000000", "#6E7171", "#A92B21", "#699C1E", "#24B829", "#378A6E", "#5a5a5a"];
	this.levelLines = {
		x: null,
		y: [],
		isFlipped: false
	};
	this.COLOR_BAR_OPACITY = 0.3;
	this.BOUNDING_BOX_HEIGHT = 5;

};

Modcharts.Extend(Modcharts.FibonacciLineTool, Modcharts.LineTool);

Modcharts.FibonacciLineTool.prototype.getDefaultParams = function() {

	return {
		id: "fibonacci",
		name: "Fibonacci Retracement",
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-fibonacci", "color") || "#FFF",
			lineWidth: this.getStyle(".modcharts-tool-line-fibonacci", "width") || 1
		}
	};
};


Modcharts.FibonacciLineTool.prototype.isWithinFibLines = function(mousePanel, coords) {
	var boundingBox = {},
	mouseRect = {x: mousePanel[0], y: mousePanel[1], width: 1, height: 1 };

	for (var i = 0; i < this.levelLines.y.length; i++) {
		if(this.levelLines.isFlipped) {
			boundingBox = {
				x: 0,
				y: this.levelLines.y[i],
				width: coords[0][0],
				height: this.BOUNDING_BOX_HEIGHT
			};
		} else {
			boundingBox = {
				x: this.levelLines.x,
				y: this.levelLines.y[i],
				width: (this.panel.size.width + this.panel.size.padding.left),
				height: this.BOUNDING_BOX_HEIGHT
			};
		}

		if(this.intersect(boundingBox, mouseRect)) {
			return i;
		}
	}
	return -1;
};

/**
 * define hitbox to be full rectangle
 */
Modcharts.FibonacciLineTool.prototype.isWithin = function(mousePanel){
	var handles = this.handle,
	    coords = [
			this.state.endpointLeft || handles[0].getCoords(),
			this.state.endpointRight || handles[1].getCoords()
		];

	// couldn't find one or more handles
	if (!coords[0] || !coords[1]){
		return false;
	}

	if (this.isWithinFibLines(mousePanel, coords) >= 0 || this.isWithinLineTool(mousePanel)) {
		return true;
	}
};

Modcharts.FibonacciLineTool.prototype.getLevels = function(lastY, currY){

	var range = Math.abs(lastY - currY),
		vals = this.thresholds;

	return ([
		0,
		vals[1] * range,
		vals[2] * range,
		vals[3] * range,
		vals[4] * range,
		vals[5] * range
	]);
};

Modcharts.FibonacciLineTool.prototype.getFibHeights = function(fibLevels) {
	// Zero is necessary
	var heights = [0];
	for(var i = 0; i < (fibLevels.length - 1); i++) {
		// The +1 is to ensure the color bar covers the white line, tinting it
		heights.push(fibLevels[i + 1] - fibLevels[i] + 1);
	}
	return heights;
};

Modcharts.FibonacciLineTool.prototype.getYAxisValue = function(val) {
	var formatString = this.panel.yAxis.getFormatString(null, null, 5),
		formatValue = this.panel.yAxis.getFormatValue(this.panel.yAxis.scale[0].tickFormat(1, formatString)(val));
	return formatValue;
};

Modcharts.FibonacciLineTool.prototype.render = function() {
	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];
	if (!coords[0] || !coords[1]){
		return;
	}
	this.levelLines.x = coords[0][0];
	var ctx = this.panel.rootToolContext, i,
		upSlope = coords[0][1] < coords[1][1],
		val, prevVal,
		textPadding = -5,
		fibLevels = this.getLevels(coords[0][1], coords[1][1]);

	ctx.beginPath();
	ctx.font = "11px Arial";
	ctx.textAlign = "right";
	ctx.lineWidth = this.params.style.lineWidth;

	// When the retracement is rendered pointing left
	this.levelLines.isFlipped = (coords[1][0] - coords[0][0]) < 0;
	if(this.levelLines.isFlipped) {
		ctx.textAlign = "left";
		textPadding = 5;
	}

	// control line
	ctx.strokeStyle = "#ccc";
	ctx.setLineDash([2,3]);
	ctx.moveTo(coords[0][0], coords[0][1]);
	ctx.lineTo(coords[1][0], coords[1][1]);
	ctx.stroke();

	ctx.beginPath();

	// Reset line dashed setting back to solid
	ctx.setLineDash([]);

	var heights = this.getFibHeights(fibLevels),
		height, fillYValue, yAxisValue;

	// draw Fib lines
	for (i = 0; i < fibLevels.length; i++) {

		val = (upSlope) ? -fibLevels[i] : fibLevels[i];
		prevVal = (upSlope) ? -fibLevels[i - 1] : fibLevels[i - 1];

		ctx.fillStyle = this.fibSectionColors[i + 1];
		ctx.moveTo(coords[0][0], this.panel.px(coords[1][1] + val));
		height = heights[i];

		this.levelLines.y[i] = this.panel.px(coords[1][1] + val);

		// Change context for color bars so that opacity is not changed globally
		ctx.save();
		ctx.globalAlpha = this.COLOR_BAR_OPACITY;
		fillYValue = (upSlope) ?
			this.panel.px(coords[1][1] + prevVal - heights[i]) :
			this.panel.px(coords[1][1] + prevVal);

		if(this.levelLines.isFlipped) {
			ctx.lineTo(0, this.panel.px(coords[1][1] + val));
			ctx.fillRect(0, fillYValue, Math.abs(coords[0][0]), height);
		} else {
			ctx.lineTo((this.panel.size.width + this.panel.size.padding.left), this.panel.px(coords[1][1] + val));
			ctx.fillRect(coords[0][0], fillYValue, (this.panel.size.width + this.panel.size.padding.left + Math.abs(coords[0][0])), height);
		}
		ctx.restore();

		yAxisValue = this.getYAxisValue(this.panel.yAxis.scale[0].invert(this.panel.px(coords[1][1] + val)));

		ctx.fillText(
			this.thresholds[i] +
			"(" + yAxisValue + ")",
			coords[0][0] + textPadding,
			this.panel.px(coords[1][1] + val + 3)
		);
	}

	// Retracement lines
	ctx.save();
	ctx.strokeStyle = this.params.style.lineColor;
	ctx.globalAlpha = this.COLOR_BAR_OPACITY;
	ctx.stroke();
	ctx.restore();

	this.handle[0].render();
	this.handle[1].render();

	this.panel.core.onToolRender(this);
};

/**
 * Gann Fan tool
 * @constructor
 * @class GannFanLineTool
 * @extends LineTool
 */
Modcharts.GannFanLineTool = function(){};

Modcharts.Extend(Modcharts.GannFanLineTool, Modcharts.LineTool);

Modcharts.GannFanLineTool.prototype.getDefaultParams = function() {

	return {
		id: "gannfan",
		name: "Gann Fan",
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-gannfan", "color") || "#666",
			lineWidth: this.getStyle(".modcharts-tool-line-gannfan", "width") || 1,
			lineColor12: this.getStyle(".modcharts-tool-line-gannfan-12", "color") || "darkred",
			lineColor13: this.getStyle(".modcharts-tool-line-gannfan-13", "color") || "orange",
			lineColor14: this.getStyle(".modcharts-tool-line-gannfan-14", "color") || "#A8A800",
			lineColor18: this.getStyle(".modcharts-tool-line-gannfan-18", "color") || "darkgreen"
		}
	};
};

Modcharts.GannFanLineTool.prototype.render = function(){

	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	if (!coords[0] || !coords[1]){
		return;
	}

	var ctx = this.panel.rootToolContext,
		i,
		newX,
		newY,
		x1 = coords[0][0],
		y1 = coords[0][1],
		x2 = coords[1][0],
		y2 = coords[1][1],
		distX = x2 - x1,
		distY = y2 - y1,
		gannPct = [0.5, 0.333, 0.25, 0.125],
		gannColors = [this.params.style.lineColor12, this.params.style.lineColor13, this.params.style.lineColor14, this.params.style.lineColor18],
		gannLabelUp = ["2/1","3/1","4/1","8/1"],
		gannLabelDown = ["1/2","1/3","1/4","1/8"];

	ctx.lineWidth = this.params.style.lineWidth;
	ctx.font = "12px Arial";

	// 45 deg
	this.renderFan(ctx, this.params.style.lineColor, "1/1", x1, y1, x2, y2, x2 - x1, y2 - y1);

	ctx.textAlign = "left";

	for (i=0; i < gannPct.length; i++){

		newY = y2 - (distY - (distY * gannPct[i]));

		this.renderFan(ctx, gannColors[i], gannLabelUp[i], x1, y1, x2, newY, x2 - x1, newY - y1);

	}

	y2 = coords[1][1];

	ctx.textAlign = "right";

	for (i=0; i < gannPct.length; i++){

		newX = x2 - (distX - (distX * gannPct[i]));

		this.renderFan(ctx, gannColors[i], gannLabelDown[i], x1, y1, newX, y2, newX - x1, y2 - y1);

	}

	this.handle[0].render();
	this.handle[1].render();

	this.panel.core.onToolRender(this);

};

Modcharts.GannFanLineTool.prototype.renderFan = function(ctx, color, label, x1, y1, x2, y2, distX, distY){

	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();

	ctx.fillText(label, x2, y2);

	this.renderRay(ctx, x2, y2, distX, distY);
	ctx.stroke();
};

/**
 * Horizontal line tool
 * @constructor
 * @class HorizontalLineTool
 * @extends LineTool
 */
Modcharts.HorizontalLineTool = function(){};

Modcharts.Extend(Modcharts.HorizontalLineTool, Modcharts.LineTool);

Modcharts.HorizontalLineTool.prototype.getDefaultParams = function() {

	return {
		id: "horizontal",
		name: "Horizontal Line",
		lockVertical: true,
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-horizontal", "color") || "#ccc",
			lineWidth: this.getStyle(".modcharts-tool-line-horizontal", "width") || 1
		}
	};
};

/**
 * Ray tool
 * @constructor
 * @class RayLineTool
 * @extends LineTool
 */
Modcharts.RayLineTool = function(){};

Modcharts.Extend(Modcharts.RayLineTool, Modcharts.LineTool);

Modcharts.RayLineTool.prototype.getDefaultParams = function() {

	return {
		id: "ray",
		name: "Ray",
		extendRight: true,
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-ray", "color") || "#000",
			lineWidth: this.getStyle(".modcharts-tool-line-ray", "width") || 1
		}
	};
};

/**
 * Rectangle tool
 * @constructor
 * @class RectLineTool
 * @extends LineTool
 */
Modcharts.RectLineTool = function(){};

Modcharts.Extend(Modcharts.RectLineTool, Modcharts.LineTool);

Modcharts.RectLineTool.prototype.getDefaultParams = function() {

	return {
		id: "rect",
		name: "Rectangle",
		style : {
			lineColor: this.getStyle(".modcharts-tool-line-rect", "color") || "#000",
			lineWidth: this.getStyle(".modcharts-tool-line-rect", "width") || 1,
			fillColor: this.getStyle(".modcharts-tool-line-rect", "background-color") || "gold",
			fillOpacity: this.getStyle(".modcharts-tool-line-rect", "opacity") || 0.05
		}
	};
};

/**
 * define hitbox to be four edges of rectangle
 */
Modcharts.RectLineTool.prototype.isWithin = function(mousePanel){

	var handles = this.handle,
		hitboxSize = 10,
		halfSize = hitboxSize / 2;

	if (handles.length === 2){

		var coords = [handles[0].getCoords(), handles[1].getCoords()];

		if (!coords[0] || !coords[1]){
			return false;
		}

		// create a hitbox for each edge of the rectangle
		var boundingBox = {
			x: Math.min(coords[0][0], coords[1][0]),
			y: Math.min(coords[0][1], coords[1][1]),
			width: Math.abs(coords[0][0] - coords[1][0]),
			height: Math.abs(coords[0][1] - coords[1][1])
		},
		rectMouse = {x: mousePanel[0], y: mousePanel[1], width:1, height: 1 },
		rectLeft = {
			x: boundingBox.x - halfSize,
			y: boundingBox.y,
			width: hitboxSize,
			height: boundingBox.height
		},
		rectRight = {
			x: boundingBox.x + boundingBox.width - halfSize,
			y: boundingBox.y,
			width: hitboxSize,
			height: boundingBox.height
		},
		rectTop = {
			x: boundingBox.x,
			y: boundingBox.y - halfSize,
			width: boundingBox.width,
			height: hitboxSize
		},
		rectBottom = {
			x: boundingBox.x,
			y: boundingBox.y + boundingBox.height - halfSize,
			width: boundingBox.width,
			height: hitboxSize
		};

		// check intersection against all edges
		return this.intersect(rectLeft, rectMouse) ||
			this.intersect(rectRight, rectMouse) ||
			this.intersect(rectTop, rectMouse) ||
			this.intersect(rectBottom, rectMouse);

	}

};

Modcharts.RectLineTool.prototype.render = function(){

	var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	if (!coords[0] || !coords[1]){
		return;
	}

	var ctx = this.panel.rootToolContext;

	ctx.beginPath();

	ctx.strokeStyle = this.params.style.lineColor;
	ctx.lineWidth = this.params.style.lineWidth;

	// rectangle
	this.panel.rect(ctx, coords[0][0], coords[0][1], coords[1][0] - coords[0][0], coords[1][1] - coords[0][1]);

	if (this.params.style.fillColor !== "none") {

		ctx.fillStyle = this.params.style.fillColor;
		ctx.globalAlpha = this.params.style.fillOpacity;
		ctx.fill();
		ctx.globalAlpha = 1;

	}

	ctx.stroke();

	if (this.state.selected || this.state.hover) {
		this.handle[0].render();
		this.handle[1].render();
	}

	this.panel.core.onToolRender(this);
};

/**
 * Remove tool button
 * @constructor
 * @class RemoveButton
 * @extends Handle
 */
Modcharts.RemoveButton = function(tool, params){

	this.superclass.call(this, tool, params || {});

};

Modcharts.Extend(Modcharts.RemoveButton, Modcharts.Handle);

Modcharts.RemoveButton.prototype.onClick = function(){

	this.tool.remove();

	if (this.tool.button.config.el){
		this.tool.button.config.el.hide();
	}
};

Modcharts.RemoveButton.prototype.render = function(){

	if (this.tool.panel.core.state.toolmode !== null){

		var ctx = this.tool.panel.rootToolContext,
			size = (this.state.hover) ? 4 : 3;

		this.coords = this.tool.handle[0].getCoords();

		if (!this.coords){
			return;
		}

		this.coords[0] += 5;
		this.coords[1] -= 10;

		// circle
		ctx.fillStyle = "#fff";
		ctx.strokeStyle = "#333";
		ctx.beginPath();
		ctx.arc(this.coords[0] - (size / 2), this.coords[1] - (size / 2), size * 2 ,0 , 2 * Math.PI);
		ctx.fill();
		ctx.stroke();

		// text
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.font = "9px Arial";
		ctx.fillStyle = "#555";
		ctx.fillText("X", this.coords[0] - 2 , this.coords[1] + 2);
	}

};

/**
 * Snap Handle
 * @constructor
 * @class SnapHandle
 */
Modcharts.SnapHandle = function(panel) {

	this.panel = panel;
	this.params = this.getDefaultParams();

};

Modcharts.Extend(Modcharts.SnapHandle, Modcharts.Tool);

Modcharts.SnapHandle.prototype.getDefaultParams = function() {

	return {
		id: "snapHandle",
		name: "Snap Handle",
		style : {
			lineColor: this.getStyle(".modcharts-tool-snaphandle", "color") || "orange"
		}
	};
};

/**
 *
 */
Modcharts.SnapHandle.prototype.getCoords = function(mouse) {

	// get nearest date
	var panel = this.panel,
		core = panel.core,
		rulerIdx = Math.round(panel.xAxis.scale[0].invert(mouse[0])),
		snapDistance = 20,
		snapCoords = null,
		isOHLC = /candlestick|ohlc/.test(panel.indicators[0].params.markerType),
		yOpen, yHigh, yLow, distOpen, distHigh, distLow;

	if (core.exchangeDates[rulerIdx]){

		var dataIdx = core.getFilterUpper(core.dataPrimary, new Date(core.exchangeDates[rulerIdx]));

		if (core.dataPrimary[dataIdx]){

			var yScale = panel.yAxis.scale[0],
				searchData = [];

			// search the index to the left
			if (core.dataPrimary[dataIdx - 1]){
				searchData.push(core.dataPrimary[dataIdx - 1]);
			}

			// search the index to the right
			if (core.dataPrimary[dataIdx + 1]){
				searchData.push(core.dataPrimary[dataIdx + 1]);
			}

			// search main index
			searchData.push(core.dataPrimary[dataIdx]);

			// search for the closest point of up to 3 ohlc sets
			for (var x=0; x < searchData.length; x++){

				// get OHLC coords
				var yClose = yScale(searchData[x].close),
					xData = panel.xAxis.scale[0](core.closestExchangeIndex(searchData[x].date)),
					distClose = this.distance(mouse, [xData, yClose]),
					min = distClose;

				if (isOHLC){

					yOpen = yScale(searchData[x].open);
					yHigh = yScale(searchData[x].high);
					yLow = yScale(searchData[x].low);

					distOpen = this.distance(mouse, [xData, yOpen]);
					distHigh = this.distance(mouse, [xData, yHigh]);
					distLow = this.distance(mouse, [xData, yLow]);

					min = Math.min(min, distOpen, distHigh, distLow, distClose);
				}

				// when close enough, snap to closest ohlc point
				if (min < snapDistance){

					if (min === distClose){
						snapCoords = [xData, yClose];
					}

					if (isOHLC){

						if (min === distHigh){
							snapCoords = [xData, yHigh];
						} else if (min === distLow){
							snapCoords = [xData, yLow];
						} else if (min === distOpen){
							snapCoords = [xData, yOpen];
						}
					}
				}
			}
		}
	}

	return snapCoords;
};

Modcharts.SnapHandle.prototype.distance = function(coord1, coord2){

	var xs = coord2[0] - coord1[0],
		ys = coord2[1] - coord1[1];

	xs *= xs;
	ys *= ys;

	return Math.sqrt(xs + ys);
};

Modcharts.SnapHandle.prototype.render = function(mouse){

	if (this.renderCustom){
		return this.renderCustom(mouse);
	}

	this.coords = this.getCoords(mouse);

	if (this.coords){

		var panel = this.panel,
			ctx = panel.rootToolContext,
			size = 2;

		ctx.beginPath();
		ctx.lineWidth = 1;
		ctx.strokeStyle = this.params.style.lineColor;

		ctx.arc(this.coords[0] - (size / 2) + 1, this.coords[1] - (size / 2) + 1, size * 2, 0, 2*Math.PI);
		ctx.stroke();
	}
};

/**
 * Text tool
 * @constructor
 * @class TextTool
 * @extends Tool
 */
Modcharts.TextTool = function(args){

	this.superclass.call(this, args);
	this.offsetX = 10;
	this.offsetY = 4;

};

Modcharts.Extend(Modcharts.TextTool, Modcharts.Tool);

Modcharts.TextTool.prototype.getDefaultParams = function() {

	return {
		id: "text",
		name: "Text",
		value: "",
		style : {
			fontFamily: this.getStyle(".modcharts-tool-text", "font-family") || "Arial, Helvetica, sans-serif",
			fontColor: this.getStyle(".modcharts-tool-text", "color") || "#777777",
			fontSize: this.getStyle(".modcharts-tool-text", "font-size") || 14,
			lineHeight: this.getStyle(".modcharts-tool-text", "line-height") || 1.35, // note: multiple of fontSize
			width: this.getStyle(".modcharts-tool-text", "width") || 250,
			height: this.getStyle(".modcharts-tool-text", "height") || 100,
			boundingBoxLineColor: "rgba(216,254,249,0.4)",
			boundingBoxPenPxOn: 1,
			boundingBoxPenPxOff: 2
		}
	};
};

Modcharts.TextTool.prototype.onClickCanvas = function(mouse){

	if (!this.handle.length){

		var mousePanel = [mouse[0], mouse[1] - this.panel.size.top];

		// first click - create first handle
		this.handle[0] = this.createHandle(mousePanel);
		this.handle[0].state.visible = true;

		// create second handle
		this.handle[1] = this.createHandle([mousePanel[0] + this.params.style.width, mousePanel[1] + this.params.style.height]);
		this.handle[1].state.visible = true;

		this.handle[1].params.date = null;
		this.handle[1].params.value = null;
		this.handle[1].params.pairedHandle = 0;
		this.handle[1].params.pairedOffsetX = this.params.style.width;
		this.handle[1].params.pairedOffsetY = this.params.style.height;

		var self = this;

		window.setTimeout(function(){

			// pop open params window and select text
			self.configTool();

			if (self.elConfig){
				self.elConfig.find("[paramid='value']").select();
			}

		}, 100);

	}

	this.state.inProgressHandle = true;
	this.onComplete();

};

Modcharts.TextTool.prototype.onMousemove = function(mouse){

	var mousePanel = [mouse[0], mouse[1] - this.panel.size.top],
		idx = Math.round(this.panel.xAxis.scale[0].invert(mousePanel[0])),
		isLeft = this.state.dragHandle === this.handle[0],
		isRight = this.state.dragHandle === this.handle[1];

	if (isLeft){ // dragging nw handle

		if (this.panel.core.exchangeDates[idx]){

			this.state.dragHandle.params.date = this.panel.core.exchangeDates[idx];
			this.state.dragHandle.params.value = this.panel.yAxis.scale[0].invert(mousePanel[1]);

		}

	} else if (isRight){ // dragging se handle

		var pairedCoords = this.handle[this.state.dragHandle.params.pairedHandle].getCoords();

		if (!pairedCoords){
			return;
		}

		this.state.dragHandle.params.pairedOffsetX = mousePanel[0] - pairedCoords[0];
		this.state.dragHandle.params.pairedOffsetY = mousePanel[1] - pairedCoords[1];

		var coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

		this.params.style.width = Math.round(coords[1][0] - coords[0][0]);
		this.params.style.height = Math.round(coords[1][1] - coords[0][1]);

	} else if (this.isWithin(mousePanel)){ // dragging full tool

		this.dragTool(mousePanel);

	}

};

/**
 * define hitbox to be full rectangle of text tool bounding box
 */
Modcharts.TextTool.prototype.isWithin = function(mousePanel){

	var handles = this.handle;

	if (handles.length === 2){

		var coords = [handles[0].getCoords(), handles[1].getCoords()];

		if (!coords[0] || !coords[1]){
			return false;
		}

		var r1 = {
			x: Math.min(coords[0][0], coords[1][0]),
			y: Math.min(coords[0][1], coords[1][1]),
			width: Math.abs(coords[0][0] - coords[1][0]),
			height: Math.abs(coords[0][1] - coords[1][1])
		};

		var r2 = {x: mousePanel[0], y: mousePanel[1], width:1, height: 1 };

		return this.intersect(r1, r2);
	}
};

Modcharts.TextTool.prototype.render = function(){

	this.handle[0].render();
	this.handle[1].render();

	// special chars
	this.params.value = this.params.value
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&gt;/g, ">")
		.replace(/&lt;/g, "<")
		.replace(/\n/g, " <br/> ");

	var ctx = this.panel.rootToolContext,
		isBreak = false,
		coords = [this.handle[0].getCoords(), this.handle[1].getCoords()], x=0, y=0, width, word,
		words = this.params.value.split(/\s/);

	if (!coords[0] || !coords[1]){
		return;
	}

	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = this.params.style.fontSize + "px " + this.params.style.fontFamily;
	ctx.strokeStyle = this.params.style.lineColor;
	ctx.fillStyle = this.params.style.fontColor;
	ctx.lineWidth = this.params.style.lineWidth;

	ctx.beginPath();

	// clip the text we're about to draw to the coords rectangle
	ctx.rect(coords[0][0], coords[0][1], coords[1][0] - coords[0][0], coords[1][1] - coords[0][1]);

	ctx.save();
	ctx.clip();

	for (var i=0; i < words.length; i++){

		word = words[i];

		isBreak = word === "<br/>";

		width = ctx.measureText(word + " ").width;

		// increment to next line
		if (isBreak || x + width + this.offsetX > this.params.style.width){
			x = 0;
			y++;
		}

		if (isBreak){
			continue;
		}

		ctx.fillText(word, coords[0][0] + this.offsetX + x, coords[0][1] + this.offsetY + (y * (this.params.style.lineHeight * this.params.style.fontSize) ));

		x += width;
	}

	ctx.restore();

	if (this.state.selected || this.state.hover){
		this.renderBoundingBox();
	}

	this.panel.core.onToolRender(this);

};

/**
 * render dotted line around bounding box
 */
Modcharts.TextTool.prototype.renderBoundingBox = function(){

	var ctx = this.panel.rootToolContext,
		coords = [this.handle[0].getCoords(), this.handle[1].getCoords()];

	ctx.beginPath();
	ctx.strokeStyle = this.params.style.boundingBoxLineColor;

	if (ctx.setLineDash){
		ctx.setLineDash([this.params.style.boundingBoxPenPxOn, this.params.style.boundingBoxPenPxOff]);
	}

	this.panel.rect(
		ctx,
		coords[0][0],
		coords[0][1],
		coords[1][0] - coords[0][0],
		coords[1][1] - coords[0][1]
	);

	ctx.stroke();

	if (ctx.setLineDash){
		ctx.setLineDash([]);
	}

};

// export as AMD module / Node module / browser or worker variable

if (typeof ModchartsModulePattern === "string") { // allow manual override

	if (ModchartsModulePattern === "amd" && typeof define === "function" && define.amd) { // AMD/RequireJS

		define(function() { return Modcharts; });

	} else if (window.ModchartsModulePattern === "commonjs" && typeof module !== "undefined") { // Node/CommonJS

		module.exports = Modcharts;

	} else { // "window"

		window.Modcharts = Modcharts;

	}

} else if (typeof define === "function" && define.amd) { // AMD/RequireJS

	define(function() { return Modcharts; });

} else if (typeof module !== "undefined") { // Node/CommonJS

	module.exports = Modcharts;

} else if (typeof self !== "undefined") {

	self.Modcharts = Modcharts;

} else {

	window.Modcharts = Modcharts;
}

}(window.jQuery));
