import { Types } from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../enums";

export interface IUser {
    firstName: string;
    lastName: string;
    username?: string;
    email: string;
    password: string;
    bio?: string;
    phone?: string;
    ProfileImage?: string;
    coverImages?: string[];
    friends?: Types.ObjectId[] | IUser[];
    DOB?: Date;
    confirmedEmail?: Date;
    changeCredentialsTime?: Date;
    provider?: ProviderEnum;
    gender: GenderEnum;
    role: RoleEnum;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}