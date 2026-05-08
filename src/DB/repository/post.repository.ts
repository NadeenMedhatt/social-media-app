import { PostModel } from './../model/post.model';
import { BaseRepository } from "./base.repository";
import { IPost } from "../../common/interfaces";

export class PostRepository extends BaseRepository<IPost> {

    constructor() {

        super(PostModel);
    }

}