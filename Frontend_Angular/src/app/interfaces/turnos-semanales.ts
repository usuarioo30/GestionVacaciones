import { Turno } from "./turno";

export interface TurnosSemanales {
    [semana: string]: {
        [nombre: string]: Turno;
      };
}
