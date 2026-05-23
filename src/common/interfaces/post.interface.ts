import { Types } from "mongoose";
import { AvailabilityEnum, ReactEnum } from "../enums";
import { IUser } from "./user.interface";


export interface IReaction {
    userId: Types.ObjectId;
    react: ReactEnum;
}
export interface IPost {
    folderId: string;
    content?: string;
    attachments?: string[];
    likes?: IReaction[];
    tags?: Types.ObjectId[] | IUser[];
    availability: AvailabilityEnum

    createdBy: Types.ObjectId | IUser;
    updatedBy?: Types.ObjectId | IUser;

    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}