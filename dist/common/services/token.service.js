"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config/config");
const enums_1 = require("../enums");
const exceptions_1 = require("../exceptions");
const redis_service_1 = require("./redis.service");
const model_1 = require("../../DB/model");
const node_crypto_1 = require("node:crypto");
const repository_1 = require("../../DB/repository");
class TokenService {
    redis;
    userRepository;
    constructor() {
        this.redis = redis_service_1.redisService;
        this.userRepository = new repository_1.UserRepository(model_1.UserModel);
    }
    async generateToken({ payload, secret = config_1.USER_TOKEN_SECRET_KEY, options }) {
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    async verifyToken({ token, secret = config_1.USER_TOKEN_SECRET_KEY, }) {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    async getTokenSignature(role) {
        let accessSignature;
        let refreshSignature;
        let audience = enums_1.AudienceEnum.USER;
        switch (role) {
            case enums_1.RoleEnum.ADMIN:
                accessSignature = config_1.SYSTEM_TOKEN_SECRET_KEY;
                audience = enums_1.AudienceEnum.SYSTEM;
                refreshSignature = config_1.SYSTEM_REFRESH_TOKEN_SECRET_KEY;
                break;
            default:
                accessSignature = config_1.USER_TOKEN_SECRET_KEY;
                audience = enums_1.AudienceEnum.USER;
                refreshSignature = config_1.USER_REFRESH_TOKEN_SECRET_KEY;
                break;
        }
        return { accessSignature, refreshSignature, audience };
    }
    ;
    async getSignatureLevel(audienceType) {
        let signatureLevel = enums_1.RoleEnum.USER;
        switch (audienceType) {
            case enums_1.AudienceEnum.SYSTEM:
                signatureLevel = enums_1.RoleEnum.ADMIN;
                break;
            default:
                signatureLevel = enums_1.RoleEnum.USER;
                break;
        }
        return signatureLevel;
    }
    ;
    async decodeToken({ token, tokenType = enums_1.TokenTypeEnum.ACCESS, }) {
        const decode = jsonwebtoken_1.default.decode(token);
        if (!decode?.aud?.length) {
            throw new exceptions_1.BadRequestException("Fail to decoded this token aud is required");
        }
        const [decodeTokenType, audienceType] = decode.aud;
        if (decodeTokenType != tokenType) {
            throw new exceptions_1.BadRequestException(`invalid token type`);
        }
        if (decode.jti &&
            (await this.redis.get(this.redis.revokeTokenKey({
                userId: decode.sub,
                jti: decode.jti
            })))) {
            throw new exceptions_1.UnAuthorizedException("Invalid Login Session");
        }
        const signatureLevel = await this.getSignatureLevel(audienceType);
        const { accessSignature, refreshSignature } = await this.getTokenSignature(signatureLevel);
        const verifyData = await this.verifyToken({
            token,
            secret: tokenType == enums_1.TokenTypeEnum.REFRESH ? refreshSignature : accessSignature,
        });
        const user = await this.userRepository.findOne({
            filter: { _id: verifyData.sub },
        });
        if (!user) {
            throw new exceptions_1.UnAuthorizedException("Not Register account");
        }
        if (user.changeCredentialsTime &&
            user.changeCredentialsTime?.getTime() >= decode.iat * 1000) {
            throw new exceptions_1.UnAuthorizedException("Invalid Login Session");
        }
        return { user, decode };
    }
    ;
    async createLoginCredentials({ user, issuer }) {
        const { accessSignature, refreshSignature, audience } = await this.getTokenSignature(user.role);
        const jwtid = (0, node_crypto_1.randomUUID)();
        const access_token = await this.generateToken({
            payload: { sub: user._id },
            secret: accessSignature,
            options: {
                issuer,
                audience: [enums_1.TokenTypeEnum.ACCESS, audience],
                expiresIn: config_1.ACCESS_EXPIRE_IN,
                jwtid,
            },
        });
        const refresh_token = await this.generateToken({
            payload: { sub: user._id },
            secret: refreshSignature,
            options: {
                issuer,
                audience: [enums_1.TokenTypeEnum.REFRESH, audience],
                expiresIn: config_1.REFRESH_EXPIRE_IN,
                jwtid,
            },
        });
        return { access_token, refresh_token };
    }
    ;
    async createRevokeToken({ userId, jti, ttl }) {
        await this.redis.set({
            key: this.redis.revokeTokenKey({ userId, jti }),
            value: jti,
            ttl,
        });
    }
    ;
}
exports.TokenService = TokenService;
