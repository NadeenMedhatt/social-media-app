import { CommentModel } from './../model/comment.model';
import { BaseRepository } from "./";
import { IComment } from "../../common/interfaces";

export class CommentRepository extends BaseRepository<IComment> {

    constructor() {

        super(CommentModel);
    }

}