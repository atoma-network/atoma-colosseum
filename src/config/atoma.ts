require("dotenv").config();
import { AtomaSDK } from "atoma-sdk";
const atomaSDK = new AtomaSDK({
  bearerAuth: process.env.ATOMASDK_BEARER_AUTH,
});

async function atomaChat(messages:{content:string,role:string}[],model?:string){
 return await atomaSDK.chat.create({
  messages,
  model: model||"meta-llama/Llama-3.3-70B-Instruct",
  maxTokens: 128,
});
}

export {atomaChat}
export default atomaSDK;
