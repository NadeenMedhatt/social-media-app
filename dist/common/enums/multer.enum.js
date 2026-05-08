"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadApproachEnum = exports.StorageApproachEnum = void 0;
var StorageApproachEnum;
(function (StorageApproachEnum) {
    StorageApproachEnum[StorageApproachEnum["MEMORY"] = 0] = "MEMORY";
    StorageApproachEnum[StorageApproachEnum["DISK"] = 1] = "DISK";
})(StorageApproachEnum || (exports.StorageApproachEnum = StorageApproachEnum = {}));
var uploadApproachEnum;
(function (uploadApproachEnum) {
    uploadApproachEnum[uploadApproachEnum["SMALL"] = 0] = "SMALL";
    uploadApproachEnum[uploadApproachEnum["LARGE"] = 1] = "LARGE";
})(uploadApproachEnum || (exports.uploadApproachEnum = uploadApproachEnum = {}));
