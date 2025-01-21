import final_answer_agent_prompt from "../prompts/final_answer_agent";
import { atomaChat } from "../config/atoma";
import Tools from "../tools";
// const tools=new Tools()
interface IntentAgentResponse {
  success: boolean;
  selected_tool: null | string;
  response: null | string;
  needs_additional_info: boolean;
  additional_info_required: null | string[];
  tool_arguments: any[];
}
class Utils {
  private tools: Tools;
  constructor(tools: Tools) {
    this.tools = tools;
  }

  async makeDecision(
    intent_agent_response: IntentAgentResponse,
    query: string,
    tools?: any
  ) {
    if (intent_agent_response.success && intent_agent_response.selected_tool) {
      return await this.executeTools(
        intent_agent_response.selected_tool,
        intent_agent_response.tool_arguments
      );
    } else {
      return await this.finalAnswer(
        intent_agent_response.response,
        query,
        tools
      );
    }
  }

  private async finalAnswer(response: any, query: string, tools?: any) {
    const finalPrompt = final_answer_agent_prompt
      .replace("${query}", query)
      .replace("${response}", response)
      .replace("tools", `${tools || null}`);

    const finalAns: any = await atomaChat([
      {
        content: finalPrompt,
        role: "assistant",
      },
    ]);
    let res = finalAns.choices[0].message.content;
    console.log(finalPrompt);
    return JSON.parse(res);
  }
  private async executeTools(selected_tool: string, args: any[] | null) {
    const tool = this.tools.getAllTools().find((t) => t.name === selected_tool);
    console.log("Selected tool:", selected_tool);
    console.log("Tool arguments:", args);

    if (!tool) {
      throw new Error(`Tool ${selected_tool} not found`);
    }

    try {
      // If args is null or undefined, pass an empty array
      const toolArgs = args || [];
      const result = await tool.process(...toolArgs);
      return await this.finalAnswer(result, "", selected_tool);
    } catch (error: any) {
      console.error("Error executing tool:", error);
      return {
        status: "error",
        message: `Error executing ${selected_tool}: ${error.message}`,
      };
    }
  }
}

export default Utils;
