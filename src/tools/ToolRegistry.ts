import Tools from './index';
import { getCoinPrice } from './PriceTool';
import { getTokenAPR } from './APRTool';


/* 
format for tool registry is:
tool name, tool decriptipon, tool arguments , process(function)
*/

export function registerAllTools(tools: Tools) {

    tools.registerTool(
        'price_tool', 
        'tool to get the price of a coin', [ {
                name: 'coin',
                type: 'string',
                description: 'The cryptocurrency coin ID (e.g., bitcoin, ethereum)',
                required: true
        }], getCoinPrice
    );


    tools.registerTool('get_token_apr','took to get the apr of a token',[{
        name:"tokenAddress",
        type:"string",
        description:"the token address of the coin, may be gotten from the query",
        required:true
    }],getTokenAPR)

    
    // Add any other tools here
} 
