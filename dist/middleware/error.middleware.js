"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const globalErrorHandler = (error, req, res, next) => {
    if (error.name == "MulterError") {
        error.statusCode = 400;
    }
    const status = error.statusCode || 500;
    return res.status(status).json({
        message: error.message || "Internal Server Error",
        cause: error.cause,
        error,
        stack: error.stack,
    });
};
exports.globalErrorHandler = globalErrorHandler;
