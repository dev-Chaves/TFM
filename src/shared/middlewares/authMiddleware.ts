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
    return c.json({ error: "Token não fornecido ou inválido" }, 401);

  const token = authHeader?.split(" ")[1];

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  try {
    const payload = await verify(token, jwtSecret);

    c.set("userId", Number(payload.sub));

    await next();
  } catch (error) {
    return c.json({ error: "Token inválido ou expirado" }, 401);
  }
});
