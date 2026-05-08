"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = require("mongoose");
const config_1 = require("../config/config");
const model_1 = require("./model");
const connectDB = async () => {
    try {
        await (0, mongoose_1.connect)(config_1.DB_URI, { serverSelectionTimeoutMS: 30000 });
        await model_1.UserModel.syncIndexes();
        console.log("Connected to the database successfully!");
    }
    catch (error) {
        console.error("Error connecting to the database:", error);
    }
};
exports.connectDB = connectDB;
