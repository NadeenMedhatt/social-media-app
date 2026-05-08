"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = void 0;
const redis_1 = require("redis");
const config_1 = require("../../config/config");
const enums_1 = require("../enums");
class RedisService {
    client;
    constructor() {
        this.client = (0, redis_1.createClient)({ url: config_1.REDIS_URI });
        this.handelEvents();
    }
    handelEvents() {
        this.client.on("error", (error) => console.log(`Fail to connect on redis ${error}`));
        this.client.on("connect", () => console.log("redis connected"));
    }
    async connect() {
        await this.client.connect();
    }
    revokeTokenKeyPrefix = (userId) => {
        return `user:RevokeToken:${userId.toString()}`;
    };
    revokeTokenKey({ userId, jti }) {
        return `${this.revokeTokenKeyPrefix(userId)}:${jti}`;
    }
    ;
    otpKey = ({ email, subject = enums_1.EmailEnum.ConfirmEmail }) => {
        return `OTP::User::${email}::${subject}`;
    };
    maxAttemptOtpKey({ email, subject = enums_1.EmailEnum.ConfirmEmail }) {
        return `${this.otpKey({ email, subject })}::MaxTrial`;
    }
    ;
    blockOtpKey({ email, subject = enums_1.EmailEnum.ConfirmEmail }) {
        return `${this.otpKey({ email, subject })}::Block`;
    }
    ;
    async set({ key, value, ttl = undefined }) {
        try {
            const data = typeof value === "string" ? value : JSON.stringify(value);
            console.log({ data, ttl });
            ttl ? await this.client.setEx(key, ttl, data) : await this.client.set(key, data);
            return;
        }
        catch (error) {
            console.error("Redis SET error:", error);
            return;
        }
    }
    ;
    async get(key) {
        try {
            const data = await this.client.get(key);
            if (!data)
                return null;
            try {
                return JSON.parse(data);
            }
            catch {
                return data;
            }
        }
        catch (error) {
            console.error("Redis GET error:", error);
            return;
        }
    }
    ;
    async mGet(keys) {
        try {
            return await this.client.mGet(keys);
        }
        catch (error) {
            console.error("Redis GET error:", error);
            return;
        }
    }
    ;
    async update({ key, value, ttl }) {
        try {
            const exists = await this.client.exists(key);
            if (!exists)
                return false;
            return await this.set({ key, value, ttl });
        }
        catch (error) {
            console.error("Redis UPDATE error:", error);
            return false;
        }
    }
    ;
    async deleteKey(keys) {
        try {
            if (!keys?.length) {
                return 0;
            }
            const result = await this.client.del(keys);
            return result === 1;
        }
        catch (error) {
            console.error("Redis DELETE error:", error);
            return;
        }
    }
    ;
    async exists(key) {
        try {
            return await this.client.exists(key);
        }
        catch (error) {
            console.error("Redis EXITS error:", error);
            return;
        }
    }
    ;
    async incr(key) {
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            console.error("Redis incr error:", error);
            return false;
        }
    }
    ;
    async expire({ key, ttl }) {
        try {
            const result = await this.client.expire(key, ttl);
            return result === 1;
        }
        catch (error) {
            console.error("Redis EXPIRE error:", error);
            return false;
        }
    }
    ;
    async ttl(key) {
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            console.error("Redis TTL error:", error);
            return -2;
        }
    }
    ;
    async allKeysByPrefix(baseKey) {
        try {
            return await this.client.keys(baseKey);
        }
        catch (error) {
            console.error("Redis TTL error:", error);
            return [];
        }
    }
    ;
    FCM_key(userId) {
        return `user:FCM:${userId}`;
    }
    async addFCM(userId, FCMToken) {
        return await this.client.sAdd(this.FCM_key(userId), FCMToken);
    }
    async removeFCM(userId, FCMToken) {
        return await this.client.sRem(this.FCM_key(userId), FCMToken);
    }
    async getFCMs(userId) {
        return await this.client.sMembers(this.FCM_key(userId));
    }
    async hasFCMs(userId) {
        return await this.client.sCard(this.FCM_key(userId));
    }
    async removeFCMUser(userId) {
        return await this.client.del(this.FCM_key(userId));
    }
}
exports.RedisService = RedisService;
exports.redisService = new RedisService();
