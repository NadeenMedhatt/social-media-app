import { NextFunction, Request, Response } from "express";

interface iError extends Error {
    statusCode: number;
}

export const globalErrorHandler = (error: iError, req: Request, res: Response, next: NextFunction) => {
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
} 