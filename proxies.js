const { readFileSync } = require('fs');

class Proxies {
	constructor(log) {
		this.log = log;
		this.proxies = readFileSync('proxies.txt', 'utf8').trim().replace(/\r/g, '').split('\n');
		this.reports = {};
	}

	getProxy() {
		if (this.proxies.length === 0) return null;
		const proxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
		return proxy;
	}

	reportProxy(proxy) {
		if (!this.reports[proxy]) this.reports[proxy] = 0;
		this.reports[proxy] += 1;
		this.log.warn(`Proxy at ${proxy} has failed (${this.reports[proxy]}/3)`);
		if (this.reports[proxy] === 3) {
			this.log.warn(`Removing proxy at ${proxy}`);
			this.proxies = this.proxies.filter(p => p !== proxy);
		}
	}
}

module.exports = Proxies;