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
    meses = db.session.query(TurnoAsignado.mes).filter_by(user_id=user_id).distinct().all()
    meses_list = [m[0] for m in meses]
    return jsonify(meses_list)

@app.route('/api/generar_pdf/<int:user_id>/<string:mes>', methods=['GET'])
@jwt_required()
def generar_pdf_turnos(user_id, mes):

    usuario = Usuario.query.get(user_id) # Obtener el usuario
    if not usuario:
        return {"error": "Usuario no encontrado"}, 404

    turnos = TurnoAsignado.query.filter_by(user_id=user_id, mes=mes).order_by(TurnoAsignado.semana).all() # Obtener y validar los turnos
    if not turnos:
        return {"error": "No hay turnos asignados para este mes"}, 404

    try:
        anio, mes_num = map(int, mes.split('-')) # Parseo de año y mes y cálculo de días del mes
        dias_en_mes = monthrange(anio, mes_num)[1]
    except ValueError:
        return {"error": "Formato de mes incorrecto, usa 'YYYY-MM'"}, 400

    buffer = BytesIO() #Prepara el buffer y la fuente tipografica

    font_path = os.path.join("fonts", "Montserrat-Regular.ttf")
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont("Montserrat", font_path))
        font_name = "Montserrat"
    else:
        font_name = "Helvetica"

    # Título para el documento PDF (usado internamente, evita 'anonymous')
    nombre_mes = datetime(anio, mes_num, 1).strftime('%B')  # Ej: 'abril'
    pdf_title = f"horario_{usuario.username}_{nombre_mes.capitalize()}_{anio}"

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40,
        title=pdf_title  # << ESTA ES LA LÍNEA CLAVE
    )

    elements = []

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    title_style.fontName = font_name
    title_style.fontSize = 22

    subtitle_style = styles["Heading2"]
    subtitle_style.fontName = font_name
    subtitle_style.fontSize = 14

    elements.append(Paragraph("Horario de Turnos", title_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"<b>Empleado:</b> {usuario.nombreCompleto}", subtitle_style))
    elements.append(Paragraph(f"<b>Mes:</b> {nombre_mes.capitalize()} {anio}", subtitle_style))
    elements.append(Spacer(1, 20))

    encabezado = ['Semana', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    table_data = [encabezado]

    turnos_por_semana = {t.semana: t.turno for t in turnos}
    primer_dia = datetime(anio, mes_num, 1)
    ultimo_dia = datetime(anio, mes_num, dias_en_mes)
    dia_actual = primer_dia
    semanas = []
    semana_actual = []

    while dia_actual <= ultimo_dia:
        if dia_actual.weekday() == 0 and semana_actual:
            semanas.append(semana_actual)
            semana_actual = []
        semana_actual.append(dia_actual)
        dia_actual += timedelta(days=1)
    if semana_actual:
        semanas.append(semana_actual)

    for i, semana in enumerate(semanas):
        turno = turnos_por_semana.get(i + 1)
        fila = ["-" for _ in range(7)]

        semana_inicio = semana[0].day
        semana_fin = semana[-1].day
        etiqueta_semana = f"{semana_inicio:02d}-{semana_fin:02d}"

        if turno:

            vacations = checkIfHasVacationsOnDate(usuario.id, semana[0], semana[-1]) # Verifica si tiene vacaciones en esa semana

            if len(vacations) == 0: # Si tiene vacaciones asigna "VACACIONES" a la semana

                valores = [
                    turno.dia_lunes,
                    turno.dia_martes,
                    turno.dia_miercoles,
                    turno.dia_jueves,
                    turno.dia_viernes,
                    turno.dia_sabado,
                    turno.dia_domingo
                ]
            else:
                valores = ["Vacaciones" for _ in range(7)]
            for dia in semana:
                if dia.month == mes_num:
                    fila[dia.weekday()] = f"{valores[dia.weekday()]}"
        
        table_data.append([etiqueta_semana] + fila)

    table = Table(table_data, repeatRows=1, colWidths=[90] + [100]*7)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), font_name),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#003366")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.8, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f2f2")]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))

    elements.append(table)

    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont(font_name, 10)
        canvas.drawString(landscape(A4)[0] - 100, 20, f"Página {doc.page}")
        canvas.restoreState()

    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{pdf_title}.pdf",
        mimetype='application/pdf'
    )

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


def setNewLocalHoliday():
    try:
        data = request.get_json()


    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al agregar el día festivo", "message": str(e)}), 500

@app.route('/api/local-holiday/all', methods=['GET'])
@jwt_required()
def getAllLocalHolidays():
    local_holidays = LocalHolidays.query.all()
    return jsonify([{
        "date": holiday.date.strftime('%Y-%m-%d'),
        "name": holiday.name
    } for holiday in local_holidays]), 200

@app.route('/api/local-holiday', methods=['GET'])
@jwt_required()
def getLocalHolidays():
    try:

        year = request.args.get('date').split('-')[0]  # Obtener el año de la fecha
        month = request.args.get('date').split('-')[1]  # Obtener el mes de la fecha

        # Obtener los días festivos locales
        local_holidays = LocalHolidays.query.filter(
            extract('month', LocalHolidays.date) == int(month),
            extract('year', LocalHolidays.date) == int(year)
        ).all()

        # Crear una lista de días festivos locales
        
        response = []

        if len(local_holidays) == 0:
            return jsonify(response), 200
        for holiday in local_holidays:
            holiday_json = {
                "date": holiday.date.strftime('%Y-%m-%d'),
                "name": holiday.name
            }
            response.append(holiday_json)

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": "Error al obtener los días festivos locales", "message": str(e)}), 500

@app.route('/api/local-holiday/add', methods=['POST'])
@jwt_required()
def addNewLocalHoliday():
    try:
        data = request.get_json()

        date = data.get("fecha")  # Obtén el string de la fecha
        try:
            formatted_date = datetime.strptime(date, '%Y-%m-%d')  # Convierte el string a datetime
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido. Usa 'YYYY-MM-DD'."}), 400
        
        name = data.get("name")

        localHoliday = LocalHolidays(date=formatted_date, name=name)

        db.session.add(localHoliday)
        db.session.commit()

        return jsonify({
            "date": localHoliday.date.strftime('%Y-%m-%d'),
            "name": localHoliday.name
        }), 200

    except Exception as e:
        return jsonify({"error": "Error al agregar el día festivo", "message": str(e)}), 500

# Ejecutar el servidor Flask
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)