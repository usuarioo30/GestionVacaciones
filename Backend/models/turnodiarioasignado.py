from extensions import db

class TurnoDiarioAsignado(db.Model):
    __tablename__ = 'turno_diario_asignado'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    turno_id = db.Column(db.Integer, db.ForeignKey('turno.id', ondelete='SET NULL'), nullable=True)

    usuario = db.relationship('Usuario', backref='turnos_diarios')
    turno = db.relationship('Turno')

    def __repr__(self):
        return f'<TurnoDiarioAsignado {self.fecha} - user={self.user_id} turno={self.turno_id}>'