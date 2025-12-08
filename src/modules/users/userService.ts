import userRepository from "./userRepository";
import { GoalConfig } from "../ai/aiDTO";

const userService = {

    async updateGoal(userId: number, goalData: GoalConfig){

        return userRepository.updateGoal(userId, goalData);

    },

}

export default userService;