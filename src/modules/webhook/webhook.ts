import { Hono } from "hono";
import webHookController from "./webHookController";

const webhook = new Hono();

webhook.get("/", webHookController.verifyWebHook);

webhook.post("/", webHookController.handleEvent);

export default webhook;