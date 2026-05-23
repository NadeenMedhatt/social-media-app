"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRepository = void 0;
const post_model_1 = require("./../model/post.model");
const _1 = require("./");
class PostRepository extends _1.BaseRepository {
    constructor() {
        super(post_model_1.PostModel);
    }
}
exports.PostRepository = PostRepository;
