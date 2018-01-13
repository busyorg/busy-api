const _ = require('lodash');

module.exports = class Cache {
  constructor() {
    this.cache = {};
  }

  get(namespace, key) {
    const encodedKey = new Buffer(JSON.stringify(key)).toString('base64');
    if (_.has(this.cache, `${namespace}.${encodedKey}`)) {
      return this.cache[namespace][encodedKey];
    } else {
      return false;
    }
  }

  set(namespace, key, data) {
    const encodedKey = new Buffer(JSON.stringify(key)).toString('base64');
    if (!_.has(this.cache, namespace)) {
      this.cache[namespace] = {};
    }
    this.cache[namespace][encodedKey] = data;
  }
};
