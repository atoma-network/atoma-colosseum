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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const agents_1 = require("../agent/agents");
const app = (0, express_1.default)();
const router = express_1.default.Router();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const TIMEOUT = 30000;
router.post("/query", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query, transactionData } = req.body;
        const result = yield (0, agents_1.getPriceInfo)(query, transactionData);
        if (result.status === "needs_info") {
            res.status(202).json(result);
        }
        else if (result.status === "error") {
            res.status(400).json(result);
        }
        else {
            res.status(200).json(result);
        }
    }
    catch (error) {
        console.error("Error processing query:", error);
        res.status(500).json({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        });
    }
}));
app.use("/api", router);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
