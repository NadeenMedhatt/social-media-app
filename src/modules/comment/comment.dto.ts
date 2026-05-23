import { z } from "zod"
import { createComment, createReplyComment, deleteComment, listComment, reactOnComment, updateComment } from "./comment.validation";


export type createCommentBodyDTO = z.infer<typeof createComment.body>;
export type createCommentParamsDTO = z.infer<typeof createComment.params>;
export type listCommentParamsDTO = z.infer<typeof listComment.params>;

export type updateCommentParamsDTO = z.infer<typeof updateComment.params>;
export type updateCommentBodyDTO = z.infer<typeof updateComment.body>;

export type reactCommentParamsDTO = z.infer<typeof reactOnComment.params>;
export type reactCommentQueryDTO = z.infer<typeof reactOnComment.query>;


export type createReplyCommentParamsDTO = z.infer<typeof createReplyComment.params>;
export type deleteCommentParamsDTO = z.infer<typeof deleteComment.params>;
