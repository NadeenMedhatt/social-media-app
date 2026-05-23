import { HydratedDocument } from "mongoose";
import { AvailabilityEnum } from "../enums";
import { IUser } from "../interfaces";

export const getAvailability = (user: HydratedDocument<IUser>) => {
    return [
        { availability: AvailabilityEnum.PUBLIC },
        { availability: AvailabilityEnum.FRIENDS, createdBy: { $in: [...(user.friends || []), user._id] } },
        { availability: AvailabilityEnum.ONLY_ME, createdBy: user._id },
        { tags: { $in: [user._id] } },
    ];
}
export const getProfilePostAvailability = (user: HydratedDocument<IUser>) => {
    return [
        { createdBy: user._id },
        { tags: { $in: [user._id] } },
    ];
}