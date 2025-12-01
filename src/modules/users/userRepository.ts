import db from "../../db/db";
import { userRequest } from "../auth/authDto";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";


const userRepository = {

    async saveUser (athlete: userRequest, access_token: string, refresh_token: string, expires_at: number) {

    const expiresAtDate = new Date(expires_at * 1000);

    const [user] = await db.insert(users).values({
            name: `${athlete.firstname} ${athlete.lastname}`,
            stravaId: athlete.id,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: expiresAtDate,

            profileConfig: {
                bio: athlete.bio,
                avatar: athlete.profile,
                city: athlete.city
            }
        }).onConflictDoUpdate({
            target: users.stravaId,
            set: {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: expiresAtDate,
                name: `${athlete.firstname} ${athlete.lastname}`,
                profileConfig: {
                    bio: athlete.bio,
                    avatar: athlete.profile,
                    city: athlete.city
                }
            }
        }).returning();

        return user;
    },

    async getUserById(userId: number) {

        const [user] = await db.select().from(users).where(eq(users.id, userId));

        return user;

    }
}


export default userRepository;