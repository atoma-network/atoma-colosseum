import * as dotenv from "dotenv";
dotenv.config();
export default {
  port: process.env.PORT || 2512,
};