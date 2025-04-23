export interface Turno {
    id: number;
    inicio_semana: string;
    fin_semana: string;
    nombre: string;
    turnos: [
        {
            inicio: string;
            fin: string;
        }
    ]
    horasTrabajadas: number;
}
