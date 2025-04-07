export interface SolicitudDescanso {
    id: number;
    usuario_id: number;
    fecha_inicio: Date;
    fecha_fin: Date
    fecha_solicitada: Date
    estado: boolean
    motivo: string;
}