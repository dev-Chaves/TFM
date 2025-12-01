import db from "../db/db";
import { userRequest } from "../dto/UserDTOs";
import { users } from "../db/schema";


const userRepository = {

    async saveUser (athlete: userRequest, acess_token: string, refresh_token: string, expirest_at: number) {

    const expiresAtDate = new Date(expirest_at * 1000);

    const [user] = await db.insert(users).values({
            name: `${athlete.firstname} ${athlete.lastname}`,
            stravaId: athlete.id,
            accessToken: acess_token,
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
                accessToken: acess_token,
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

}
}


export default userRepository;