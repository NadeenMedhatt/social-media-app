import type { Response } from "express";

export const successResponse = <t>({
    res,
    message = "Success",
    status = 200,
    data
}: {
    res: Response,
    message?: string,
    status?: number,
    data?: t

}) => {

    return res.status(status).json({
        message,
        status,
        data
    });
}