import { createObjectId } from './../../common/utils/mongoose';
import { HydratedDocument, Types } from "mongoose";
import { IComment, IPost, IUser } from "../../common/interfaces";
import { notificationService, NotificationService, redisService, RedisService, S3Service } from "../../common/services";
import { createCommentBodyDTO, createCommentParamsDTO, createReplyCommentParamsDTO, deleteCommentParamsDTO, listCommentParamsDTO, updateCommentBodyDTO, updateCommentParamsDTO } from "./comment.dto";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { getAvailability } from '../../common/utils/post';
import { IPaginate, PaginationDto } from '../../common/types';
import { CommentRepository, PostRepository, UserRepository } from '../../DB/repository';
import { ReactEnum } from '../../common/enums';
import { randomUUID } from 'node:crypto';

class CommentService {

    private redis: RedisService
    private userRepository: UserRepository
    private notification: NotificationService
    private commentRepository: CommentRepository;
    private postRepository: PostRepository;
    private s3: S3Service;

    constructor() {
        this.userRepository = new UserRepository();
        this.redis = redisService;
        this.notification = notificationService;
        this.commentRepository = new CommentRepository();
        this.postRepository = new PostRepository();

        this.s3 = new S3Service();

    }

    async listComment({ postId }: listCommentParamsDTO, { page, size }: PaginationDto, user: HydratedDocument<IUser>): Promise<IPaginate<IComment>> {

        
        const comments = await this.commentRepository.paginate({
            filter: {
                postId:postId,
            },
            options: {
                populate: [{ path: 'postId', match: { $or: getAvailability(user) } },{ path: 'replies'  }]
            },
            page,
            size
        });


        return comments;
    }
    async createComment({ postId }: createCommentParamsDTO, {
        content,
        files,
        tags,
    }: createCommentBodyDTO, user: HydratedDocument<IUser>): Promise<IComment> {

        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                $or: getAvailability(user),
            }
        });
        if (!post) {
            throw new NotFoundException("fal to find matching post");
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
                mentions.push(Types.ObjectId.createFromHexString(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token))
            }
        }

        const postFolderId = post.folderId;
        const commentFolderId = randomUUID();

        let attachments: string[] = []
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files as Express.Multer.File[],
                path: `post/${postFolderId}/comments/${commentFolderId}`
            })
        }


        const comment = await this.commentRepository.createOne({
            data: {
                createdBy: user._id,
                content: content as string,
                postId: post._id,
                attachments,
                tags: mentions,
                folderId: commentFolderId
            }
        });
        if (!comment) {
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
                    title: "Comment Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his comment`,
                        postId: post._id,
                        commentId: comment._id
                    })
                }
            })
        }



        return comment.toJSON();
    }
    async createReplyComment({ postId, commentId }: createReplyCommentParamsDTO, {
        content,
        files,
        tags,
    }: createCommentBodyDTO, user: HydratedDocument<IUser>): Promise<IComment> {

        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
                postId: postId,

            },
            options: {
                populate: [{ path: 'postId', match: { $or: getAvailability(user) } }]
            }
        });
        if (!comment?.postId) {
            throw new NotFoundException("fal to find matching post");
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
                mentions.push(Types.ObjectId.createFromHexString(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token))
            }
        }

        const post = comment.postId as HydratedDocument<IPost>
        const folderId = post.folderId;
        const commentFolderId = randomUUID();
        let attachments: string[] = []
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files as Express.Multer.File[],
                path: `post/${folderId}/comments/${commentFolderId}`
            })
        }


        const reply = await this.commentRepository.createOne({
            data: {
                createdBy: user._id,
                content: content as string,
                postId: post._id,
                commentId: comment._id,
                folderId: commentFolderId,
                attachments,
                tags: mentions,
            }
        });
        if (!reply) {
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
                    title: "Comment Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his comment`,
                        postId: post._id,
                        commentId: reply._id
                    })
                }
            })
        }



        return reply.toJSON();
    }
    async updateComment(
        { commentId, postId }: updateCommentParamsDTO, {
            content,
            files = [],
            tags = [],
            removeFiles = [],
            removeTags = []
        }: updateCommentBodyDTO,
        user: HydratedDocument<IUser>
    ): Promise<IComment> {
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
                createdBy: user._id
            }
        });
        if (!comment) {
            throw new NotFoundException("Fail To Find Comment");
        }

        if (!content && !comment.content && !files?.length && removeFiles.length == comment.attachments?.length) {
            throw new BadRequestException("we cannot leave empty comment");
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

        const post = comment.postId as HydratedDocument<IPost>
        const folderId = post.folderId;
        const commentFolderId = comment.folderId;

        let attachments: string[] = []
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files as Express.Multer.File[],
                path: `post/${folderId}/comments/${commentFolderId}`
            })
        }


        const updatedComment = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: commentId,
                createdBy: user._id
            },
            update: [
                {
                    $set: {
                        content: content ?? comment.content,

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


        if (!updatedComment) {
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
                    title: "Comment Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his comment`,
                        commentId: comment._id
                    })
                }
            })
        }



        return updatedComment.toJSON();
    }
    async reactOnComment(
        { commentId }: updateCommentParamsDTO,
        { react }: { react: ReactEnum },
        user: HydratedDocument<IUser>
    ): Promise<IComment> {
        react = Number(react);
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
            },
            options: {
                populate: [{ path: 'postId', match: { $or: getAvailability(user) } }]
            }
        });
        if (!comment?.postId) {
            throw new NotFoundException("fail to find post");
        }
        const newReact = [];
        const removedReact = [];
        const existingReact = comment.likes?.find((r) => r.userId.toString() == user._id.toString())

        if (!existingReact) {
            newReact.push({ userId: user._id, react });
        } else if (existingReact.react === Number(react)) {
            removedReact.push({ userId: user._id, react });

        } else {
            removedReact.push({ userId: user._id, react: existingReact.react });
            newReact.push({ userId: user._id, react });

        }

        const updated = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: commentId,
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
            throw new NotFoundException("Failed to update comment");
        }
        return updated.toJSON();

    }

    async deleteComment({ postId, commentId }: deleteCommentParamsDTO,
        user: HydratedDocument<IUser>) {

        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
                postId: postId,

            },
            options: {
                populate: [{ path: 'postId', match: { $or: getAvailability(user) } }]
            }
        });
        if (!comment?.postId) {
            throw new NotFoundException("fal to find matching post");
        }
        const post = comment.postId as HydratedDocument<IPost>
        const folderId = post.folderId;
        const commentFolderId = comment.folderId;

        const deleteComment = await this.commentRepository.deleteOne({
            filter: {
                _id: commentId,
                createdBy: user._id,
                force: true,
            },
        });

        if (!comment) {
            throw new NotFoundException('invalid comment')
        }
        await this.commentRepository.deleteMany({
            filter: {
                commentId: commentId
            }
        });

        await this.s3.deleteFolderByPrefix({ prefix: `post/${folderId}/comments/${commentFolderId}` })

        return deleteComment;
    }
}
export const commentService = new CommentService();
