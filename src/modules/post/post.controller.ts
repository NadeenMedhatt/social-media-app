import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/response";
import { authentication, validation } from "../../middleware";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";
import * as validators from "./post.validation";
import { postService } from "./post.service";
import { deletePostParamsDTO, reactPostParamsDTO, reactPostQueryDTO, updatePostParamsDTO } from "./post.dto";
import { paginationValidationSchema } from '../../common/validation';
import { PaginationDto } from "../../common/types";
import { commentRouter } from "../comment";

const router = Router();
router.use("/:postId/comment", commentRouter)
router.get(
    "/",
    authentication(),
    validation(paginationValidationSchema),
    async (req: Request, res: Response, next: NextFunction) => {

        const data = await postService.listPost(req.query as PaginationDto, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);
router.get(
    "/profile",
    authentication(),
    validation(paginationValidationSchema),
    async (req: Request, res: Response, next: NextFunction) => {

        const data = await postService.listProfilePosts(req.query as PaginationDto, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);
router.post(
    "/",
    authentication(),
    cloudFileUpload({
        validation: fileFieldValidation.image,
        maxSize: 5
    }).array("attachments", 2),
    validation(validators.createPost),
    async (req: Request, res: Response, next: NextFunction) => {

        const data = await postService.createPost({ ...req.body, ...req.files }, req.user);

        return successResponse<any>({
            res,
            status: 201,
            data
        });

    },
);

router.patch(
    "/:postId",
    authentication(),
    cloudFileUpload({
        validation: fileFieldValidation.image,
        maxSize: 5
    }).array("attachments", 2),
    validation(validators.updatePost),
    async (req: Request, res: Response, next: NextFunction) => {


        const data = await postService.updatePost(req.params as updatePostParamsDTO, { ...req.body, ...req.files }, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);
router.delete(
    "/:postId",
    authentication(),
    validation(validators.deletePost),
    async (req: Request, res: Response, next: NextFunction) => {


        const data = await postService.deletePost(req.params as deletePostParamsDTO, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);
router.patch(
    "/:postId/react",
    authentication(),
    validation(validators.reactOnPost),
    async (req: Request, res: Response, next: NextFunction) => {


        const data = await postService.reactOnPost(req.params as reactPostParamsDTO, req.query as unknown as reactPostQueryDTO, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);

export default router;