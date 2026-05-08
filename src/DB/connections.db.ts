import { connect } from "mongoose";
import { DB_URI } from "../config/config";
import { UserModel } from "./model";

export const connectDB = async () => {
    try {
        await connect(DB_URI, { serverSelectionTimeoutMS: 30000 });
        await UserModel.syncIndexes();
        console.log("Connected to the database successfully!");
    } catch (error) {
        console.error("Error connecting to the database:", error);
    }
}