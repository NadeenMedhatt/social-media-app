import { createClient, RedisClientType } from "redis";
import { REDIS_URI } from "../../config/config";
import { Types } from "mongoose";
import { EmailEnum } from "../enums";

type BaseKeyType = { email: string, subject: EmailEnum };
export class RedisService {
    private client: RedisClientType;
    constructor() {
        this.client = createClient({ url: REDIS_URI });
        this.handelEvents();
    }

    private handelEvents() {
        this.client.on("error", (error) => console.log(`Fail to connect on redis ${error}`))
        this.client.on("connect", () => console.log("redis connected"))
    }


    public async connect() {
        await this.client.connect();
        // console.log("redis connected");

    }

    revokeTokenKeyPrefix = (userId: Types.ObjectId | string): string => {
        return `user:RevokeToken:${userId.toString()}`;
    };
    revokeTokenKey({ userId, jti }: { userId: Types.ObjectId | string, jti: string }): string {
        return `${this.revokeTokenKeyPrefix(userId)}:${jti}`;
    };
    otpKey = ({ email, subject = EmailEnum.ConfirmEmail }: BaseKeyType): string => {
        return `OTP::User::${email}::${subject}`;
    };
    maxAttemptOtpKey({ email, subject = EmailEnum.ConfirmEmail }: BaseKeyType): string {
        return `${this.otpKey({ email, subject })}::MaxTrial`;
    };
    blockOtpKey({ email, subject = EmailEnum.ConfirmEmail }: BaseKeyType): string {
        return `${this.otpKey({ email, subject })}::Block`;
    };
    async set({ key, value, ttl = undefined }: { key: string, value: any, ttl?: number | undefined }): Promise<void> {
        try {
            const data = typeof value === "string" ? value : JSON.stringify(value);

            console.log({ data, ttl });
            ttl ? await this.client.setEx(key, ttl, data) : await this.client.set(key, data);
            // ttl ? await this.client.set(key, data, { EX: ttl }) : await this.client.set(key, data);
            return;

        } catch (error) {
            console.error("Redis SET error:", error);
            // return false;
            return;
        }
    };




    async get(key: string) {
        try {
            const data = await this.client.get(key);
            if (!data) return null;

            try {
                return JSON.parse(data as string);
            } catch {
                return data;
            }
        } catch (error) {
            console.error("Redis GET error:", error);
            return;
        }
    };

    async mGet(keys: string[]) {
        try {
            return await this.client.mGet(keys);
        } catch (error) {
            console.error("Redis GET error:", error);
            return;
        }
    };

    async update({ key, value, ttl }: { key: string, value: any, ttl?: number }) {
        try {
            const exists = await this.client.exists(key);
            if (!exists) return false;
            return await this.set({ key, value, ttl });
        } catch (error) {
            console.error("Redis UPDATE error:", error);
            return false;
        }
    };

    async deleteKey(keys: string | string[]) {
        try {

            if (!keys?.length) {
                return 0;
            }
            const result = await this.client.del(keys);
            return result === 1;
        } catch (error) {
            console.error("Redis DELETE error:", error);
            return;
        }
    };
    async exists(key: string) {
        try {
            return await this.client.exists(key);
        } catch (error) {
            console.error("Redis EXITS error:", error);
            return;
        }
    };
    async incr(key: string) {
        try {
            return await this.client.incr(key);
        } catch (error) {
            console.error("Redis incr error:", error);
            return false;
        }
    };

    async expire({ key, ttl }: { key: string, ttl: number }) {
        try {
            const result = await this.client.expire(key, ttl);
            return result === 1;
        } catch (error) {
            console.error("Redis EXPIRE error:", error);
            return false;
        }
    };

    async ttl(key: string): Promise<number> {
        try {
            return await this.client.ttl(key);
        } catch (error) {
            console.error("Redis TTL error:", error);
            return -2;
        }
    };

    async allKeysByPrefix(baseKey: string): Promise<string[]> {
        try {
            return await this.client.keys(baseKey);
        } catch (error) {
            console.error("Redis TTL error:", error);
            return [];
        }
    };

    FCM_key(userId: Types.ObjectId | string) {
        return `user:FCM:${userId}`;
    }
    async addFCM(userId: Types.ObjectId | string, FCMToken: string) {
        return await this.client.sAdd(this.FCM_key(userId), FCMToken);
    }

    async removeFCM(userId: Types.ObjectId | string, FCMToken: string) {
        return await this.client.sRem(this.FCM_key(userId), FCMToken);
    }

    async getFCMs(userId: Types.ObjectId | string) {
        return await this.client.sMembers(this.FCM_key(userId));
    }

    async hasFCMs(userId: Types.ObjectId | string) {
        return await this.client.sCard(this.FCM_key(userId));
    }

    async removeFCMUser(userId: Types.ObjectId | string) {
        return await this.client.del(this.FCM_key(userId));
    }


}

export const redisService = new RedisService();
