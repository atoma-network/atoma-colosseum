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
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const TIMEOUT = 30000;
app.post("/api/query", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.body;
        const result = (yield Promise.race([
            (0, agents_1.getPriceInfo)(query),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), TIMEOUT)),
        ]));
        if (result.status === "needs_info") {
            return res.status(202).json(result); // 202 Accepted but needs more info
        }
        if (result.status === "error") {
            return res.status(400).json(result);
        }
        return res.status(200).json(result);
    }
    catch (error) {
        res
            .status(500)
            .json({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        });
    }
    // try {
    //       const { query } = req.body;
    //       const result = (await Promise.race([
    //         getPriceInfo(query),
    //         new Promise((_, reject) =>
    //           setTimeout(() => reject(new Error("Request timeout")), TIMEOUT)
    //         ),
    //       ])) as QueryResult;
    //       if (result.status === "needs_info") {
    //         return res.status(202).json(result); // 202 Accepted but needs more info
    //       }
    //       if (result.status === "error") {
    //         return res.status(400).json(result); // 400 Bad Request
    //       }
    //      return res.status(200).json(result);
    //     }
    //     catch (error) {
    //       console.error("API Error:", error);
    //       return res.status(500).json({
    //         status: "error",
    //         error: error instanceof Error ? error.message : "Unknown error occurred",
    //       });
    //     }
}));
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// async (req, res) => {
//   try {
//     const { query } = req.body;
//     const result = (await Promise.race([
//       getPriceInfo(query),
//       new Promise((_, reject) =>
//         setTimeout(() => reject(new Error("Request timeout")), TIMEOUT)
//       ),
//     ])) as QueryResult;
//     if (result.status === "needs_info") {
//       return res.status(202).json(result); // 202 Accepted but needs more info
//     }
//     if (result.status === "error") {
//       return res.status(400).json(result); // 400 Bad Request
//     }
//     res.json(result);
//   } catch (error) {
//     console.error("API Error:", error);
//     res.status(500).json({
//       status: "error",
//       error: error instanceof Error ? error.message : "Unknown error occurred",
//     });
//   }
// }
