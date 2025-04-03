export class SolicitudDescanso {
    
    id: number;
    usuario_id: number;
    fecha_inicio: Date;
    fecha_fin: Date
    fecha_solicitada: Date
    aprobado: boolean


    constructor(
        id: number,
        usuario_id: number,
        fecha_inicio: Date,
        fecha_fin: Date,  
        fecha_solicitada: Date, 
        aprobado: boolean,
    ) {
        this.id = id;
        this.usuario_id = usuario_id;
        this.fecha_inicio = fecha_inicio;
        this.fecha_fin = fecha_fin;
        this.fecha_solicitada = fecha_solicitada;
        this.aprobado = aprobado;
    }

}