import { Hono } from "hono";
import workoutController from "./workoutController";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";

const workouts = new Hono<{Variables: {userId: number}}>();

workouts.use("/*", authMiddleware);

workouts.post("/", workoutController.saveWorkout);

workouts.get("/", workoutController.getWorkoutByUserId);

export default workouts;