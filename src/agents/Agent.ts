import { IntentAgentResponse } from "../../@types/interface";
import Tools from "../tools/";
import { registerAllTools } from "../tools/ToolRegistry";
import Utils from "../utils";
const tools=new Tools()
const utils=new Utils(tools);


class Agents{
async IntentAgent(prompt:string){
    registerAllTools(tools);
   let  IntentResponse:IntentAgentResponse=await tools.selectAppropriateTool(prompt) as IntentAgentResponse;
   return IntentResponse;
}
async DecisionMakingAgent(intentResponse:any,query:string){
    return await utils.makeDecision(intentResponse as IntentAgentResponse,query)
}
async SuperVisorAgent(prompt:string){
    let res=await this.IntentAgent(prompt)
    console.log(res)
    let finalAnswer=await this.DecisionMakingAgent(res,prompt);
    console.log(finalAnswer,'final')
    return finalAnswer;
}
}



export default Agents;