import { z } from "zod"
import { createPost } from "./post.validation";


export type createPostBodyDTO = z.infer<typeof createPost.body>;
