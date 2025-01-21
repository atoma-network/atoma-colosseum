export interface IntentAgentResponse{
    "success":boolean,
    "selected_tool":null | string,
    "response":null | string,
    "needs_additional_info": boolean,
    "additional_info_required": null | string[]
    "tool_arguments":any[]
     }

    export interface toolResponse{
        "success":boolean,
        "selected_tool":null | string,
        "response":null | string,
        "needs_additional_info": boolean,
        "additional_info_required": null | string[]
        "tool_arguments":any[]
        
        }
        
    export   interface ToolParameter {
            name: string;
            type: string;
            description: string;
            required: boolean;
        }
        
     export interface Tool {
            name: string;
            description: string;
            parameters: ToolParameter[];
            process: (...args: any[]) => Promise<string> | string;
        }

    