from extensions import db

class Schedule(db.Model):
    __tablename__ = 'schedules'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False)
    horas_totales = db.Column(db.Float, nullable=True)
    inicio_semana = db.Column(db.Date, nullable=False)
    fin_semana = db.Column(db.Date, nullable=False)

    dias = db.relationship('ScheduleDay', back_populates='schedule', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Schedule {self.id} usuario={self.usuario_id}>'