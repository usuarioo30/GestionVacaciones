export interface TurnosSemanales {
  [mes: string]: {
    nombre_mes: string;
    semanas: {
      semana: string;
      usuario: string;
      horario: {
        dia: string;
        turno: string;
      }[];
      horas_trabajadas: number;
      semana_num: number;
    }[];
  };
}