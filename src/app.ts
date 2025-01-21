import express, { Application } from "express";
import cors from "cors";
import v1routes from "./routes/v1";
const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(v1routes);
export default app;
