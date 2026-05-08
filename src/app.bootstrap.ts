import express from "express";
import { authRouter, postRouter } from "./modules";
import cors from "cors";
import { globalErrorHandler } from "./middleware";
import { connectDB } from "./DB/connections.db";
import { PORT } from "./config/config";
import {  redisService, s3Service } from "./common/services";
import { userRouter } from "./modules/user";
import { successResponse } from "./common/response";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

const s3WriteStream = promisify(pipeline)
export const bootstrap = async () => {

    const app: express.Express = express();
    //middlewares
    app.use(cors(), express.json());

    //base routing
    app.get("/", (req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.send("Hello, World!");
    });
    // app.post("/send-notification", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        
    //     await notificationService.sendNotification({
    //         token: req.body.token,
    //         data: {
    //             title: "first time",
    //             body:"hello world"
    //         }
    //     })
        
    //     return res.status(200).json({message:"notification sended"});
    // });

    //app-routing
    app.use("/auth", authRouter);
    app.use("/user", userRouter);
    app.use("/post", postRouter);
    app.use("/uploads/*path", async (req: express.Request, res: express.Response, next: express.NextFunction) => {

        const { download, fileName } = req.query as { download: string, fileName: string };
        const { path } = req.params as { path: string[] };

        const Key = path.join("/");
        const { Body, ContentType } = await s3Service.getAsset({ Key })
        // res.pipe(Body);
        res.setHeader(
            "Content-Type",
            ContentType || "application/octet-stream"
        );
        res.set("Cross-Origin-Resource-Policy", "cross-origin");

        if (download === "true") {

            res.setHeader("Content-Disposition", `attachment; filename="${fileName || Key.split("/").pop()}"`); // only apply it for  download
        }

        return await s3WriteStream(Body as NodeJS.ReadableStream, res)
        // return successResponse({ res, data: {Body,ContentType } })
    });
    app.use("/pre-signed/*path", async (req: express.Request, res: express.Response, next: express.NextFunction) => {

        const { download, fileName } = req.query as { download: string, fileName: string };
        const { path } = req.params as { path: string[] };

        const Key = path.join("/");
        const url = await s3Service.createPreSignedFetchLink({Key,download, fileName})

        return successResponse({ res, data: url})
    });

    //invalid route handling
    app.use('/*dummy', (req: express.Request, res: express.Response) => {
        res.status(404).json({ message: "Not Found" });
    });

    //application error handling
    app.use(globalErrorHandler)
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });

    //connect to the database
    await connectDB();
    await redisService.connect();
    console.log("App is bootstrapping...");
}