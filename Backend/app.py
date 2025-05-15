from datetime import datetime
from sqlite3 import IntegrityError
from operator import truediv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

from sqlalchemy import extract, func

from calendar import monthrange
import locale
locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
import os
from io import BytesIO
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from DayWeeks import DayOfWeek 
from sqlalchemy import func, case, literal

from models import Usuario, SolicitudDescanso, Schedule, LocalHolidays, Horario, Turno, TurnoDiarioAsignado, ScheduleDay
from extensions import db, jwt 

from routes import *

# Configuración de la base de datos y otros parámetros
class Config:
    SQLALCHEMY_DATABASE_URI = 'mysql://root:Usuario1234@localhost/gestionvacaciones'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'miClave'



# Función para crear la aplicación
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inicializa SQLAlchemy y JWT con la aplicación
    db.init_app(app)
    jwt.init_app(app)

    # Habilita CORS para todas las rutas
    CORS(app, resources={r"/*": {"origins": "http://localhost"}})

    app.register_blueprint(request_bp, url_prefix='/request')
    app.register_blueprint(turnos_bp, url_prefix="/api")
    app.register_blueprint(user_bp, url_prefix="/user")
    app.register_blueprint(localholiday_bp, url_prefix="/api/local-holiday")
    app.register_blueprint(pdf_bp, url_prefix="/api/generar_pdf")

    return app

app = create_app()

# Función para crear un usuario por defecto si no existe
def crear_usuario_por_defecto():
    usuario = Usuario.query.filter_by(username='admin').first()

    if not usuario:
        hashed_password = generate_password_hash('admin')
        nuevo_usuario = Usuario(
            email='admin@apeiroo.com',
            nombreCompleto='Administrador',
            password=hashed_password,
            username='admin',
            rol='admin'
        )

        db.session.add(nuevo_usuario)
        db.session.commit()
        print("Usuario por defecto creado: admin")

def crear_turnos_por_defecto():
    # Verifica si los turnos ya existen
    if not Turno.query.first():  # Si no existen turnos en la base de datos
        turnos = [
            Turno(
                dia_lunes="8:00 a 17:00", dia_martes="8:00 a 17:00", dia_miercoles="Libre", dia_jueves="Libre",
                dia_viernes="Libre", dia_sabado="8:00 a 20:00", dia_domingo="8:00 a 20:00", horas=40, horas_debe=0
            ),
            Turno(
                dia_lunes="23:30 a 8:30", dia_martes="23:30 a 8:30", dia_miercoles="23:30 a 8:30", dia_jueves="23:30 a 8:30",
                dia_viernes="23:30 a 8:30", dia_sabado="Libre", dia_domingo="Libre", horas=40, horas_debe=0
            ),
            Turno(
                dia_lunes="Libre", dia_martes="Libre", dia_miercoles="Oficina", dia_jueves="Oficina",
                dia_viernes="Libre", dia_sabado="20:00 a 8:00", dia_domingo="20:00 a 8:00", horas=40, horas_debe=0
            ),
            Turno(
                dia_lunes="15:00 a 00:00", dia_martes="15:00 a 00:00", dia_miercoles="15:00 a 00:00", dia_jueves="15:00 a 00:00",
                dia_viernes="15:00 a 00:00", dia_sabado="Libre", dia_domingo="Libre", horas=40, horas_debe=0
            ),
            Turno(
                dia_lunes="Oficina", dia_martes="Oficina", dia_miercoles="Oficina", dia_jueves="8:00 a 16:00",
                dia_viernes="8:00 a 16:00", dia_sabado="Libre", dia_domingo="Libre", horas=40, horas_debe=0
            )
        ]
        db.session.add_all(turnos)
        db.session.commit()

# Crear la base de datos y el usuario por defecto
with app.app_context():
    db.create_all()
    crear_usuario_por_defecto()
    crear_turnos_por_defecto()




def checkIfHasVacationsOnDate(usuario_id, fecha_inicio, fecha_fin):

    vacations = SolicitudDescanso.query.filter(
        SolicitudDescanso.usuario_id == usuario_id,
        SolicitudDescanso.fecha_inicio <= fecha_fin,
        SolicitudDescanso.fecha_fin >= fecha_inicio,
        SolicitudDescanso.estado == True
        
    ).all()

    return vacations


@app.route('/api/usuario/<int:user_id>/meses_disponibles', methods=['GET'])
@jwt_required()
def obtener_meses_disponibles_por_usuario(user_id):
    turnos = db.session.query(TurnoDiarioAsignado.fecha).filter_by(user_id=user_id).distinct().all()
    if not turnos:
        return jsonify([]), 200
    
    meses = {turno[0].strftime('%Y-%m') for turno in turnos}
    return jsonify(sorted(list(meses))), 200


# 
# POST: /login
# Response: 200 OK {"access_token": token}
# Response: 401 Unauthorized {"message": "Credenciales inválidas"}
@app.route('/login', methods=['POST'])
def login():
    """
    Endpoint para iniciar sesión y obtener un token JWT
    POST: /login
    Request Body: {"username": username, "password": password}
    Response: 200 OK {"access_tokturen": token}
    Response: 401 Unauthorized {"message": "Credenciales inválidas"}
    """
    data = request.get_json()
    # hashed_password = generate_password_hash(data['password'], method='sha256')
    usuario = Usuario.query.filter_by(username=data['username']).first()

    if not usuario or not check_password_hash(usuario.password, data['password']):
        return jsonify({'message': 'Credenciales inválidas'}), 401

    access_token = create_access_token(
        identity=str(usuario.id), 
        additional_claims={"username": usuario.username, "nombreCompleto": usuario.nombreCompleto, "rol": usuario.rol, "email": usuario.email},
        expires_delta=timedelta(hours=24)),
    return jsonify({'access_token': access_token}), 200

@app.route("/api/google-login", methods=["POST"])
def google_login():
    """
    Endpoint para iniciar sesión con google y obtener un token JWT
    POST: /api/google-login
    Request Body: {"email": email}
    Response: 200 OK {"access_token": token}
    Response: 400 Bad Request {"error": "Email is required"}
    Response: 404 Not Found {"exists": False, "error": "User not found"}
    """

    data = request.json
    if "email" not in data:
        return jsonify({"error": "Email is required"}), 400

    user = Usuario.query.filter_by(email=data["email"]).first()

    if not user:
        return jsonify({"exists": False, "error": "User not found"}), 404

    return jsonify({
        "exists": True,
        "message": f"Welcome {user.username}!",
        "role": user.rol
    }), 200
  

@app.route('/turnos', methods=['GET']) # para pasarle fecha tiene que ser de esta manera: /turnos?fecha=2023-10-01
@jwt_required()
def get_all_turnos():
    try:
        # Obtener la fecha del parámetro en la URL
        fecha_str = request.args.get('fecha')
        if fecha_str:
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido. Usa YYYY-MM-DD."}), 400
        else:
            return jsonify({"error": "Parámetro 'fecha' requerido."}), 400

        # Consulta con filtrado por fecha
        horarios = db.session.query(
            Schedule.id,
            Usuario.nombreCompleto,
            Schedule.inicio_semana,
            Schedule.fin_semana,
            
        ).join(Usuario).filter(
            Schedule.usuario_id == Usuario.id,
            Schedule.inicio_semana <= fecha,
            Schedule.fin_semana >= fecha
        ).all()


        horarios_json = []

        for horario in horarios:

            
            horario_json = {
                "id": horario.id,
                "nombre": horario.nombreCompleto,
                "inicio_semana": horario.inicio_semana.strftime('%Y-%m-%d'),
                "fin_semana": horario.fin_semana.strftime('%Y-%m-%d'),
                "turnos": _get_turnos_por_schedule_id(horario.id),
                "horasTrabajadas": getHoursOfWork(horario.id)
            }

            horarios_json.append(horario_json)

        return jsonify(horarios_json), 200

    except Exception as e:
        return jsonify({
            "error": "Ocurrió un error al obtener los turnos.",
            "message": str(e)
        }), 500

# Este método es para hacer una consulta repetidas veces
def _get_turnos_por_schedule_id(schedule_id):
    try:
        work_days = db.session.query(
            ScheduleDay.dia,
            Turno.hora_inicio,
            Turno.hora_fin
        ).outerjoin(
            Turno, ScheduleDay.turno_id == Turno.id
        ).filter(
            ScheduleDay.schedule_id == schedule_id
        ).all()

        turnos = []
        for dia, hora_inicio, hora_fin in work_days:
            turno = {
                "inicio": hora_inicio.strftime('%H:%M') if hora_inicio else None,
                "fin": hora_fin.strftime('%H:%M') if hora_fin else None
            }
            turnos.append(turno)
        #print(turnos)

        return turnos
    except Exception as e:
        print(f"Error al obtener turnos: {e}")
        return None



def getHoursOfWork(schedule_id):
    # CASE para segundos, igual que antes
    diferencia_segundos = case(
        (Turno.hora_fin >= Turno.hora_inicio,
         func.TIME_TO_SEC(Turno.hora_fin) - func.TIME_TO_SEC(Turno.hora_inicio)),
        else_=(func.TIME_TO_SEC(Turno.hora_fin) + literal(86400)
               - func.TIME_TO_SEC(Turno.hora_inicio))
    )

    # ← aquí el cambio: sumamos segundos y dividimos por 3600 para obtener horas
    total_horas_expr = (func.sum(diferencia_segundos) / literal(3600)).label('total_horas')

    total_horas = (
        db.session.query(total_horas_expr)
        .select_from(ScheduleDay)
        .join(Turno, ScheduleDay.turno_id == Turno.id)
        .filter(ScheduleDay.schedule_id == schedule_id)
        .scalar()
    )

    # total_horas es un float (por ejemplo: 27.75 → 27 h 45 min)
    return round(total_horas, 2)


# Ejecutar el servidor Flask
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)