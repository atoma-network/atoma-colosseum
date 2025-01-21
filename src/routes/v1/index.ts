import { Router } from "express";
const v1Router = Router();
import rootRouter from "./root";
import queryRouter from './query'
v1Router.use(rootRouter)
v1Router.use(queryRouter)
export default v1Router;