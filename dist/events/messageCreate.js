"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = test;
const index_1 = __importDefault(require("index"));
function test() {
    index_1.default.on('messageCreate', (message) => {
        if (message.content === "test") {
            message.reply("working");
            console.log("[TEST PASSED]");
        }
    });
}
