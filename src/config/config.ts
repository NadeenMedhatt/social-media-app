import { config } from "dotenv"
import { resolve } from "node:path"

config({ path: resolve(`./.env.${process.env.NODE_ENV || "development"}`) });



export const PORT = process.env.PORT || 3000;
export const DB_URI = process.env.DB_URI as string;

export const REDIS_URI = process.env.REDIS_URI as string;

export const CRYPTO_SECRET = process.env.CRYPTO_SECRET as string;
export const SYSTEM_TOKEN_SECRET_KEY = process.env.SYSTEM_TOKEN_SECRET_KEY as string;
export const USER_TOKEN_SECRET_KEY = process.env.USER_TOKEN_SECRET_KEY as string;
export const SYSTEM_REFRESH_TOKEN_SECRET_KEY =
    process.env.SYSTEM_REFRESH_TOKEN_SECRET_KEY as string;
export const USER_REFRESH_TOKEN_SECRET_KEY =
    process.env.USER_REFRESH_TOKEN_SECRET_KEY as string;
export const ACCESS_EXPIRE_IN = parseInt(process.env.ACCESS_EXPIRE_IN as string);
export const REFRESH_EXPIRE_IN = parseInt(process.env.REFRESH_EXPIRE_IN as string);
export const CLIENT_IDS = process.env.CLIENT_IDS.split(",")||[];
export const EMAIL_APP = process.env.EMAIL_APP as string;
export const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD as string;
export const APP_NAME = process.env.APP_NAME as string;
export const FACEBOOK_LINK = process.env.FACEBOOK_LINK as string;
export const INSTAGRAM_LINK = process.env.INSTAGRAM_LINK as string;
export const TWITTER_LINK = process.env.TWITTER_LINK as string;
export const IV_LENGTH = parseInt(process.env.IV_LENGTH as string) || 16;
export const ENC_SECRET_KEY = process.env.ENC_SECRET_KEY as string;

export const SALT_ROUND = parseInt(process.env.SALT_ROUND as string ?? "10");


export const AWS_REGION = process.env.AWS_REGION as string;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY as string;
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME as string;
export const AWS_EXPIRES_IN = parseInt(process.env.AWS_EXPIRES_IN as string);
