import { Hono } from "hono";

const auth = new Hono();

auth.get("/login", (c) => {
    
    const stravaUrl: string = `http://www.strava.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=read`;

    return c.redirect(stravaUrl);

})

export default auth;