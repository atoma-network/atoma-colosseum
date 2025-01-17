import express, { Request, Response } from "express";
import cors from "cors";
import { getPriceInfo } from "../agent/agents";

const app = express();
app.use(cors());
app.use(express.json());

const TIMEOUT = 30000;

interface QueryResult {
  status: "success" | "error" | "needs_info";
  error?: string;
  final_answer?: string;
  reasoning?: string;
  results?: any[];
  request?: string;
}

app.post("/api/query", async (req: Request, res: any) => {
  try {
    const { query } = req.body;
    const result = (await Promise.race([
      getPriceInfo(query),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), TIMEOUT)
      ),
    ])) as QueryResult;
    
    if (result.status === "needs_info") {
      return res.status(202).json(result); // 202 Accepted but needs more info
    }
    if (result.status === "error") {
      return res.status(400).json(result); 
    }
    return res.status(200).json(result);
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
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
});

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
