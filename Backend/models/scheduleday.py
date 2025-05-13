from extensions import db
from DayWeeks import DayOfWeek 

class ScheduleDay(db.Model):
    __tablename__ = 'schedule_days'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedules.id', ondelete='CASCADE'), nullable=False)
    dia = db.Column(db.Enum(DayOfWeek), nullable=False)
    turno_id = db.Column(db.Integer, db.ForeignKey('turno.id'), nullable=True)

    schedule = db.relationship('Schedule', back_populates='dias')
    turno = db.relationship('Turno')

    def __repr__(self):
        return f'<ScheduleDay {self.id}: schedule={self.schedule_id} dia={self.dia.name} turno={self.turno_id}>'