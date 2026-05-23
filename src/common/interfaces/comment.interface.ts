import { Types } from "mongoose";
import { IUser } from "./user.interface";
import { IPost, IReaction } from "./post.interface";

export interface IComment {
    content?: string;
    attachments?: string[];
    likes?: IReaction[];
    tags?: Types.ObjectId[] | IUser[];
    folderId: string;

    postId: Types.ObjectId | IPost;
    commentId?: Types.ObjectId | IComment;

    createdBy: Types.ObjectId | IUser;
    updatedBy?: Types.ObjectId | IUser;

    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}