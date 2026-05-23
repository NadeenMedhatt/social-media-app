import { z } from "zod"
import { createPost, deletePost, reactOnPost, updatePost } from "./post.validation";


export type createPostBodyDTO = z.infer<typeof createPost.body>;

export type updatePostParamsDTO = z.infer<typeof updatePost.params>;
export type updatePostBodyDTO = z.infer<typeof updatePost.body>;

export type reactPostParamsDTO = z.infer<typeof reactOnPost.params>;
export type reactPostQueryDTO = z.infer<typeof reactOnPost.query>;


export type deletePostParamsDTO = z.infer<typeof deletePost.params>;
