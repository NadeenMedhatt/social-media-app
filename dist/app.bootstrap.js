"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = void 0;
const express_1 = __importDefault(require("express"));
const modules_1 = require("./modules");
const cors_1 = __importDefault(require("cors"));
const middleware_1 = require("./middleware");
const connections_db_1 = require("./DB/connections.db");
const config_1 = require("./config/config");
const services_1 = require("./common/services");
const user_1 = require("./modules/user");
const response_1 = require("./common/response");
const node_stream_1 = require("node:stream");
const node_util_1 = require("node:util");
const s3WriteStream = (0, node_util_1.promisify)(node_stream_1.pipeline);
const bootstrap = async () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)(), express_1.default.json());
    app.get("/", (req, res, next) => {
        res.send("Hello, World!");
    });
    app.use("/auth", modules_1.authRouter);
    app.use("/user", user_1.userRouter);
    app.use("/post", modules_1.postRouter);
    app.use("/uploads/*path", async (req, res, next) => {
        const { download, fileName } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const { Body, ContentType } = await services_1.s3Service.getAsset({ Key });
        res.setHeader("Content-Type", ContentType || "application/octet-stream");
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${fileName || Key.split("/").pop()}"`);
        }
        return await s3WriteStream(Body, res);
    });
    app.use("/pre-signed/*path", async (req, res, next) => {
        const { download, fileName } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const url = await services_1.s3Service.createPreSignedFetchLink({ Key, download, fileName });
        return (0, response_1.successResponse)({ res, data: url });
    });
    app.use('/*dummy', (req, res) => {
        res.status(404).json({ message: "Not Found" });
    });
    app.use(middleware_1.globalErrorHandler);
    app.listen(config_1.PORT, () => {
        console.log(`Server is running on http://localhost:${config_1.PORT}`);
    });
    await (0, connections_db_1.connectDB)();
    await services_1.redisService.connect();
    console.log("App is bootstrapping...");
};
exports.bootstrap = bootstrap;
