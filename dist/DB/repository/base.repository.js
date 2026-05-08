"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async create({ data, options }) {
        return await this.model.create(data, options);
    }
    async insertMany({ data }) {
        return await this.model.insertMany(data);
    }
    async createOne({ data, options = {} }) {
        const [user] = await this.create({ data: [data], options: options }) || [];
        return user;
    }
    async findOne({ filter = {}, projection, options }) {
        const doc = this.model.findOne(filter, projection);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async find({ filter = {}, projection, options }) {
        const doc = this.model.find(filter, projection);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async findById({ _id, projection, options }) {
        const doc = this.model.findById(_id, projection);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async updateOne({ filter = {}, update, options }) {
        return await this.model.updateOne(filter, { ...update, $inc: { __v: 1 } }, options);
    }
    async updateMany({ filter = {}, update, options }) {
        return await this.model.updateMany(filter, { ...update, $inc: { __v: 1 } }, options);
    }
    async findOneAndUpdate({ filter = {}, update, options }) {
        return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, options);
    }
    async findByIdAndUpdate({ _id, update, options }) {
        return await this.model.findByIdAndUpdate(_id, { ...update, $inc: { __v: 1 } }, options);
    }
    async deleteOne({ filter = {}, }) {
        return await this.model.deleteOne(filter);
    }
    async deleteMany({ filter = {}, }) {
        return await this.model.deleteMany(filter);
    }
    async findOneAndDelete({ filter = {}, options }) {
        return await this.model.findOneAndDelete(filter, options);
    }
    async findByIdAndDelete({ _id, options }) {
        return await this.model.findByIdAndDelete(_id, options);
    }
}
exports.BaseRepository = BaseRepository;
