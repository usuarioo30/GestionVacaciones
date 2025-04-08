export interface AdminRequest {
    id: number;
    usuario_id: number;
    username: string;
    nombreCompleto: string;
    fecha_inicio: string;
    fecha_fin: string
    fecha_solicitada: string
    estado: boolean
    motivo: string;
}