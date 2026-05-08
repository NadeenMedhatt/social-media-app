import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/response";
import { authentication, validation } from "../../middleware";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";
import { StorageApproachEnum } from "../../common/enums";
import * as validators from "./post.validation";
import { postService } from "./post.service";

const router = Router();

router.post(
    "/",
    authentication(),
    cloudFileUpload({
        storageApproach: StorageApproachEnum.DISK,
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

export default router;