"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_repository_1 = require("./../../DB/repository/user.repository");
const security_1 = require("../../common/utils/security");
const config_1 = require("../../config/config");
const exceptions_1 = require("../../common/exceptions");
const services_1 = require("../../common/services");
const enums_1 = require("../../common/enums");
class UserService {
    tokenService;
    redis;
    s3;
    userRepository;
    constructor() {
        this.redis = services_1.redisService;
        this.tokenService = new services_1.TokenService();
        this.userRepository = new user_repository_1.UserRepository();
        this.s3 = new services_1.S3Service();
    }
    async profile(user) {
        user.phone = await (0, security_1.generateDecryption)(user.phone);
        return user.toJSON();
    }
    async deleteProfile(user) {
        const account = await this.userRepository.deleteOne({
            filter: {
                _id: user._id,
                force: true
            },
        });
        console.log({ account });
        if (!account.deletedCount) {
            throw new exceptions_1.NotFoundException('invalid account');
        }
        await this.s3.deleteFolderByPrefix({ prefix: `Users/${user._id.toString()}` });
        return account;
    }
    async profileImage({ ContentType, OriginalName }, user) {
        const { url, Key } = await this.s3.createPreSignedUploadLink({
            path: `Users/${user._id.toString()}/Profile`,
            ContentType,
            OriginalName,
        });
        return { user, url };
    }
    async profileCoverImages(files, user) {
        const oldUrls = user.coverImages;
        const urls = await this.s3.uploadFiles({
            files,
            path: `Users/${user._id.toString()}/Profile`,
            storeApproach: enums_1.StorageApproachEnum.DISK,
            uploadApproach: enums_1.uploadApproachEnum.SMALL,
        });
        user.coverImages = urls;
        await user.save();
        if (oldUrls?.length) {
            await this.s3.deleteAssets({
                Keys: oldUrls.map(ele => { return { Key: ele }; })
            });
        }
        return user.toJSON();
    }
    async rotateToken(user, { jti, iat, sub }, issuer) {
        if ((iat + config_1.ACCESS_EXPIRE_IN) * 1000 >= Date.now() + 3000) {
            throw new exceptions_1.ConflictException("current access token still valid");
        }
        await this.tokenService.createRevokeToken({ userId: sub, jti, ttl: iat + config_1.REFRESH_EXPIRE_IN });
        return await this.tokenService.createLoginCredentials({ user, issuer });
    }
    ;
    async logout(flag, user, { jti, iat, sub }) {
        let status = 200;
        switch (flag) {
            case enums_1.LogoutEnum.ALL:
                user.changeCredentialsTime = new Date();
                await user.save();
                await this.redis.deleteKey(await this.redis.allKeysByPrefix(this.redis.revokeTokenKeyPrefix(sub)));
                break;
            default:
                await this.tokenService.createRevokeToken({
                    userId: sub,
                    jti,
                    ttl: iat + config_1.REFRESH_EXPIRE_IN,
                });
                status = 201;
                break;
        }
        return status;
    }
    ;
}
exports.default = new UserService();
