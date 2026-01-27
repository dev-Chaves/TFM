import { Hono } from "hono";
import activityController from "./activityController";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";

const activities = new Hono();

activities.use("/*", authMiddleware);

activities.get("/", activityController.getActivities);

export default activities;