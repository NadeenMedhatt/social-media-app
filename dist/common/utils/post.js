"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfilePostAvailability = exports.getAvailability = void 0;
const enums_1 = require("../enums");
const getAvailability = (user) => {
    return [
        { availability: enums_1.AvailabilityEnum.PUBLIC },
        { availability: enums_1.AvailabilityEnum.FRIENDS, createdBy: { $in: [...(user.friends || []), user._id] } },
        { availability: enums_1.AvailabilityEnum.ONLY_ME, createdBy: user._id },
        { tags: { $in: [user._id] } },
    ];
};
exports.getAvailability = getAvailability;
const getProfilePostAvailability = (user) => {
    return [
        { createdBy: user._id },
        { tags: { $in: [user._id] } },
    ];
};
exports.getProfilePostAvailability = getProfilePostAvailability;
