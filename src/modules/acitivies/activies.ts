import { Hono } from "hono";
import activityController from "./activityController";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";

const activies = new Hono();

activies.use("/*", authMiddleware);

activies.get("/", activityController.getActivies);

export default activies;