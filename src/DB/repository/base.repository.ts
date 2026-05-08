import { DeleteResult, FlattenMaps, MongooseUpdateQueryOptions, PopulateOptions, ProjectionType, QueryOptions, Types, UpdateQuery, UpdateWithAggregationPipeline, UpdateWriteOpResult } from "mongoose";
import { AnyKeys, CreateOptions, HydratedDocument, Model, QueryFilter } from "mongoose";

export abstract class BaseRepository<TRawDocument> {

    constructor(protected model: Model<TRawDocument>) {

    }
    async create({ data, options }: { data: AnyKeys<TRawDocument>[], options?: CreateOptions }): Promise<HydratedDocument<TRawDocument>[]> {
        return await this.model.create(data as any, options)
    }
    async insertMany({ data }:
        {
            data: AnyKeys<TRawDocument>[],
        }):
        Promise<HydratedDocument<TRawDocument>[]> {
        return await this.model.insertMany(data as any) as HydratedDocument<TRawDocument>[]
    }
    async createOne({
        data,
        options = {}
    }: {
        data: AnyKeys<TRawDocument>,
        options?: CreateOptions | undefined
    }): Promise<HydratedDocument<TRawDocument>> {

        const [user] = await this.create({ data: [data], options: options }) || []
        return user as HydratedDocument<TRawDocument>;
    }
    async findOne({
        filter,
        projection,
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        projection?: ProjectionType<TRawDocument> | null | undefined,
        options?: QueryOptions<TRawDocument> & { lean: false }
    }): Promise<HydratedDocument<TRawDocument> | null>;
    async findOne({
        filter,
        projection,
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        projection?: ProjectionType<TRawDocument> | null | undefined,
        options?: QueryOptions<TRawDocument> & { lean: true }
    }): Promise<FlattenMaps<TRawDocument> | null>;

    async findOne({
        filter = {},
        projection,
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        projection?: ProjectionType<TRawDocument> | null | undefined,
        options?: QueryOptions<TRawDocument>
    }): Promise<FlattenMaps<TRawDocument> | HydratedDocument<TRawDocument> | null> {

        const doc = this.model.findOne(filter, projection);
        if (options?.populate) { doc.populate(options.populate as PopulateOptions[]) }
        if (options?.lean) { doc.lean(options.lean) }
        return await doc.exec()
    }
    async find({
        filter = {},
        projection,
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        projection?: ProjectionType<TRawDocument> | null | undefined,
        options?: QueryOptions<TRawDocument>
    }): Promise<FlattenMaps<TRawDocument>[] | HydratedDocument<TRawDocument>[]> {

        const doc = this.model.find(filter, projection);
        if (options?.populate) { doc.populate(options.populate as PopulateOptions[]) }
        if (options?.lean) { doc.lean(options.lean) }
        return await doc.exec()
    }
    async findById({
        _id,
        projection,
        options
    }: {
        _id: Types.ObjectId,
        projection?: ProjectionType<TRawDocument> | null | undefined,
        options?: QueryOptions<TRawDocument> & { lean: false }
    }): Promise<HydratedDocument<TRawDocument> | null>;
    async findById({
        _id,
        projection,
        options
    }: {
        _id: Types.ObjectId,
        projection?: ProjectionType<TRawDocument> | null | undefined,
        options?: QueryOptions<TRawDocument> & { lean: true }
    }): Promise<FlattenMaps<TRawDocument> | null>;

    async findById({
        _id,
        projection,
        options
    }: {
        _id: Types.ObjectId,
        projection?: ProjectionType<TRawDocument> | null | undefined,
        options?: QueryOptions<TRawDocument>
    }): Promise<FlattenMaps<TRawDocument> | HydratedDocument<TRawDocument> | null> {

        const doc = this.model.findById(_id, projection);
        if (options?.populate) { doc.populate(options.populate as PopulateOptions[]) }
        if (options?.lean) { doc.lean(options.lean) }
        return await doc.exec()
    }



    async updateOne({
        filter = {},
        update,
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline,
        options?: MongooseUpdateQueryOptions<TRawDocument>
    }): Promise<UpdateWriteOpResult> {
        return await this.model.updateOne(filter, { ...update, $inc: { __v: 1 } }, options)
    }

    async updateMany({
        filter = {},
        update,
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline,
        options?: MongooseUpdateQueryOptions<TRawDocument>
    }): Promise<UpdateWriteOpResult> {
        return await this.model.updateMany(filter, { ...update, $inc: { __v: 1 } }, options)
    }

    async findOneAndUpdate({
        filter = {},
        update,
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline,
        options?: MongooseUpdateQueryOptions<TRawDocument>
    }): Promise<HydratedDocument<TRawDocument> | null> {
        return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, options)
    }

    async findByIdAndUpdate({
        _id,
        update,
        options
    }: {
        _id: Types.ObjectId,
        update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline,
        options?: MongooseUpdateQueryOptions<TRawDocument>
    }): Promise<HydratedDocument<TRawDocument> | null> {
        return await this.model.findByIdAndUpdate(_id, { ...update, $inc: { __v: 1 } }, options)
    }

    async deleteOne({
        filter = {},
    }: {
        filter: QueryFilter<TRawDocument>,

    }): Promise<DeleteResult> {
        return await this.model.deleteOne(filter)
    }
    async deleteMany({
        filter = {},
    }: {
        filter: QueryFilter<TRawDocument>,

    }): Promise<DeleteResult> {
        return await this.model.deleteMany(filter)
    }

    async findOneAndDelete({
        filter = {},
        options
    }: {
        filter: QueryFilter<TRawDocument>,
        options?: MongooseUpdateQueryOptions<TRawDocument>
    }): Promise<HydratedDocument<TRawDocument> | null> {
        return await this.model.findOneAndDelete(filter, options)
    }

    async findByIdAndDelete({
        _id,
        options
    }: {
        _id: Types.ObjectId,
        options?: MongooseUpdateQueryOptions<TRawDocument>
    }): Promise<HydratedDocument<TRawDocument> | null> {

        return await this.model.findByIdAndDelete(_id, options)
    }

}