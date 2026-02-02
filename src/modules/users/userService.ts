import userRepository from "./userRepository";
import { GoalConfig } from "../../shared/schemas";

/**
 * Response type for goal update
 */
export interface UpdateGoalResponse {
    success: boolean;
}

const userService = {

    /**
     * Atualiza o objetivo do usuário
     */
    async updateGoal(userId: number, goalData: GoalConfig): Promise<void> {
        await userRepository.updateGoal(userId, goalData);
    },

    /**
     * Marca o usuário como já tendo feito login anteriormente
     * @returns "false" para indicar que não é mais primeiro login
     */
    async updateUserFirstLoginToFalse(userId: number): Promise<string> {
        await userRepository.updateUserFirstLoginToFalse(userId);
        return "false";
    }

}

export default userService;