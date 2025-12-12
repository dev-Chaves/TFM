import { Context, Hono } from 'hono';
import aiController from './aiController';
import { authMiddleware } from '../../shared/middlewares/authMiddleware';

const ai = new Hono();

ai.use("/*", authMiddleware);

ai.get("/workout", aiController.generateWorkoutPlan);

export default ai;