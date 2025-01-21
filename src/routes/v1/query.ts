import { Router } from "express";
import { Request, Response } from "express";
const queryRouter = Router();
import Agents from "../../agents/Agent";
let agent=new Agents()

queryRouter.post("/query",async (req: Request, res: Response) => {
   let {prompt}=req.body;
  let agentResponse=await agent.SuperVisorAgent(prompt);
  console.log(agentResponse,'wow')
  res.json(agentResponse);
});
queryRouter.use((r:any,res:any)=>{
    return res.status(405).json({err:'method not allowed'})
})
export default queryRouter;
