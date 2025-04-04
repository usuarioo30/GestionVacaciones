export interface SolicitudDescanso {
    id: number;
    usuario_id: string;
    fecha_inicio: Date;
    fecha_fin: Date
    fecha_solicitada: Date
    aprobado: boolean
}