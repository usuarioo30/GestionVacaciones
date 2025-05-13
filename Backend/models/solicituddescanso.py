from extensions import db
from datetime import datetime


class SolicitudDescanso(db.Model):
    __tablename__ = 'solicitudDescanso'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id', ondelete="CASCADE"), nullable=False)
    fecha_inicio = db.Column(db.DateTime, nullable=False)
    fecha_fin = db.Column(db.DateTime, nullable=False)
    fecha_solicitud = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.Boolean, nullable=True, default=None)
    motivo = db.Column(db.String(255), nullable=True)

    usuario = db.relationship('Usuario', backref=db.backref('solicitudes', cascade="all, delete-orphan"))

    def __repr__(self):
        return f'<SolicitudDescanso {self.id}>'