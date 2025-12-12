import { Hono } from "hono";
import userController from "./userController";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";

const users = new Hono();

users.use("/*", authMiddleware);

users.patch("/goal", userController.updateGoal);

export default users;