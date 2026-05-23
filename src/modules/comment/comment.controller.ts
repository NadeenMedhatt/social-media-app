import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/response";
import { authentication, validation } from "../../middleware";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";
import * as validators from "./comment.validation";
import { commentService } from "./comment.service";
import { createCommentParamsDTO, createReplyCommentParamsDTO, deleteCommentParamsDTO, listCommentParamsDTO, reactCommentParamsDTO, reactCommentQueryDTO, updateCommentParamsDTO } from "./comment.dto";
import { PaginationDto } from "../../common/types";

const router = Router({ mergeParams: true });

router.get(
    "/",
    authentication(),
    validation(validators.listComment),
    async (req: Request, res: Response, next: NextFunction) => {

        const data = await commentService.listComment(req.params as listCommentParamsDTO, req.query as PaginationDto, req.user);

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
    validation(validators.createComment),
    async (req: Request, res: Response, next: NextFunction) => {

        const data = await commentService.createComment(req.params as createCommentParamsDTO, { ...req.body, ...req.files }, req.user);

        return successResponse<any>({
            res,
            status: 201,
            data
        });

    },
);
router.post(
    "/:commentId/reply",
    authentication(),
    cloudFileUpload({
        validation: fileFieldValidation.image,
        maxSize: 5
    }).array("attachments", 2),
    validation(validators.createReplyComment),
    async (req: Request, res: Response, next: NextFunction) => {

        const data = await commentService.createReplyComment(req.params as createReplyCommentParamsDTO, { ...req.body, ...req.files }, req.user);

        return successResponse<any>({
            res,
            status: 201,
            data
        });

    },
);

router.patch(
    "/:commentId",
    authentication(),
    cloudFileUpload({
        validation: fileFieldValidation.image,
        maxSize: 5
    }).array("attachments", 2),
    validation(validators.updateComment),
    async (req: Request, res: Response, next: NextFunction) => {

        console.log({ files: req.files });

        const data = await commentService.updateComment(req.params as updateCommentParamsDTO, { ...req.body, ...req.files }, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);
router.delete(
    "/:commentId",
    authentication(),
    validation(validators.deleteComment),
    async (req: Request, res: Response, next: NextFunction) => {


        const data = await commentService.deleteComment(req.params as deleteCommentParamsDTO, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);
router.patch(
    "/:commentId/react",
    authentication(),
    validation(validators.reactOnComment),
    async (req: Request, res: Response, next: NextFunction) => {

        console.log({ files: req.files });

        const data = await commentService.reactOnComment(req.params as reactCommentParamsDTO, req.query as unknown as reactCommentQueryDTO, req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);



export default router;