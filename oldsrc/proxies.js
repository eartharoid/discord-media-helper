const { readFileSync } = require('fs');
const log = require('./logger');

class Proxies {
	constructor() {
		this.proxies = readFileSync('config/proxies.txt', 'utf8').trim().replace(/\r/g, '').split('\n');
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
		log.warn(`Proxy at ${proxy} has failed (${this.reports[proxy]}/3)`);
		if (this.reports[proxy] === 3) {
			log.warn(`Removing proxy at ${proxy}`);
			this.proxies = this.proxies.filter(p => p !== proxy);
		}
	}
}

module.exports = new Proxies();