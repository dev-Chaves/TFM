import { Context, Hono } from 'hono';
import aiController from './aiController';

const ai = new Hono();

ai.get("/workout", aiController.generateWorkoutPlan);

export default ai;