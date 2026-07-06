const redis = require("redis")
require("dotenv").config()

class RedisUtils {

    constructor() {
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL
        })

        this.redisClient.on("error", (err) => {
            console.error("Redis client error:", err.message)
        })

        this.connectPromise = this.redisClient.connect()
            .then(() => console.log("Connected to Redis!"))
            .catch((error) => {
                console.error("Error while connecting to Redis:", error)
            })
    }

    async _ensureConnected() {
        await this.connectPromise
    }

    async createEntry(key, field, ttl) {
        await this._ensureConnected()
        await this.redisClient.zAdd(key, { score: 0, value: field })
        await this.redisClient.expire(key, ttl)
    }

    async addEntry(key, field) {
        await this._ensureConnected()
        await this.redisClient.zAdd(key, { score: 0, value: field })
    }

    async incrementScore(key, field, score) {
        await this._ensureConnected()
        await this.redisClient.zIncrBy(key, score, field)
    }

    async createTodaysKey(key, field, score, ttl) {
        await this._ensureConnected()
        await this.redisClient.zAdd(key, { score: score, value: field })
        await this.redisClient.expire(key, ttl)
    }

    async getAllEntries(key, end) {
        await this._ensureConnected()
        return await this.redisClient.zRangeWithScores(key, 0, end, { REV: true })
    }

    async deleteEntry(key) {
        await this._ensureConnected()
        await this.redisClient.del(key)
    }
}

// Singleton — created once when the module is first required
module.exports = RedisUtils