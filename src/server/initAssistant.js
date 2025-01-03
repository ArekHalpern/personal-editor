"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var openai_1 = require("openai");
var fs_1 = require("fs");
var path_1 = require("path");
dotenv_1.default.config();
var openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
function initializeMainAssistant() {
    return __awaiter(this, void 0, void 0, function () {
        var assistant, envPath, envContent, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('Creating main assistant...');
                    return [4 /*yield*/, openai.beta.assistants.create({
                            name: "Editor Assistant",
                            description: "A smart editor assistant that helps with document editing and enhancement",
                            model: "gpt-4o-mini",
                            tools: [{
                                    type: "function",
                                    function: {
                                        name: "inline_edit",
                                        description: "Edit specific lines in the document",
                                        parameters: {
                                            type: "object",
                                            properties: {
                                                lineNumbers: {
                                                    type: "array",
                                                    items: { type: "number" },
                                                    description: "The line numbers to edit"
                                                },
                                                instruction: {
                                                    type: "string",
                                                    description: "How to edit these lines"
                                                }
                                            },
                                            required: ["lineNumbers", "instruction"]
                                        }
                                    }
                                }]
                        })];
                case 1:
                    assistant = _a.sent();
                    console.log('Assistant created with ID:', assistant.id);
                    envPath = path_1.default.join(process.cwd(), '.env');
                    envContent = '';
                    try {
                        envContent = fs_1.default.readFileSync(envPath, 'utf8');
                    }
                    catch (error) {
                        console.log('No existing .env file found, creating new one');
                    }
                    // Update or add MAIN_ASSISTANT_ID
                    if (envContent.includes('MAIN_ASSISTANT_ID=')) {
                        envContent = envContent.replace(/MAIN_ASSISTANT_ID=.*/, "MAIN_ASSISTANT_ID=".concat(assistant.id));
                    }
                    else {
                        envContent += "\nMAIN_ASSISTANT_ID=".concat(assistant.id);
                    }
                    // Write back to .env file
                    fs_1.default.writeFileSync(envPath, envContent);
                    console.log('Updated .env file with MAIN_ASSISTANT_ID');
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error initializing assistant:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
initializeMainAssistant();