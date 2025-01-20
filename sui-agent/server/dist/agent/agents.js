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
exports.getPriceInfo = getPriceInfo;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const transactionAgent_1 = require("./transactionAgent");
// Configure dotenv with explicit path
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
// Replace OpenAI with Anthropic
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
const toolDefinitions_1 = require("./toolDefinitions");
const PriceAnalysis_1 = require("../markets/PriceAnalysis");
const config_1 = require("../common/config");
const prompt_1 = require("./prompt");
// Create a map of tool implementations
const toolImplementations = {
    get_token_price: PriceAnalysis_1.getTokenPrice,
    get_coins_price_info: PriceAnalysis_1.getCoinsPriceInfo,
    get_pool_info: PriceAnalysis_1.getPool,
    get_all_pools: PriceAnalysis_1.getAllPools,
    get_pool_spot_price: PriceAnalysis_1.getPoolSpotPrice,
    get_trade_route: PriceAnalysis_1.getTradeRoute,
    get_staking_positions: PriceAnalysis_1.getStakingPositions,
    get_dca_orders: PriceAnalysis_1.getDcaOrders,
};
// // Initialize the Atoma SDK with proper authentication
// const atomaSDK = new AtomaSDK({
//   bearerAuth: process.env.ATOMASDK_BEARER_AUTH,
// });
// Add new formatting functions
const formatSingleValue = (data, field, subfield) => {
    if (!data)
        return "Data not available";
    let value = data[field];
    if (subfield && typeof value === "object") {
        value = value[subfield];
    }
    switch (field) {
        case "apr":
            return `APR: ${value}%`;
        case "tvl":
            return `TVL: $${Number(value).toLocaleString("en-US", {
                maximumFractionDigits: 2,
            })}`;
        case "reserves":
            if (typeof value === "object" && Array.isArray(value)) {
                const tokenNames = data.tokens.map((addr) => {
                    var _a;
                    const symbol = ((_a = Object.entries(config_1.COIN_ADDRESSES).find(([_, address]) => address === addr)) === null || _a === void 0 ? void 0 : _a[0]) || "Unknown";
                    return symbol;
                });
                if (subfield && !isNaN(parseInt(subfield))) {
                    const idx = parseInt(subfield);
                    const formattedValue = (Number(value[idx]) /
                        1e9 /
                        1e6).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    });
                    return `${tokenNames[idx]} Reserve: ${formattedValue}M`;
                }
            }
            return `${field}: ${value}`;
        default:
            return `${field}: ${value}`;
    }
};
// Update the formatting logic in getPriceInfo function
const formatPoolInfo = (data) => {
    if (!data)
        return "Pool information not available";
    const tokenNames = data.tokens.map((addr) => {
        var _a;
        const symbol = ((_a = Object.entries(config_1.COIN_ADDRESSES).find(([_, address]) => address === addr)) === null || _a === void 0 ? void 0 : _a[0]) || "Unknown";
        return symbol;
    });
    const reserves = data.reserves.map((r) => {
        const value = Number(r) / 1e9;
        return value.toLocaleString("en-US", {
            maximumFractionDigits: 2,
        });
    });
    const tokenReservePairs = tokenNames.map((token, i) => `${token.padEnd(10)}: ${reserves[i].padStart(12)}`);
    return `Pool Information
================
ID: ${data.id}

Tokens and Reserves:
${tokenReservePairs.join("\n")}

Pool Stats:
• TVL: $${Number(data.tvl).toLocaleString("en-US", {
        maximumFractionDigits: 2,
    })}
• Daily Fees: $${Number(data.fee).toLocaleString("en-US", {
        maximumFractionDigits: 2,
    })}
• APR: ${Number(data.apr).toLocaleString("en-US", {
        maximumFractionDigits: 2,
    })}%`;
};
// Add this helper function
function convertCoinSymbolToAddress(symbol) {
    const address = config_1.COIN_ADDRESSES[symbol.toUpperCase()];
    if (!address) {
        throw new Error(`Unknown coin symbol: ${symbol}`);
    }
    return address;
}
// Update the executeAction function
function executeAction(action) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate that the tool exists
        const toolDef = Object.values(toolDefinitions_1.TOOL_DEFINITIONS)
            .flatMap((category) => category.tools)
            .find((tool) => tool.name === action.tool);
        if (!toolDef) {
            throw new Error(`Unknown tool: ${action.tool}`);
        }
        // Convert coin symbols to addresses where needed
        const processedInput = Object.assign({}, action.input);
        if (action.tool === "get_coins_price_info" &&
            Array.isArray(action.input.coins)) {
            processedInput.coins = action.input.coins.map(convertCoinSymbolToAddress);
        }
        else if (action.tool === "get_token_price" && action.input.token_type) {
            processedInput.token_type = convertCoinSymbolToAddress(action.input.token_type);
        }
        else if (action.tool === "get_pool_spot_price") {
            if (action.input.coin_in_type) {
                processedInput.coin_in_type = convertCoinSymbolToAddress(action.input.coin_in_type);
            }
            if (action.input.coin_out_type) {
                processedInput.coin_out_type = convertCoinSymbolToAddress(action.input.coin_out_type);
            }
        }
        // Validate inputs against tool definition
        for (const inputDef of toolDef.inputs) {
            if (!inputDef.optional && !(inputDef.name in processedInput)) {
                throw new Error(`Missing required input: ${inputDef.name} for tool ${action.tool}`);
            }
        }
        const toolFunc = toolImplementations[action.tool];
        if (!toolFunc) {
            throw new Error(`Implementation not found for tool: ${action.tool}`);
        }
        // Convert input object to ordered arguments based on tool definition
        const args = toolDef.inputs.map((input) => { var _a; return (_a = processedInput[input.name]) !== null && _a !== void 0 ? _a : input.default; });
        return yield toolFunc(...args);
    });
}
// Add this helper function at the top with other formatting functions
const formatPrice = (price, symbol) => {
    const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: price.current >= 100 ? 2 : 4,
    }).format(price.current);
    const change = price.priceChange24h > 0 ? "+" : "";
    const changePercent = `${change}${price.priceChange24h.toFixed(2)}%`;
    return `${symbol}: ${formattedPrice} (${changePercent})`;
};
const transactionAgent = new transactionAgent_1.TransactionAgent();
function handleTransactionQuery(query, transactionData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Handling transaction query:", { query, transactionData });
            // Extract numbers and addresses from the query
            const amountMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:sui|SUI)/i);
            const addressMatch = query.match(/0x[a-fA-F0-9]{64}/);
            console.log("Matches:", { amountMatch, addressMatch });
            if (amountMatch && addressMatch) {
                const amount = parseFloat(amountMatch[1]);
                const recipient = addressMatch[0];
                console.log("Parsed transfer details:", { amount, recipient });
                try {
                    // Create transaction immediately
                    const transferTx = transactionAgent.buildTransferTx(BigInt(amount * 1e9), // Convert SUI to MIST
                    recipient);
                    console.log("Transaction built successfully");
                    const estimatedGas = yield transactionAgent.estimateGas(transferTx);
                    console.log("Gas estimated:", estimatedGas.toString());
                    const response = {
                        status: "transaction_ready",
                        transaction: {
                            type: "transfer",
                            data: {
                                tx: transferTx,
                                estimatedGas: estimatedGas.toString(),
                            },
                        },
                        final_answer: `Ready to transfer ${amount} SUI to ${recipient}. Estimated gas: ${estimatedGas} MIST.`,
                    };
                    console.log("Transfer transaction ready:", response);
                    return response;
                }
                catch (error) {
                    console.error("Error building transaction:", error);
                    return {
                        status: "error",
                        error: "Failed to build transaction. Please try again.",
                    };
                }
            }
            // If no match found, ask for structured input
            const response = {
                status: "needs_info",
                request: "Please provide the transfer details in this format:\n" +
                    "transfer <amount> SUI to <wallet-address>\n" +
                    "For example: transfer 1 SUI to 0x123...",
                transaction: {
                    type: "transfer",
                    data: null,
                },
            };
            console.log("Requesting structured input:", response);
            return response;
        }
        catch (error) {
            console.error("Error in handleTransactionQuery:", error);
            return {
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error occurred",
            };
        }
    });
}
// Update getPriceInfo to handle transaction queries
function getPriceInfo(query, transactionData) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            console.log("getPriceInfo called with:", { query, transactionData });
            // Check if it's a transaction-related query
            const isTransactionQuery = query.toLowerCase().includes("transfer") ||
                query.toLowerCase().includes("send") ||
                query.toLowerCase().includes("merge coins") ||
                query.toLowerCase().includes("stake") ||
                query.toLowerCase().includes("staking") ||
                query.toLowerCase().includes("balance") ||
                transactionData;
            console.log("Is transaction query:", isTransactionQuery);
            if (isTransactionQuery) {
                console.log("Routing to handleTransactionQuery");
                return handleTransactionQuery(query, transactionData);
            }
            console.log("Query:", query);
            const message = yield anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 500,
                temperature: 0.3,
                messages: [
                    {
                        role: "user",
                        content: (0, prompt_1.createSuiSagePrompt)(query),
                    },
                ],
            });
            const content = message.content[0].type === "text" ? message.content[0].text : "";
            if (!content) {
                throw new Error("No response from Claude");
            }
            console.log("AI Response:", content);
            // Parse the JSON response
            let aiResponse;
            try {
                // First try to parse the entire content
                aiResponse = JSON.parse(content);
            }
            catch (_d) {
                // If that fails, try to extract JSON from markdown code blocks
                const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/) ||
                    content.match(/({[\s\S]*})/);
                if (!jsonMatch) {
                    throw new Error("Could not parse AI response");
                }
                aiResponse = JSON.parse(jsonMatch[1].trim());
            }
            console.log("Parsed Response:", aiResponse);
            // Execute actions if they exist, regardless of status
            const results = [];
            if (aiResponse.actions && aiResponse.actions.length > 0) {
                for (const action of aiResponse.actions) {
                    try {
                        const result = yield executeAction(action);
                        results.push({
                            tool: action.tool,
                            result,
                            action,
                        });
                    }
                    catch (error) {
                        console.error(`Error executing tool ${action.tool}:`, error);
                        return {
                            status: "error",
                            error: error instanceof Error ? error.message : "Tool execution failed",
                        };
                    }
                }
                // Format the results
                let formattedAnswer = "";
                for (const { tool, result, action } of results) {
                    switch (tool) {
                        case "get_pool_info":
                            formattedAnswer = formatPoolInfo(result);
                            break;
                        case "get_pool_spot_price":
                            formattedAnswer = `Spot Price: ${result}`;
                            break;
                        case "get_token_price":
                            const price = result;
                            const symbol = ((_a = action === null || action === void 0 ? void 0 : action.input) === null || _a === void 0 ? void 0 : _a.token_type) || "Token";
                            formattedAnswer = formatPrice(price, symbol);
                            break;
                        case "get_coins_price_info":
                            formattedAnswer = Object.entries(result)
                                .map(([coin, price]) => formatPrice(price, coin))
                                .join("\n");
                            break;
                        case "get_dca_orders":
                            if (!result || (Array.isArray(result) && result.length === 0)) {
                                formattedAnswer = "No active DCA orders found for this wallet.";
                            }
                            else if (Array.isArray(result)) {
                                formattedAnswer = `DCA Orders:\n${result
                                    .map((order, index) => {
                                    return (`${index + 1}. Order ID: ${order.id}\n` +
                                        `   From: ${order.fromCoin}\n` +
                                        `   To: ${order.toCoin}\n` +
                                        `   Amount: ${order.amount}\n` +
                                        `   Frequency: ${order.frequency}`);
                                })
                                    .join("\n\n")}`;
                            }
                            else {
                                formattedAnswer = "Unexpected DCA orders format received.";
                            }
                            break;
                        case "get_all_pools":
                            const pools = result;
                            const sortBy = ((_b = action === null || action === void 0 ? void 0 : action.input) === null || _b === void 0 ? void 0 : _b.sort_by) || "tvl";
                            const limit = ((_c = action === null || action === void 0 ? void 0 : action.input) === null || _c === void 0 ? void 0 : _c.limit) || 10;
                            const sortedPools = pools
                                .sort((a, b) => {
                                switch (sortBy) {
                                    case "apr":
                                        return (b.apr || 0) - (a.apr || 0);
                                    case "fees":
                                        return (b.fee || 0) - (a.fee || 0);
                                    case "tvl":
                                    default:
                                        return (b.tvl || 0) - (a.tvl || 0);
                                }
                            })
                                .slice(0, limit);
                            formattedAnswer = sortedPools
                                .map((pool, index) => {
                                var _a, _b, _c;
                                return `${index + 1}. Pool ${pool.id}
    TVL: $${(_a = pool.tvl) === null || _a === void 0 ? void 0 : _a.toLocaleString()}
    APR: ${(_b = pool.apr) === null || _b === void 0 ? void 0 : _b.toFixed(2)}%
    Daily Fees: $${(_c = pool.fee) === null || _c === void 0 ? void 0 : _c.toLocaleString()}`;
                            })
                                .join("\n\n");
                            break;
                        default:
                            formattedAnswer = JSON.stringify(result, null, 2);
                    }
                }
                // Return the formatted response
                return {
                    status: "success",
                    reasoning: aiResponse.reasoning,
                    results,
                    final_answer: formattedAnswer,
                };
            }
            // If no actions but status is success, return the final answer
            if (aiResponse.status === "success") {
                return {
                    status: "success",
                    reasoning: aiResponse.reasoning,
                    final_answer: aiResponse.final_answer,
                };
            }
            // Handle error case
            if (aiResponse.status === "error") {
                return {
                    status: "error",
                    error: aiResponse.error_message || aiResponse.reasoning,
                };
            }
            // Fallback
            return {
                status: "error",
                error: "Invalid response format",
            };
        }
        catch (error) {
            console.error("Error in getPriceInfo:", error);
            return {
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error occurred",
            };
        }
    });
}
// Example usage
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Test different queries
        const queries = [
            "Get me the prices of SUI and USDC",
            "Show me the current prices of SUI, USDC, and BTC",
            "Get information about pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
            "Get fees for pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78",
            "What's the spot price between afSUI and ksui in pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
            "What are the top pools by tvl?",
            "What are the top pools by fees?",
            "What are the top pools by apr?",
            "What are the top pools by volume?",
            "What are the top pools by liquidity?",
            "What are the top pools by reserves?",
            "What are the top pools by token?",
            "What are the top pools by token?",
        ];
        for (const query of queries) {
            console.log("\n-------------------");
            console.log("Query:", query);
            console.log("-------------------");
            const result = yield getPriceInfo(query);
            console.log("Result:", JSON.stringify(result, null, 2));
        }
    });
}
// Run the example if this file is run directly
if (require.main === module) {
    main().catch(console.error);
}
