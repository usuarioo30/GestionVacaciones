interface Turno {
    domingo: string;
    jueves: string,
    lunes: string,
    martes: string,
    mes: string,
    miercoles: string,
    sabado: string,
    semana_num: number,
    viernes: string
}


export interface TurnosMes {
    horario: Turno,
    semana: string,
    usuario: string,
    horas_trabajadas: number
}
