import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/response";
import userService from "./user.service";
import { authentication, authorization } from "../../middleware";
import { endpoint } from "./user.authorization";
import { StorageApproachEnum, TokenTypeEnum } from "../../common/enums";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";

const router = Router();

router.get(
    "/",
    authentication(),
    authorization(endpoint.profile),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.profile(req.user);

        return successResponse<any>({
            res,
            status: 201,
            data
        });

    },
);
router.patch(
    "/profile-image",
    authentication(),
   
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.profileImage(req.body , req.user);

        return successResponse<any>({
            res,
            data
        });

    },
);
// router.patch(
//     "/profile-image",
//     authentication(),
//     cloudFileUpload({
//         storageApproach: StorageApproachEnum.DISK,
//         validation: fileFieldValidation.image,
//         maxSize: 5
//     }).single("attachment"),
//     async (req: Request, res: Response, next: NextFunction) => {
//         const data = await userService.profileImage(req.file as Express.Multer.File, req.user);

//         return successResponse<any>({
//             res,
//             status: 200,
//             data
//         });

//     },
// );
router.patch(
    "/profile-cover-images",
    authentication(),
    cloudFileUpload({
        storageApproach: StorageApproachEnum.DISK,
        validation: fileFieldValidation.image,
        maxSize: 5
    }).array("attachments", 2),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.profileCoverImages(req.files as Express.Multer.File[], req.user);

        return successResponse<any>({
            res,
            status: 200,
            data
        });

    },
);
router.post("/logout", authentication(), async (req: Request, res: Response, next: NextFunction) => {
    const status = await userService.logout(
        req.body,
        req.user,
        req.decode as { jti: string, iat: number, sub: string }

    );
    return successResponse({
        res,
        message: "Done",
        status,
    });
});
router.delete(
    "/",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await userService.deleteProfile(req.user);

        return successResponse<any>({
            res,
            data
        });

    },
);
router.post(
    "/rotate",
    authentication(TokenTypeEnum.REFRESH),
    async (req: Request, res: Response, next: NextFunction) => {
        const credentials = await userService.rotateToken(
            req.user,
            req.decode as { jti: string, iat: number, sub: string },
            `${req.protocol}://${req.host}`,
        );
        return successResponse({
            res,
            message: "Done",
            status: 201,
            data: { ...credentials },
        });
    },
);
export default router;