"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createObjectId = void 0;
const mongoose_1 = require("mongoose");
const createObjectId = (id) => {
    return mongoose_1.Types.ObjectId.createFromHexString(id);
};
exports.createObjectId = createObjectId;
