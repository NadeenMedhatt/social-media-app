import jwt, { JwtPayload, SignOptions } from "jsonwebtoken"
import { ACCESS_EXPIRE_IN, REFRESH_EXPIRE_IN, SYSTEM_REFRESH_TOKEN_SECRET_KEY, SYSTEM_TOKEN_SECRET_KEY, USER_REFRESH_TOKEN_SECRET_KEY, USER_TOKEN_SECRET_KEY } from "../../config/config"
import { AudienceEnum, RoleEnum, TokenTypeEnum } from "../enums";
import { BadRequestException, UnAuthorizedException } from "../exceptions";
import { redisService, RedisService } from "./redis.service";
import { UserModel } from "../../DB/model";
import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { UserRepository } from "../../DB/repository";

export class TokenService {

    private redis: RedisService
    private userRepository: UserRepository

    constructor() {
        this.redis = redisService;
        this.userRepository = new UserRepository(UserModel);

    }
    async generateToken({
        payload,
        secret = USER_TOKEN_SECRET_KEY,
        options
    }: {
        payload: object,
        secret?: string,
        options?: SignOptions
    }): Promise<string> {
        return jwt.sign(payload, secret, options);
    }

    async verifyToken({
        token,
        secret = USER_TOKEN_SECRET_KEY,
    }: {
        token: string,
        secret?: string,
    }): Promise<JwtPayload> {
        return jwt.verify(token, secret) as JwtPayload;


    }
    async getTokenSignature(role: RoleEnum): Promise<{ accessSignature: string, refreshSignature: string, audience: AudienceEnum }> {
        let accessSignature: string;
        let refreshSignature: string;
        let audience = AudienceEnum.USER;


        switch (role) {
            case RoleEnum.ADMIN:
                accessSignature = SYSTEM_TOKEN_SECRET_KEY;
                audience = AudienceEnum.SYSTEM;
                refreshSignature = SYSTEM_REFRESH_TOKEN_SECRET_KEY;
                break;

            default:
                accessSignature = USER_TOKEN_SECRET_KEY;
                audience = AudienceEnum.USER;
                refreshSignature = USER_REFRESH_TOKEN_SECRET_KEY;
                break;
        }
        return { accessSignature, refreshSignature, audience };
    };
    async getSignatureLevel(audienceType: AudienceEnum): Promise<RoleEnum> {
        let signatureLevel = RoleEnum.USER;
        switch (audienceType) {
            case AudienceEnum.SYSTEM:
                signatureLevel = RoleEnum.ADMIN;
                break;
            default:
                signatureLevel = RoleEnum.USER;
                break;
        }
        return signatureLevel;
    };


    async decodeToken({
        token,
        tokenType = TokenTypeEnum.ACCESS,
    }: {
        token: string,
        tokenType: TokenTypeEnum
    }): Promise<{
        user: HydratedDocument<IUser>,
        decode: JwtPayload
    }> {
        const decode = jwt.decode(token) as JwtPayload;

        if (!decode?.aud?.length) {
            throw new BadRequestException("Fail to decoded this token aud is required",
            );
        }
        const [decodeTokenType, audienceType] = decode.aud;
        if (decodeTokenType as unknown as TokenTypeEnum != tokenType) {
            throw new BadRequestException(`invalid token type`);
        }
        if (
            decode.jti &&
            (await this.redis.get(this.redis.revokeTokenKey({
                userId: decode.sub as string,
                jti: decode.jti
            })))
        ) {
            throw new UnAuthorizedException("Invalid Login Session");
        }

        const signatureLevel = await this.getSignatureLevel(audienceType as unknown as AudienceEnum);
        const { accessSignature, refreshSignature } =
            await this.getTokenSignature(signatureLevel);

        const verifyData = await this.verifyToken({
            token,
            secret:
                tokenType == TokenTypeEnum.REFRESH ? refreshSignature : accessSignature,
        });
        const user = await this.userRepository.findOne({
            filter: { _id: verifyData.sub },
        });
        if (!user) {
            throw new UnAuthorizedException("Not Register account");
        }

        if (
            user.changeCredentialsTime &&
            user.changeCredentialsTime?.getTime() >= (decode.iat as number) * 1000
        ) {
            throw new UnAuthorizedException("Invalid Login Session");
        }

        return { user, decode };
    };

    async createLoginCredentials({
        user,
        issuer
    }: {
        user: HydratedDocument<IUser>,
        issuer: string
    }): Promise<{
        access_token: string,
        refresh_token: string
    }> {
        const { accessSignature, refreshSignature, audience } =
            await this.getTokenSignature(user.role);

        const jwtid = randomUUID();
        const access_token = await this.generateToken({
            payload: { sub: user._id },
            secret: accessSignature,
            options: {
                issuer,
                audience: [TokenTypeEnum.ACCESS as unknown as string, audience as unknown as string],
                expiresIn: ACCESS_EXPIRE_IN,
                jwtid,
            },
        });
        const refresh_token = await this.generateToken({
            payload: { sub: user._id },
            secret: refreshSignature,
            options: {
                issuer,
                audience: [TokenTypeEnum.REFRESH as unknown as string, audience as unknown as string],
                expiresIn: REFRESH_EXPIRE_IN,
                jwtid,
            },
        });

        return { access_token, refresh_token };
    };

    async createRevokeToken({ userId, jti, ttl }: { userId: Types.ObjectId | string, jti: string, ttl: number }) {
        await this.redis.set({
            key: this.redis.revokeTokenKey({ userId, jti }),
            value: jti,
            ttl,
        });
    };
}
