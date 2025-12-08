import { Hono } from "hono";
import userController from "./userController";

const users = new Hono();

users.patch("/:id/goal", userController.updateGoal);

export default users;