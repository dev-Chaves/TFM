import { Hono } from "hono";
import webHookController from "./webHookController";

const webhook = new Hono();

webhook.get("/", webHookController.verifyWebHook);

webhook.post("/", webHookController.handleEvent);

webhook.post("/register", webHookController.register);

export default webhook;