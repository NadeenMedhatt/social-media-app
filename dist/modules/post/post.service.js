"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = void 0;
const mongoose_1 = require("./../../common/utils/mongoose");
const mongoose_2 = require("mongoose");
const services_1 = require("../../common/services");
const exceptions_1 = require("../../common/exceptions");
const node_crypto_1 = require("node:crypto");
const post_1 = require("../../common/utils/post");
const repository_1 = require("../../DB/repository");
class PostService {
    userRepository;
    redis;
    notification;
    postRepository;
    commentRepository;
    s3;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = services_1.redisService;
        this.notification = services_1.notificationService;
        this.postRepository = new repository_1.PostRepository();
        this.commentRepository = new repository_1.CommentRepository();
        this.s3 = new services_1.S3Service();
    }
    async listPost({ page, size }, user) {
        const posts = await this.postRepository.paginate({
            filter: {
                $or: (0, post_1.getAvailability)(user)
            },
            page,
            size,
            options: {
                populate: [{ path: "comments", populate: [{ path: "replies" }] }]
            }
        });
        return posts;
    }
    async listProfilePosts({ page, size }, user) {
        const posts = await this.postRepository.paginate({
            filter: {
                $or: (0, post_1.getProfilePostAvailability)(user)
            },
            page,
            size,
            options: {
                populate: [{ path: "comments", populate: [{ path: "replies" }] }]
            }
        });
        return posts;
    }
    async createPost({ availability, content, files, tags, }, user) {
        const mentions = [];
        const FCM_Tokens = [];
        if (tags?.length) {
            const mentionedAccounts = await this.userRepository.find({
                filter: {
                    _id: { $in: tags }
                }
            });
            if (mentionedAccounts.length != tags.length) {
                throw new exceptions_1.NotFoundException("fail to find some or all mentioned accounts");
            }
            for (const tag of tags) {
                mentions.push(mongoose_2.Types.ObjectId.createFromHexString(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token));
            }
        }
        const folderId = (0, node_crypto_1.randomUUID)();
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files,
                path: `post/${folderId}`
            });
        }
        const post = await this.postRepository.createOne({
            data: {
                createdBy: user._id,
                content: content,
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
                        return { Key: ele };
                    })
                });
            }
            throw new exceptions_1.BadRequestException("Fail");
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
            });
        }
        return post.toJSON();
    }
    async updatePost({ postId }, { availability, content, files = [], tags = [], removeFiles = [], removeTags = [] }, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                createdBy: user._id
            }
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("Fail To Find Post");
        }
        if (!content && !post.content && !files?.length && removeFiles.length == post.attachments?.length) {
            throw new exceptions_1.BadRequestException("we cannot leave empty post");
        }
        const mentions = [];
        const FCM_Tokens = [];
        if (tags?.length) {
            const mentionedAccounts = await this.userRepository.find({
                filter: {
                    _id: { $in: tags }
                }
            });
            if (mentionedAccounts.length != tags.length) {
                throw new exceptions_1.NotFoundException("fail to find some or all mentioned accounts");
            }
            for (const tag of tags) {
                mentions.push((0, mongoose_1.createObjectId)(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token));
            }
        }
        const folderId = post.folderId;
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files,
                path: `post/${folderId}`
            });
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
                                        removeTags.map(ele => (0, mongoose_1.createObjectId)(ele))
                                    ]
                                },
                                mentions
                            ]
                        },
                    }
                }
            ],
        });
        if (!updatedPost) {
            if (attachments.length) {
                await this.s3.deleteAssets({
                    Keys: attachments.map(ele => {
                        return { Key: ele };
                    })
                });
            }
            throw new exceptions_1.BadRequestException("Fail");
        }
        if (removeFiles.length) {
            await this.s3.deleteAssets({
                Keys: removeFiles.map(ele => { return { Key: ele }; })
            });
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
            });
        }
        return updatedPost.toJSON();
    }
    async reactOnPost({ postId }, { react }, user) {
        react = Number(react);
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                $or: (0, post_1.getAvailability)(user)
            },
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("fail to find post");
        }
        const newReact = [];
        const removedReact = [];
        const existingReact = post.likes?.find((r) => r.userId.toString() == user._id.toString());
        if (!existingReact) {
            newReact.push({ userId: user._id, react });
        }
        else if (existingReact.react === Number(react)) {
            removedReact.push({ userId: user._id, react });
        }
        else {
            removedReact.push({ userId: user._id, react: existingReact.react });
            newReact.push({ userId: user._id, react });
        }
        const updated = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, post_1.getAvailability)(user)
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
                }
            ],
        });
        if (!updated) {
            throw new exceptions_1.NotFoundException("Failed to update post");
        }
        return updated.toJSON();
    }
    async deletePost({ postId }, user) {
        const post = await this.postRepository.findOneAndDelete({
            filter: {
                _id: postId,
                createdBy: user._id,
                force: true,
            },
        });
        if (!post) {
            throw new exceptions_1.NotFoundException('invalid post');
        }
        await this.commentRepository.deleteMany({
            filter: {
                postId: postId
            }
        });
        await this.s3.deleteFolderByPrefix({ prefix: `post/${post.folderId.toString()}` });
        return post;
    }
}
exports.postService = new PostService();
