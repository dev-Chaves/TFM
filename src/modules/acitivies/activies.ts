import { Hono } from "hono";
import activityController from "./activityController";

const activies = new Hono();

activies.get("/:id", activityController.getActivies);

export default activies;