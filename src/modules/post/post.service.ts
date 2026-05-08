import { HydratedDocument, Types } from "mongoose";
import { IPost, IUser } from "../../common/interfaces";
import { notificationService, NotificationService, redisService, RedisService, S3Service, TokenService } from "../../common/services";
import { PostRepository } from "../../DB/repository/post.repository";
import { createPostBodyDTO } from "./post.dto";
import { UserRepository } from "../../DB/repository/user.repository";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { randomUUID } from "node:crypto";

class PostService {

    private userRepository: UserRepository
    private redis: RedisService
    private notification: NotificationService
    private postRepository: PostRepository;
    private s3: S3Service;

    constructor() {
        this.userRepository = new UserRepository();
        this.redis = redisService;
        this.notification = notificationService;
        this.postRepository = new PostRepository();

        this.s3 = new S3Service();

    }

    async createPost({
        availability,
        content,
        files,
        tags,
    }: createPostBodyDTO, user: HydratedDocument<IUser>): Promise<IPost> {

        const mentions: Types.ObjectId[] = []
        const FCM_Tokens: string[] = []
        if (tags?.length) {
            const mentionedAccounts = await this.userRepository.find({
                filter: {
                    _id: { $in: tags }
                }
            })
            if (mentionedAccounts.length != tags.length) {
                throw new NotFoundException("fail to find some or all mentioned accounts")
            }
            for (const tag of tags) {
                mentions.push(Types.ObjectId.createFromHexString(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token))
            }
        }

        const folderId = randomUUID();

        let attachments: string[] = []
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files as Express.Multer.File[],
                path: `post/${folderId}`
            })
        }


        const post = await this.postRepository.createOne({
            data: {
                createdBy: user._id,
                content: content as string,
                folderId,
                attachments,
                availability,
                tags: mentions,
            }
        });
        if (!post) {
            if (attachments.length) {
                await this.s3.deleteAssets({
                    Keys: attachments.map(ele => {
                        return { Key: ele }
                    })
                })
            }

            throw new BadRequestException("Fail")
        }

        if (FCM_Tokens.length) {
            await this.notification.sendNotifications({
                tokens: FCM_Tokens,
                data: {
                    title: "Post Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his post`,
                        postId: post._id
                    })
                }
            })
        }



        return post.toJSON();
    }

}
export const postService = new PostService();
