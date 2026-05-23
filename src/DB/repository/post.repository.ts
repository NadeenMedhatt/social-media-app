import { PostModel } from './../model/post.model';
import { BaseRepository } from "./";
import { IPost } from "../../common/interfaces";

export class PostRepository extends BaseRepository<IPost> {

    constructor() {

        super(PostModel);
    }

}