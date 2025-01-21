import { Router } from "express";
import { Request, Response } from "express";
const rootRouter = Router();

rootRouter.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

rootRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({msg:"ok"});
});
export default rootRouter;
