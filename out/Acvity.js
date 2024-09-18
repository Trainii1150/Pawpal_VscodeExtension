"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
const typeorm_1 = require("typeorm");
let Activity = exports.Activity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _id_decorators;
    let _id_initializers = [];
    let _activityCodeID_decorators;
    let _activityCodeID_initializers = [];
    let _languages_decorators;
    let _languages_initializers = [];
    let _wordcount_decorators;
    let _wordcount_initializers = [];
    let _coins_decorators;
    let _coins_initializers = [];
    let _time_decorators;
    let _time_initializers = [];
    let _timestamp_decorators;
    let _timestamp_initializers = [];
    var Activity = _classThis = class {
        constructor() {
            this.id = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _id_initializers, void 0));
            this.activityCodeID = __runInitializers(this, _activityCodeID_initializers, void 0);
            this.languages = __runInitializers(this, _languages_initializers, void 0);
            this.wordcount = __runInitializers(this, _wordcount_initializers, void 0);
            this.coins = __runInitializers(this, _coins_initializers, void 0);
            this.time = __runInitializers(this, _time_initializers, void 0);
            this.timestamp = __runInitializers(this, _timestamp_initializers, void 0);
        }
    };
    __setFunctionName(_classThis, "Activity");
    (() => {
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _activityCodeID_decorators = [(0, typeorm_1.Column)()];
        _languages_decorators = [(0, typeorm_1.Column)()];
        _wordcount_decorators = [(0, typeorm_1.Column)()];
        _coins_decorators = [(0, typeorm_1.Column)()];
        _time_decorators = [(0, typeorm_1.Column)()];
        _timestamp_decorators = [(0, typeorm_1.Column)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } } }, _id_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _activityCodeID_decorators, { kind: "field", name: "activityCodeID", static: false, private: false, access: { has: obj => "activityCodeID" in obj, get: obj => obj.activityCodeID, set: (obj, value) => { obj.activityCodeID = value; } } }, _activityCodeID_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _languages_decorators, { kind: "field", name: "languages", static: false, private: false, access: { has: obj => "languages" in obj, get: obj => obj.languages, set: (obj, value) => { obj.languages = value; } } }, _languages_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _wordcount_decorators, { kind: "field", name: "wordcount", static: false, private: false, access: { has: obj => "wordcount" in obj, get: obj => obj.wordcount, set: (obj, value) => { obj.wordcount = value; } } }, _wordcount_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _coins_decorators, { kind: "field", name: "coins", static: false, private: false, access: { has: obj => "coins" in obj, get: obj => obj.coins, set: (obj, value) => { obj.coins = value; } } }, _coins_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _time_decorators, { kind: "field", name: "time", static: false, private: false, access: { has: obj => "time" in obj, get: obj => obj.time, set: (obj, value) => { obj.time = value; } } }, _time_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _timestamp_decorators, { kind: "field", name: "timestamp", static: false, private: false, access: { has: obj => "timestamp" in obj, get: obj => obj.timestamp, set: (obj, value) => { obj.timestamp = value; } } }, _timestamp_initializers, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name }, null, _classExtraInitializers);
        Activity = _classThis = _classDescriptor.value;
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Activity = _classThis;
})();
//# sourceMappingURL=Acvity.js.map