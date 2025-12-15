import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

type Env = {
  Variables: {
    userId: number;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return c.json({ error: "Token não fonercido ou inválido" }, 401);

  const token = authHeader?.split(" ")[1];

  try {
    const payload = await verify(token, process.env.JWT_SECRET!);

    c.set("userId", Number(payload.sub));

    await next();
  } catch (error) {
    return c.json({ error: "Token inválido ou expirado" }, 401);
  }
});
