export interface SolicitudDescanso {
    id: number;
    usuario_id: number;
    fecha_inicio: Date;
    fecha_fin: Date
    fecha_solicitada: Date
    aprobado: boolean
    motivo: string;
}