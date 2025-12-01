import { Hono } from "hono";
import userController from "./authController";

const auth = new Hono();

const redirectUrl: string = `http://localhost:${process.env.PORT}/auth/exchange_token`;

auth.get("/login", (c) => {

    const scope = "read,activity:read_all";
    
    const stravaUrl: string = `http://www.strava.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${redirectUrl}&approval_prompt=force&scope=${scope}`;
    
    return c.redirect(stravaUrl);

});

auth.get("/exchange_token", userController.exchangeTokenHandler);

export default auth;