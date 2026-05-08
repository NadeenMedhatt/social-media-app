import { Types } from "mongoose";
import { AvailabilityEnum, GenderEnum, ProviderEnum, RoleEnum } from "../enums";
import { IUser } from "./user.interface";

export interface IPost {
    folderId: string;
    content?: string;
    attachments?: string[];
    likes?: Types.ObjectId[] | IUser[];
    tags?: Types.ObjectId[] | IUser[];
    availability: AvailabilityEnum

    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;

    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}