import { UserRepository } from './../../DB/repository/user.repository';
import { HydratedDocument } from "mongoose";
import { IUser } from "../../common/interfaces";
import { generateDecryption } from "../../common/utils/security";
import { ACCESS_EXPIRE_IN, REFRESH_EXPIRE_IN } from "../../config/config";
import { ConflictException, NotFoundException } from "../../common/exceptions";
import { redisService, RedisService, S3Service, TokenService } from "../../common/services";
import { LogoutEnum, StorageApproachEnum, uploadApproachEnum } from "../../common/enums";

class UserService {

    private readonly tokenService: TokenService;
    private redis: RedisService;
    private s3: S3Service;
    private userRepository: UserRepository;


    constructor() {
        this.redis = redisService;

        this.tokenService = new TokenService();
        this.userRepository = new UserRepository();
        this.s3 = new S3Service();
    }

    async profile(user: HydratedDocument<IUser>) {
        user.phone = await generateDecryption(user.phone as string);
        return user.toJSON();
    }
    async deleteProfile(user: HydratedDocument<IUser>) {


        const account = await this.userRepository.deleteOne({
            filter: {
                _id: user._id,
                force: true

            },
        });
        console.log({ account });

        if (!account.deletedCount) {
            throw new NotFoundException('invalid account')
        }
        await this.s3.deleteFolderByPrefix({ prefix: `Users/${user._id.toString()}` })

        return account;
    }
    // async profileImage(file: Express.Multer.File, user: HydratedDocument<IUser>) {
    //     const { Key } = await this.s3.uploadLargeFile({
    //         file,
    //         path: `User/${user._id.toString()}/Profile`
    //     })

    //     user.ProfileImage = Key as string;
    //     await user.save();
    //     return user.toJSON();
    // }
    async profileImage({ ContentType, OriginalName }: { ContentType: string, OriginalName: string }, user: HydratedDocument<IUser>): Promise<{ user: IUser, url: string }> {
        // const oldPic = user.ProfileImage;
        const { url, Key } = await this.s3.createPreSignedUploadLink({
            path: `Users/${user._id.toString()}/Profile`,
            ContentType,
            OriginalName,
        })

        // user.ProfileImage = Key as string;
        // await user.save();
        // if (oldPic) {
        //     await this.s3.deleteAsset({ Key: oldPic })
        // }
        return { user, url };
    }
    async profileCoverImages(files: Express.Multer.File[], user: HydratedDocument<IUser>) {
        const oldUrls = user.coverImages;

        const urls = await this.s3.uploadFiles({
            files,
            path: `Users/${user._id.toString()}/Profile`,
            storeApproach: StorageApproachEnum.DISK,
            uploadApproach: uploadApproachEnum.SMALL,
        })

        user.coverImages = urls;
        await user.save();
        if (oldUrls?.length) {
            await this.s3.deleteAssets({
                Keys: oldUrls.map(ele => { return { Key: ele } })
            })
        }

        return user.toJSON();
    }

    async rotateToken(user: HydratedDocument<IUser>, { jti, iat, sub }: { jti: string, iat: number, sub: string }, issuer: string) {
        if ((iat + ACCESS_EXPIRE_IN) * 1000 >= Date.now() + 3000) {
            throw new ConflictException("current access token still valid");
        }
        await this.tokenService.createRevokeToken({ userId: sub, jti, ttl: iat + REFRESH_EXPIRE_IN });

        return await this.tokenService.createLoginCredentials({ user, issuer });
    };
    async logout(flag: LogoutEnum, user: HydratedDocument<IUser>, { jti, iat, sub }: { jti: string, iat: number, sub: string }) {
        // 28:29
        let status = 200;
        switch (flag) {
            case LogoutEnum.ALL:
                user.changeCredentialsTime = new Date();
                await user.save();
                await this.redis.deleteKey(await this.redis.allKeysByPrefix(this.redis.revokeTokenKeyPrefix(sub)));
                break;

            default:
                await this.tokenService.createRevokeToken({
                    userId: sub,
                    jti,
                    ttl: iat + REFRESH_EXPIRE_IN,
                });
                status = 201;

                break;
        }

        return status;
    };

}
export default new UserService();
