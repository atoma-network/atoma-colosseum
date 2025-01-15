import express from "express";
import cors from "cors";
import { getPriceInfo } from "../src/agent/agents";

const app = express();
app.use(cors());
app.use(express.json());

const TIMEOUT = 30000; // 30 seconds timeout

interface QueryResult {
  status: "success" | "error" | "needs_info";
  error?: string;
  final_answer?: string;
  reasoning?: string;
  results?: any[];
  request?: string; // For needs_info status
}

app.post("/api/query", async (req, res) => {
  try {
    const { query } = req.body;

    const result = (await Promise.race([
      getPriceInfo(query),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), TIMEOUT)
      ),
    ])) as QueryResult;

    // Handle different response types
    if (result.status === "needs_info") {
      return res.status(202).json(result); // 202 Accepted but needs more info
    }
    if (result.status === "error") {
      return res.status(400).json(result); // 400 Bad Request
    }
    res.json(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
