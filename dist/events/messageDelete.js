"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = onDel;
const index_1 = __importDefault(require("index"));
function onDel() {
    index_1.default.on('messageDelete', async (message) => {
        console.log('[MESSAGE DELETED] from ', message.author, 'Content: ', message.content);
    });
}
