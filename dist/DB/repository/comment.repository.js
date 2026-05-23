"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentRepository = void 0;
const comment_model_1 = require("./../model/comment.model");
const _1 = require("./");
class CommentRepository extends _1.BaseRepository {
    constructor() {
        super(comment_model_1.CommentModel);
    }
}
exports.CommentRepository = CommentRepository;
