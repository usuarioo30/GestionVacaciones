export interface SolicitudDescanso {
  id: number;
  usuario_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_solicitud: string;
  estado: boolean;
  motivo: string;
}
