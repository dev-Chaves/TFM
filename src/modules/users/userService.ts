import userRepository from "./userRepository";
import { GoalConfig } from "../ai/aiDTO";

const userService = {

    async updateGoal(userId: number, goalData: GoalConfig){

        return userRepository.updateGoal(userId, goalData);

    },

    async updateUserFirstLoginToFalse(userId: number): Promise<string> {
        const user =  userRepository.updateUserFirstLoginToFalse(userId);

        return "false";
    }

}

export default userService;