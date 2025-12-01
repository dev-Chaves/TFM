import { Context } from "hono";
import activityService from "./activityService";

const activityController = {

    async getActivies(c: Context) {

        const id = Number(c.req.param('id'));

        if(Number.isNaN(id)) return c.json({erro: `ID Inválido`}, 400);

        const error = c.req.query("error");

        if(error) return c.json({error: "Erro ao acessar atividades do atleta"}, 400);

        try {

            const response = await activityService.syncActivies(id);

            return c.json(response);

        }catch (err) {

            console.error(err);

            return c.json({
                error: "Erro interno no servidor."
            }, 500)

        }

        

    }

}

export default activityController;