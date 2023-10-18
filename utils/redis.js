import { promisify } from 'util';
import { createClient } from 'redis';

/**
* RedisClient class
*/
class RedisClient {
  constructor() {
    this.client = createClient();
    this.isClientConnected = true;
    this.client.on('error', (err) => {
      console.error('Redis client failed to connect', err.message || err.toString());
      this.isClientConnected = false;
    });

    this.client.on('connect', () => {
      this.isClientConnected = true;
    });
  }

  /**
  * Checks if the connection to redis server is active
  * @returns {boolean}
  */
  isAlive() {
    return this.isClientConnected;
  }

  /**
  * Retrives value of given redis key
  * @param {String} the key for item to retrive
  * @returns {String | Object}
  */
  async get(key) {
    return promisify(this.client.GET).bind(this.client)(key);
  }

  /**
  * Sets a value of a given redis key within given duration
  * @param {String} key to of the item to store
  * @param {String} value to store
  * @param {Number} Expiration time in seconds
  * @returns {Promise<void>}
  */
  async set(key, value, duration) {
    await promisify(this.client.SETEX).bind(this.client)(key, duration, value);
  }

  /**
  * Delete a value of given key
  * @param {String} key of the item to remove
  * @returns {Promise<Void>}
  */
  async del(key) {
    await promisify(this.client.DEL).bind(this.client)(key);
  }
}
const redisClient = new RedisClient();
module.exports = redisClient;
