import { createObjectId } from './../../common/utils/mongoose';
import { HydratedDocument, Types } from "mongoose";
import { IPost, IUser } from "../../common/interfaces";
import { notificationService, NotificationService, redisService, RedisService, S3Service } from "../../common/services";
import { createPostBodyDTO, updatePostBodyDTO, updatePostParamsDTO } from "./post.dto";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { randomUUID } from "node:crypto";
import { getAvailability, getProfilePostAvailability } from '../../common/utils/post';
import { IPaginate, PaginationDto } from '../../common/types';
import { CommentRepository, PostRepository, UserRepository } from '../../DB/repository';
import { ReactEnum } from '../../common/enums';

class PostService {

    private userRepository: UserRepository
    private redis: RedisService
    private notification: NotificationService
    private postRepository: PostRepository;
    private commentRepository: CommentRepository;
    private s3: S3Service;

    constructor() {
        this.userRepository = new UserRepository();
        this.redis = redisService;
        this.notification = notificationService;
        this.postRepository = new PostRepository();
        this.commentRepository = new CommentRepository();

        this.s3 = new S3Service();

    }

    async listPost({ page, size }: PaginationDto, user: HydratedDocument<IUser>): Promise<IPaginate<IPost>> {

        const posts = await this.postRepository.paginate({
            filter: {
                $or: getAvailability(user)
            },
            page,
            size,
            options: {
                populate: [{ path: "comments", populate: [{ path: "replies" }] }]
            }
        });


        return posts;
    }
    async listProfilePosts({ page, size }: PaginationDto, user: HydratedDocument<IUser>): Promise<IPaginate<IPost>> {

        const posts = await this.postRepository.paginate({
            filter: {
                $or: getProfilePostAvailability(user)
            },
            page,
            size,
            options: {
                populate: [{ path: "comments", populate: [{ path: "replies" }] }]
            }
        });


        return posts;
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
    async updatePost(
        { postId }: updatePostParamsDTO, {
            availability,
            content,
            files = [],
            tags = [],
            removeFiles = [],
            removeTags = []
        }: updatePostBodyDTO,
        user: HydratedDocument<IUser>
    ): Promise<IPost> {


        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                createdBy: user._id
            }
        });
        if (!post) {
            throw new NotFoundException("Fail To Find Post");
        }

        if (!content && !post.content && !files?.length && removeFiles.length == post.attachments?.length) {
            throw new BadRequestException("we cannot leave empty post");
        }
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
                mentions.push(createObjectId(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token))
            }
        }

        const folderId = post.folderId;

        let attachments: string[] = []
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files as Express.Multer.File[],
                path: `post/${folderId}`
            })
        }


        const updatedPost = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: postId,
                createdBy: user._id
            },
            update: [
                {
                    $set: {
                        content: content ?? post.content,
                        availability: availability ?? post.availability,

                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$attachments",
                                        removeFiles
                                    ]
                                },
                                attachments
                            ]
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$tags",
                                        removeTags.map(ele => createObjectId(ele))
                                    ]
                                },
                                mentions
                            ]
                        },
                    }
                }],
        });


        if (!updatedPost) {
            if (attachments.length) {
                await this.s3.deleteAssets({
                    Keys: attachments.map(ele => {
                        return { Key: ele }
                    })
                })
            }

            throw new BadRequestException("Fail")
        }
        if (removeFiles.length) {
            await this.s3.deleteAssets({
                Keys: removeFiles.map(ele => { return { Key: ele } })
            })
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



        return updatedPost.toJSON();
    }
    // async reactOnPost(
    //     { postId }: updatePostParamsDTO,
    //     { react }: { react: number },
    //     user: HydratedDocument<IUser>
    // ): Promise<IPost> {
    //     const update = react > 0 ? { $addToSet: { likes: user._id } } : { $pull: { likes: user._id } };
    //     const post = await this.postRepository.findOneAndUpdate({
    //         filter: {
    //             _id: postId,
    //             $or: getAvailability(user)
    //         },
    //         update
    //     });
    //     if (!post) {
    //         throw new NotFoundException("fail to find post");
    //     }
    //     return post.toJSON();

    // }
    // async reactOnPost(
    //     { postId }: updatePostParamsDTO,
    //     { react }: { react: ReactEnum },
    //     user: HydratedDocument<IUser>
    // ): Promise<IPost> {
    //     const post = await this.postRepository.findOne({
    //         filter: {
    //             _id: postId,
    //             $or: getAvailability(user)
    //         },
    //     });
    //     if (!post) {
    //         throw new NotFoundException("fail to find post");
    //     }
    //     const existingReact = post.likes?.find((react) => react.userId == user._id)
    //     let update: object;

    //     if (!existingReact) {
    //         update = { $push: { likes: { userId: user._id, react } } };

    //     } else if (existingReact.react === react) {
    //         update = { $pull: { likes: { userId: user._id } } };

    //     } else {
    //         update = { $set: { "likes.$[elem].react": react } };
    //     }
    //     const updated = await this.postRepository.findOneAndUpdate({
    //         filter: {
    //             _id: postId,
    //             $or: getAvailability(user)
    //         },
    //         update,

    //     });
    //     if (!updated) {
    //         throw new NotFoundException("Failed to update post");
    //     }
    //     return updated.toJSON();

    // }
    async reactOnPost(
        { postId }: updatePostParamsDTO,
        { react }: { react: ReactEnum },
        user: HydratedDocument<IUser>
    ): Promise<IPost> {
        react = Number(react);
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                $or: getAvailability(user)
            },
        });
        if (!post) {
            throw new NotFoundException("fail to find post");
        }
        const newReact = [];
        const removedReact = [];
        const existingReact = post.likes?.find((r) => r.userId.toString() == user._id.toString())

        if (!existingReact) {
            newReact.push({ userId: user._id, react });
        } else if (existingReact.react === Number(react)) {
            removedReact.push({ userId: user._id, react });

        } else {
            removedReact.push({ userId: user._id, react: existingReact.react });
            newReact.push({ userId: user._id, react });

        }

        const updated = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: getAvailability(user)
            },
            update: [
                {
                    $set: {
                        likes: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$likes",
                                        removedReact
                                    ]
                                },
                                newReact
                            ]
                        },
                    }
                }],

        });
        if (!updated) {
            throw new NotFoundException("Failed to update post");
        }
        return updated.toJSON();

    }

    async deletePost({ postId }: updatePostParamsDTO,
        user: HydratedDocument<IUser>) {

        const post = await this.postRepository.findOneAndDelete({
            filter: {
                _id: postId,
                createdBy: user._id,
                force: true,
            },
        });

        if (!post) {
            throw new NotFoundException('invalid post')
        }
        await this.commentRepository.deleteMany({
            filter: {
                postId: postId
            }
        });

        await this.s3.deleteFolderByPrefix({ prefix: `post/${post.folderId.toString()}` })

        return post;
    }

}
export const postService = new PostService();
