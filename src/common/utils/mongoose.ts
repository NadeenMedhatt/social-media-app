import { Types } from "mongoose";

export const createObjectId = (id: string) => {
    return Types.ObjectId.createFromHexString(id);
}