from extensions import db

class LocalHolidays(db.Model):
    __tablename__ = 'local_holidays'

    date = db.Column(db.Date, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f'<LocalHoliday {self.number} {self.year}>'