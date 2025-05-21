from extensions import db

class Turno(db.Model):
    __tablename__ = 'turno'
    id = db.Column(db.Integer, primary_key=True)
    dia_lunes = db.Column(db.String(50), nullable=False)
    dia_martes = db.Column(db.String(50), nullable=False)
    dia_miercoles = db.Column(db.String(50), nullable=False)
    dia_jueves = db.Column(db.String(50), nullable=False)
    dia_viernes = db.Column(db.String(50), nullable=False)
    dia_sabado = db.Column(db.String(50), nullable=False)
    dia_domingo = db.Column(db.String(50), nullable=False)
    horas = db.Column(db.Integer, nullable=False)
    horas_debe = db.Column(db.Integer, nullable=False)

    def __repr__(self):
        return f'<Turno {self.id}>'