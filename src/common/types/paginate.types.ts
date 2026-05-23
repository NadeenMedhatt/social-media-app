import z from "zod";
import { paginationValidationSchema } from "../validation";
import { HydratedDocument } from "mongoose";

export type PaginationDto = z.infer<typeof paginationValidationSchema.query>

export interface IPaginate<TRawDocument> {
    docs: HydratedDocument<TRawDocument>[],
    currentPage?: number | undefined,
    pageSize?: number | undefined,
    count?: number | undefined,
    pages?: string | number | undefined,

}