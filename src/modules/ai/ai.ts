import { Context, Hono } from 'hono';
import aiController from './aiController';

const ai = new Hono();

ai.get("/workout/:id", aiController.generateWorkoutPlan);

export default ai;