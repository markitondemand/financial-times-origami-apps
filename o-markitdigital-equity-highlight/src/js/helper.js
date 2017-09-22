const config = require("../../demos/src/demo.json");

module.exports = {
    getBaseUrl: function(env) {
		env = env === null ? 'local' : env;
		switch (env) {
			case 'localhost': return {
                'url': "//localhost/financialtimes",
                'sourceKey': config.sourceKey[env]
            };
				break;
			case 'acceptance': return {
                'url': "//ft.wsodqa.com",
                'sourceKey': config.sourceKey[env]
            };
				break;
			case 'production':
			default:
				return {
                    'url': "//markets.ft.com"
                };
				break;
		}
	},
    getFormatColorClass: function(val) {
		return parseFloat(val) >= 0 ? "mod-format--pos" : "mod-format--neg";
	},
	validateResponse: function(resp) {
		return (resp !== null && resp.data !== null && resp.data.items !== null && resp.data.items.length > 0);
	}
};