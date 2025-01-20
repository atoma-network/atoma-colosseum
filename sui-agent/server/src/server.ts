import express from "express";
import type { Request, Response, Router } from "express";
import cors from "cors";
import { handleQuery } from "../agent/agents";

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());

const TIMEOUT = 30000;

interface QueryResult {
  status: "success" | "error" | "needs_info" | "transaction_ready";
  error?: string;
  final_answer?: string;
  reasoning?: string;
  results?: any[];
  request?: string;
  transaction?: {
    type: "transfer" | "merge" | "stake" | "balance";
    data: any;
  };
}

interface TransactionRequest {
  query: string;
  transactionData?: {
    type: "transfer" | "merge" | "stake" | "balance";
    data: any;
  };
}

router.post<{}, any, TransactionRequest>("/query", async (req, res) => {
  try {
    const { query, transactionData } = req.body;
    const result = await handleQuery(query, transactionData);

    if (result.status === "needs_info") {
      res.status(202).json(result);
    } else if (result.status === "error") {
      res.status(400).json(result);
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

app.use("/api", router);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
