import { Hono } from "hono";
import workoutController from "./workoutController";

const workouts = new Hono();

workouts.post("/", workoutController.saveWorkout);

export default workouts;