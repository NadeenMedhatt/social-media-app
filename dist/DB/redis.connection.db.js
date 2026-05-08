"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const config_1 = require("../config/config");
exports.redisClient = (0, redis_1.createClient)({ url: config_1.REDIS_URI });
const connectRedis = async () => {
    try {
        await exports.redisClient.connect();
        console.log('redis_db connected');
    }
    catch (error) {
        console.log(`fail to connect on redis_db, ${error}`);
    }
};
exports.connectRedis = connectRedis;
