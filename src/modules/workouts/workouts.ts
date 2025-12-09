import { Hono } from "hono";
import workoutController from "./workoutController";

const workouts = new Hono();

workouts.post("/", workoutController.saveWorkout);

workouts.get("/", workoutController.getWorkoutByUserId);

export default workouts;