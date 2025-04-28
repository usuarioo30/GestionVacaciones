from datetime import datetime
from sqlite3 import IntegrityError
from operator import truediv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from sqlalchemy import or_
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


# Configuración de la base de datos y otros parámetros
class Config:
    SQLALCHEMY_DATABASE_URI = 'mysql://root:Usuario1234@localhost/gestionvacaciones'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'miClave'

# Inicializa la base de datos y JWT
db = SQLAlchemy()
jwt = JWTManager()

class Usuario(db.Model):
    __tablename__ = 'usuario'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    nombreCompleto = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    rol = db.Column(db.String(20), nullable=False)

    def __repr__(self):
        return f'<Usuario {self.username}>'

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


class Horario(db.Model):
    __tablename__ = 'horario'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    start = db.Column(db.DateTime, nullable=False)
    end = db.Column(db.DateTime, nullable=False)
    user = db.relationship('Usuario', backref='horario')

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

class TurnoAsignado(db.Model):
    __tablename__ = 'turno_asignado'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    turno_id = db.Column(db.Integer, db.ForeignKey('turno.id'), nullable=False)
    mes = db.Column(db.String(7), nullable=False)
    semana = db.Column(db.Integer, nullable=False)

    usuario = db.relationship('Usuario', backref='turnos_asignados')
    turno = db.relationship('Turno', backref='turno')


    def to_dict(self):
        return {
            'user_id': self.user_id,
            'mes': self.mes,
            'turno': self.turno.to_dict() if self.turno else None
        }

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

# Función para crear la aplicación
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inicializa SQLAlchemy y JWT con la aplicación
    db.init_app(app)
    jwt.init_app(app)

    # Habilita CORS para todas las rutas
    CORS(app, resources={r"/*": {"origins": "http://localhost"}})

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

@app.route('/api/usuario/<int:user_id>/turno/<string:mes>', methods=['GET'])
@jwt_required()
def obtener_turno_mensual(user_id, mes):
    asignado = TurnoAsignado.query.filter_by(user_id=user_id, mes=mes).first()
    
    if not asignado or not asignado.turno:
        return jsonify({"error": "No hay turno asignado para este mes"}), 404

    turno = asignado.turno
    
    # Convertir el mes a un nombre completo
    try:
        anio, mes_num = map(int, mes.split('-'))
        nombre_mes = datetime(anio, mes_num, 1).strftime('%B')
    except ValueError:
        return jsonify({"error": "Formato de mes incorrecto, usa 'YYYY-MM'"}), 400

    return jsonify({
        "turno": {
            "mes": nombre_mes,
            "dias": {
                "lunes": turno.dia_lunes,
                "martes": turno.dia_martes,
                "miércoles": turno.dia_miercoles,
                "jueves": turno.dia_jueves,
                "viernes": turno.dia_viernes,
                "sábado": turno.dia_sabado,
                "domingo": turno.dia_domingo
            }
        }
    })

@app.route('/api/asignar_turno', methods=['POST'])
def asignar_turnos_a_usuarios():
    data = request.get_json()

    user_id = data.get('user_id')
    turno_id = data.get('turno_id')
    mes = data.get('mes')

    if not user_id or not turno_id or not mes:
        return {"error": "Faltan parámetros 'user_id', 'turno_id' o 'mes'"}, 400

    usuario = Usuario.query.get(user_id)
    turno = Turno.query.get(turno_id)

    if not usuario or not turno:
        return {"error": "Usuario o turno no encontrado"}, 404

    # Verificar si ya existe una asignación de turno para este usuario en el mes
    turno_existente = TurnoAsignado.query.filter_by(user_id=user_id, mes=mes).first()
    if turno_existente:
        return {"error": "Este usuario ya tiene un turno asignado para el mes indicado"}, 409

    # Calcular el mes anterior
    anio, mes_num = map(int, mes.split('-'))
    mes_anterior = (mes_num - 1) if mes_num > 1 else 12
    anio_anterior = anio if mes_num > 1 else anio - 1
    mes_anterior_str = f"{anio_anterior}-{mes_anterior:02d}"

    # Verificar si el usuario tiene asignado el mismo turno en el mes anterior
    turno_mes_anterior = TurnoAsignado.query.filter_by(user_id=user_id, mes=mes_anterior_str).first()
    if turno_mes_anterior and turno_mes_anterior.turno_id == turno_id:
        return {"error": "El usuario ya tiene asignado este turno en el mes anterior"}, 409

    # Si no hay conflicto, asignamos el nuevo turno

    try:
        dias_en_mes = monthrange(anio, mes_num)[1]
    except ValueError:
        return {"error": "Formato de mes incorrecto, usa 'YYYY-MM'"}, 400

    fecha_base = datetime(anio, mes_num, 1)
    primer_dia_mes = fecha_base
    ultimo_dia_mes = fecha_base.replace(day=dias_en_mes)

    # Construir semanas SOLO dentro del mes
    semanas = []
    semana_actual = []

    for dia in (primer_dia_mes + timedelta(days=i) for i in range(dias_en_mes)):
        if dia.weekday() == 0 and semana_actual:
            semanas.append(semana_actual)
            semana_actual = []
        semana_actual.append(dia)

    # Asegurarse de que si la última semana quedó incompleta, la agregamos también
    if semana_actual:
        semanas.append(semana_actual)

    # Borrar turnos anteriores del mismo mes
    TurnoAsignado.query.filter_by(user_id=user_id, mes=mes).delete()

    # Asignar turnos por semana (dentro del mes únicamente)
    for i, semana in enumerate(semanas):
        asignacion = TurnoAsignado(
            user_id=user_id,
            turno_id=turno_id,
            mes=mes,
            semana=i + 1
        )
        db.session.add(asignacion)

    db.session.commit()

    return {"message": f"Turno asignado correctamente para el mes {mes}"}, 200


@app.route('/api/actualizar_turno', methods=['PUT'])
@jwt_required()
def actualizar_turno():
    data = request.get_json()

    user_id = data.get('user_id')
    mes = data.get('mes')
    semana = data.get('semana')
    nuevo_turno_id = data.get('nuevo_turno_id')

    if not user_id or not mes or not semana or not nuevo_turno_id:
        return jsonify({"error": "Faltan parámetros requeridos"}), 400

    asignacion = TurnoAsignado.query.filter_by(
        user_id=user_id, mes=mes, semana=semana
    ).first()
    if not asignacion:
        return jsonify({"error": "No se encontró asignación para ese usuario, mes y semana"}), 404

    conflicto = TurnoAsignado.query.filter(
        TurnoAsignado.turno_id == nuevo_turno_id,
        TurnoAsignado.mes == mes,
        TurnoAsignado.semana == semana,
        TurnoAsignado.user_id != user_id
    ).first()
    if conflicto:
        return jsonify({"error": "Ese turno ya está asignado a otro usuario en esa semana"}), 409

    asignacion.turno_id = nuevo_turno_id
    db.session.commit()
    return jsonify({
        "message": f"Turno actualizado correctamente para la semana {semana} del mes {mes}"
    }), 200


@app.route('/api/turnos_disponibles', methods=['GET'])
@jwt_required()
def obtener_turnos_disponibles():
    turnos_disponibles = db.session.query(Turno).outerjoin(TurnoAsignado, Turno.id == TurnoAsignado.turno_id).filter(TurnoAsignado.id == None).all()

    if not turnos_disponibles:
        return jsonify({"message": "No hay turnos disponibles"}), 404

    turnos_list = []
    for turno in turnos_disponibles:
        turnos_list.append({
            "id": turno.id,
            "lunes": turno.dia_lunes,
            "martes": turno.dia_martes,
            "miercoles": turno.dia_miercoles,
            "jueves": turno.dia_jueves,
            "viernes": turno.dia_viernes,
            "sabado": turno.dia_sabado,
            "domingo": turno.dia_domingo,
            "horas": turno.horas,
            "horas_debe": turno.horas_debe
        })

    return jsonify(turnos_list), 200





@app.route('/api/admin/turnos_semanales', methods=['GET'])
@jwt_required()
def obtener_turnos_semanales_admin():
    turnos_asignados = TurnoAsignado.query.all()
    resultado = {}

    for asignacion in turnos_asignados:
        usuario = asignacion.usuario
        turno = asignacion.turno
        mes = asignacion.mes

        try:
            anio, mes_num = map(int, mes.split('-'))
            nombre_mes = datetime(anio, mes_num, 1).strftime('%B')
        except ValueError:
            nombre_mes = 'Mes no válido'

        dias_en_mes = monthrange(anio, mes_num)[1]
        primer_dia_mes = datetime(anio, mes_num, 1)
        ultimo_dia_mes = datetime(anio, mes_num, dias_en_mes)

        dias_semana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        valores_turno = [
            turno.dia_lunes, turno.dia_martes, turno.dia_miercoles,
            turno.dia_jueves, turno.dia_viernes, turno.dia_sabado, turno.dia_domingo
        ]

        semanas = []
        semana_actual = []

        for i in range(dias_en_mes):
            dia_actual = primer_dia_mes + timedelta(days=i)
            if dia_actual.weekday() == 0 and semana_actual:
                semanas.append(semana_actual)
                semana_actual = []
            semana_actual.append(dia_actual)

        if semana_actual:
            semanas.append(semana_actual)

        for idx, semana in enumerate(semanas):
            if idx + 1 == asignacion.semana:
                semana_completa = ["-" for _ in range(7)]
                for dia in semana:
                    semana_completa[dia.weekday()] = valores_turno[dia.weekday()]

                semana_str = f"Semana del {semana[0].strftime('%d')} al {semana[-1].strftime('%d')} de {nombre_mes}"
                horario_semana = dict(zip(dias_semana, semana_completa))
                horario_semana['mes'] = mes
                horario_semana['semana_num'] = asignacion.semana

                if mes not in resultado:
                    resultado[mes] = []

                resultado[mes].append({
                    "semana": semana_str,
                    "usuario": usuario.nombreCompleto,
                    "horario": horario_semana
                })

    resultado_ordenado = {
        mes: sorted(semanas, key=lambda x: x['horario']['semana_num']) for mes, semanas in resultado.items()
    }

    return jsonify(resultado_ordenado)

@app.route('/api/usuario/<int:user_id>/meses_disponibles', methods=['GET'])
@jwt_required()
def obtener_meses_disponibles_por_usuario(user_id):
    meses = db.session.query(TurnoAsignado.mes).filter_by(user_id=user_id).distinct().all()
    meses_list = [m[0] for m in meses]
    return jsonify(meses_list)

@app.route('/api/usuarios_con_turnos', methods=['GET'])
@jwt_required()
def obtener_usuarios_con_turnos():
    # Subconsulta: obtener IDs únicos de usuarios con turnos
    usuarios_ids = db.session.query(TurnoAsignado.user_id).distinct().all()
    ids = [id[0] for id in usuarios_ids]

    if not ids:
        return jsonify([])

    # Obtener usuarios que tienen turnos asignados
    usuarios = Usuario.query.filter(Usuario.id.in_(ids)).all()

    resultado = [{
        "id": u.id,
        "nombreCompleto": u.nombreCompleto
    } for u in usuarios]

    return jsonify(resultado)

@app.route('/api/generar_pdf/<int:user_id>/<string:mes>', methods=['GET'])
@jwt_required()
def generar_pdf_turnos(user_id, mes):
    usuario = Usuario.query.get(user_id)
    if not usuario:
        return {"error": "Usuario no encontrado"}, 404

    turnos = TurnoAsignado.query.filter_by(user_id=user_id, mes=mes).order_by(TurnoAsignado.semana).all()
    if not turnos:
        return {"error": "No hay turnos asignados para este mes"}, 404

    try:
        anio, mes_num = map(int, mes.split('-'))
        dias_en_mes = monthrange(anio, mes_num)[1]
    except ValueError:
        return {"error": "Formato de mes incorrecto, usa 'YYYY-MM'"}, 400

    buffer = BytesIO()

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
            valores = [
                turno.dia_lunes,
                turno.dia_martes,
                turno.dia_miercoles,
                turno.dia_jueves,
                turno.dia_viernes,
                turno.dia_sabado,
                turno.dia_domingo
            ]
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


@app.route('/user/create', methods=['POST'])
@jwt_required()  # El usuario debe estar autenticado con JWT
def registrar_usuario():
    """
    Endpoint para crear un nuevo usuario
    POST: /createUser
    """
    # Verificar que se está enviando JSON
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Datos JSON no proporcionados o mal formateados'}), 400

    # Obtener los claims del JWT, que contienen el rol del usuario
    claims = get_jwt()
    rol = claims.get('rol')

    # Verificar si el usuario tiene el rol de 'admin'
    if rol != 'admin':
        return jsonify({'message': 'No tienes permisos para crear usuarios'}), 403

    # Hash de la contraseña
    hashed_password = generate_password_hash(data['password'])

    # Crear el nuevo usuario
    nuevo_usuario = Usuario(
        email=data['email'],
        nombreCompleto=data['nombreCompleto'],
        password=hashed_password,
        username=data['username'],
        rol=data['rol']
    )

    try:
        db.session.add(nuevo_usuario)
        db.session.commit()
        return jsonify({'message': 'Usuario creado exitosamente'}), 201
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'message': 'El usuario ya existe', 'error': str(e)}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error al crear el usuario', 'error': str(e)}), 500

@app.route('/user/<int:user_id>', methods=['GET'])
@jwt_required()
def getUserById(user_id):
    try:
        # Obtener el usuario de la base de datos
        usuario = Usuario.query.get_or_404(user_id)

        # Si el usuario no existe
        if not usuario:
            return jsonify({"message": "Usuario no encontrado"}), 404

        # Devolver los datos del usuario
        return jsonify({
            'id': usuario.id,
            'username': usuario.username,
            'nombreCompleto': usuario.nombreCompleto
        }), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener la información del usuario", "message": str(e)}), 500

@app.route('/user/list', methods=['GET'])
@jwt_required()
def getAllUsers():
    try:
        claims = get_jwt()
        rol = claims.get("rol")

        if rol != 'admin':
            return jsonify({"message": "Acceso no autorizado. Solo los administradores pueden ver este recurso."}), 403

        users = Usuario.query.all()

        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'nombreCompleto': user.nombreCompleto,
                'username': user.username,
                'email': user.email,
                'rol': user.rol,
            })

        return jsonify({"users": users_data}), 200

    except Exception as e:
        return jsonify({"error": "Ha ocurrido un error al obtener los usuarios", "message": str(e)}), 500

@app.route('/user/users', methods=['GET'])
@jwt_required()
def getAllUsers2():
    try:
        claims = get_jwt()
        rol = claims.get("rol")

        users = Usuario.query.filter(Usuario.rol == 'user').all()

        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'nombreCompleto': user.nombreCompleto,
                'username': user.username,
                'email': user.email,
                'rol': user.rol,
            })

        return jsonify({"users": users_data}), 200

    except Exception as e:
        return jsonify({"error": "Ha ocurrido un error al obtener los usuarios", "message": str(e)}), 500

    


@app.route('/user/list/min', methods=['GET'])
@jwt_required()
def getAllUsersMin():
    try:
        claims = get_jwt()
        rol = claims.get("rol")

        if rol != 'admin':
            return jsonify({"message": "Acceso no autorizado. Solo los administradores pueden ver este recurso."}), 403

        users =  db.session.query(
            Usuario.id,
            Usuario.nombreCompleto,
            Usuario.username,
            Usuario.rol
        ).join(SolicitudDescanso).filter(SolicitudDescanso.estado == 1).group_by(Usuario.id).all()

        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'nombreCompleto': user.nombreCompleto,
                'rol': user.rol
            })

        return jsonify(users_data), 200

    except Exception as e:
        return jsonify({"error": "Ha ocurrido un error al obtener los usuarios", "message": str(e)}), 500



@app.route('/user/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def eliminar_usuario(id):
    """
    Endpoint para eliminar un usuario.
    DELETE: /user/delete/{id}
    Response: 200 OK {"message": "Usuario eliminado correctamente"}
    Response: 404 Not Found {"error": "Usuario no encontrado"}
    Response: 403 Forbidden {"error": "No tienes permisos para eliminar este usuario"}
    Response: 500 Internal Server Error {"error": "Hubo un error al eliminar el usuario"}
    """
    try:
        usuario_id = get_jwt_identity()

        claims = get_jwt()
        rol = claims.get('rol')

        if rol != 'admin':
            return jsonify({'error': 'No tienes permisos para eliminar este usuario'}), 403

        if id == usuario_id:
            return jsonify({'error': 'No puedes eliminar tu propio usuario'}), 403

        usuario = Usuario.query.get(id)

        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        db.session.delete(usuario)
        db.session.commit()

        return jsonify({'message': 'Usuario eliminado correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Hubo un error al eliminar el usuario', 'message': str(e)}), 500

@app.route('/user/edit/<int:id>', methods=['PUT'])
@jwt_required()
def editar_usuario(id):
    try:
        # Obtener los datos enviados en el cuerpo de la solicitud
        data = request.get_json()

        # Verificar que se enviaron los datos necesarios
        if not data:
            return jsonify({'message': 'No se enviaron datos para editar el usuario'}), 400

        # Obtener el usuario a editar de la base de datos
        usuario = Usuario.query.get_or_404(id)

        # Verificar si el usuario que hace la solicitud es el mismo que se está editando
        from flask_jwt_extended import get_jwt_identity
        current_user_id = get_jwt_identity()  # El ID del usuario que hizo la solicitud

        # Actualizar los datos del usuario sin validaciones adicionales
        usuario.nombreCompleto = data.get('nombreCompleto', usuario.nombreCompleto)
        usuario.username = data.get('username', usuario.username)
        usuario.email = data.get('email', usuario.email)

        # Solo actualizar la contraseña si se proporciona una nueva
        nueva_contraseña = data.get('password')
        if nueva_contraseña:
            usuario.password = generate_password_hash(nueva_contraseña)

        # Guardar los cambios en la base de datos
        db.session.commit()

        # Crear un nuevo token con los datos actualizados
        access_token = create_access_token(
            identity=str(usuario.id), 
            additional_claims={
                "username": usuario.username, 
                "nombreCompleto": usuario.nombreCompleto, 
                "rol": usuario.rol, 
                "email": usuario.email
            },
            expires_delta=timedelta(hours=24)
        )

        # Devolver el mensaje de éxito y el nuevo token
        return jsonify({
            'message': 'Usuario editado correctamente',
            'access_token': access_token  # Devolver el nuevo token
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error al editar el usuario', 'error': str(e)}), 500

# ----------------Inicio endpoints para las solicitudes de descanso-------------------------------

@app.route('/request/edit/<int:id>', methods=['PUT'])
@jwt_required()
def editar_solicitud(id):
    """
    Endpoint para editar una solicitud de descanso.
    PUT: /request/edit/{id}
    Request Body: {"fecha_inicio": "YYYY-MM-DD", "fecha_fin": "YYYY-MM-DD", "motivo": "string"}
    Response: 200 OK {"message": "Solicitud editada correctamente"}
    Response: 400 Bad Request {"error": "Faltan datos"}
    Response: 404 Not Found {"error": "Solicitud no encontrada"}
    Response: 403 Forbidden {"error": "No tienes permisos para editar esta solicitud"}
    Response: 500 Internal Server Error {"error": "Hubo un error al editar la solicitud"}
    """
    try:
        # Obtener el usuario autenticado
        claims = get_jwt()
        rol = claims.get('rol')

        # Buscar la solicitud por ID
        solicitud = SolicitudDescanso.query.get(id)

        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404

        if solicitud.estado is not None:
            return jsonify({'error': 'Solo se puede editar una solicitud pendiente'}), 403

        if rol not in ['admin', 'user']:
            return jsonify({'error': 'No tienes permisos para editar esta solicitud'}), 403

        data = request.get_json()

        fecha_inicio = data.get("fecha_inicio")
        fecha_fin = data.get("fecha_fin")
        motivo = data.get("motivo")

        if not all([fecha_inicio, fecha_fin, motivo]):
            return jsonify({"error": "Faltan datos"}), 400

        try:
            fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido. Usa 'YYYY-MM-DD'."}), 400

        solicitud.fecha_inicio = fecha_inicio
        solicitud.fecha_fin = fecha_fin
        solicitud.motivo = motivo

        db.session.commit()

        return jsonify({'message': 'Solicitud editada correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Hubo un error al editar la solicitud', 'message': str(e)}), 500


@app.route("/request/register", methods=["POST"])
@jwt_required()
def registrarSolicitudes():

    usuario_id = get_jwt_identity()

    claims = get_jwt()

    rol = claims.get('rol')

    if rol != 'user':
        return jsonify({"error": "Un admin no puede crear una solicitud"}), 403

    data = request.get_json()

    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")
    motivo = data.get("motivo")

    if not all([fecha_inicio, fecha_fin, motivo]):
        return jsonify({"error": "Faltan datos"}), 400

    try:
        fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
        fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')

        nueva_solicitud = SolicitudDescanso(
            usuario_id=usuario_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            motivo=motivo
        )
        db.session.add(nueva_solicitud)
        db.session.commit()
        return jsonify({"message": "Solicitud registrada correctamente"}), 201

    except Exception as e:
        return jsonify({"error": "Error al registrar su solicitud", "message": str(e)}), 500


  

@app.route('/request/manage/<int:id>', methods=['PUT'])
@jwt_required()
def manageRequest(id):
    """
    Endpoint para aceptar o rechazar una solicitud
    PUT: /request/manage/{id}
    Request Body: {"aprobado": True/False}
    Response: 200 OK {"message": message}
    Response: 404 Not Found {"message": "Solicitud no encontrada"}
    Response: 500 Internal Server Error {"message": "Error al editar la solicitud", "error": str(e)}
    """
    try:
        # Obtener el usuario autenticado
        usuarioId = get_jwt_identity()
        
        usuario_actual = Usuario.query.filter_by(id=usuarioId).first()


        # Verificar si el usuario es admin
        if usuario_actual.rol != 'admin':
            return jsonify({"error": "No tienes permisos para gestionar solicitudes"}), 403

        solicitud = SolicitudDescanso.query.get(id)
        
        if solicitud:
            # Obtener el dato de aprobación del cuerpo de la solicitud
            data = request.get_json()
            estado = data.get('estado')

            if estado is None:
                return jsonify({"error": "Falta el parámetro 'aprobado'"}), 400

            # Actualizar la solicitud con la aprobación
            solicitud.estado = estado
            db.session.commit()
            
            message = "Solicitud " + ("aprobada" if estado else "rechazada") + " con éxito"
            return jsonify({"message": message}), 200
        else:
            return jsonify({"message": "Solicitud no encontrada"}), 404
    except Exception as e:
        return jsonify({"message": "Error al editar la solicitud", "error": str(e)}), 500
  

@app.route('/request/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def eliminar_solicitud(id):
    """
    Endpoint para eliminar una solicitud.
    DELETE: /request/delete/{id}
    Response: 200 OK {"message": "Solicitud eliminada correctamente"}
    Response: 404 Not Found {"error": "Solicitud no encontrada"}
    Response: 403 Forbidden {"error": "No tienes permisos para eliminar esta solicitud"}
    Response: 500 Internal Server Error {"error": "Hubo un error al eliminar la solicitud"}
    """
    try:
        # Obtener el usuario autenticado (ID del usuario desde el JWT)
        claims = get_jwt()  # Obtenemos los claims del JWT
        rol = claims.get('rol')  # Obtener el rol del usuario desde los claims

        # Buscar la solicitud por ID
        solicitud = SolicitudDescanso.query.get(id)

        # Verificar si la solicitud existe
        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404

        # Verificar si el rol es 'admin' o 'user'
        if rol in ['admin', 'user']:
            # Si es admin o user, puede eliminar la solicitud sin importar el creador
            db.session.delete(solicitud)
            db.session.commit()

            return jsonify({'message': 'Solicitud eliminada correctamente'}), 200
        else:
            # Si el rol no es 'admin' ni 'user', no tiene permisos para eliminar
            return jsonify({'error': 'No tienes permisos para eliminar esta solicitud'}), 403

    except Exception as e:
        # En caso de error, revertir cualquier cambio en la base de datos
        db.session.rollback()
        return jsonify({'error': 'Hubo un error al eliminar la solicitud', 'message': str(e)}), 500


@app.route('/request/list', methods=['GET'])
@jwt_required()
def listar_solicitudes():
    try:
        usuario_id = get_jwt_identity()
        claims = get_jwt()

        rol = claims.get('rol')

        if rol != 'user':
            return jsonify({"error": "No tienes permisos para acceder a esta lista de solicitudes."}), 403

        solicitudes = SolicitudDescanso.query.filter_by(usuario_id=usuario_id, estado=None).all()

        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500

@app.route('/request/list-admin', methods=['GET'])
@jwt_required()
def listar_solicitudes_admin():
    try:
        # Obtener la identidad del usuario autenticado
        claims = get_jwt()

        rol = claims.get('rol')

        if rol != 'admin':
            # Si no es admin, se retorna un error
            return jsonify({"error": "No tienes permisos para acceder a esta lista de solicitudes."}), 403

        # Si el rol es 'admin', se devuelven todas las solicitudes
        solicitudes = SolicitudDescanso.query.filter(SolicitudDescanso.estado==None).all() # No me reconoce null, usé None

        # Formatear las solicitudes para la respuesta JSON
        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500
    

@app.route('/request/list-admin/all', methods=['GET'])
@jwt_required()
def listar_todas_solicitudes_admin():
    try:
        # Obtener la identidad del usuario autenticado
        claims = get_jwt()

        rol = claims.get('rol')

        if rol != 'admin':
            # Si no es admin, se retorna un error
            return jsonify({"error": "No tienes permisos para acceder a esta lista de solicitudes."}), 403

        # Si el rol es 'admin', se devuelven todas las solicitudes
        resultados = db.session.query(SolicitudDescanso, Usuario.username, Usuario.nombreCompleto, Usuario.id)\
        .join(Usuario, SolicitudDescanso.usuario_id == Usuario.id)\
        .filter(SolicitudDescanso.estado.isnot(None))\
        .all()

        data = [
            {
                "id": solicitud.id,
                "estado": solicitud.estado,
                "motivo": solicitud.motivo,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "usuario_id": usuario_id,
                "username": username,
                "nombreCompleto": nombreCompleto
                
            }
            for solicitud, username, nombreCompleto, usuario_id in resultados
        ]
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500


# Obtener todas las solicitudes de un usuario
@app.route('/request/<int:user>', methods=['GET'])
@jwt_required()
def getUserRequest(user):
    try:
        solicitudes = SolicitudDescanso.query.filter(
            SolicitudDescanso.usuario_id == user,
            SolicitudDescanso.estado != None
        ).all()

        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500


@app.route('/request/accepted/<int:user>', methods=['GET'])
@jwt_required()
def getAcceptedUserRequest(user):
    try:

        # consulta principal: estado aceptado y (propias o de los que te han compartido)
        solicitudes = (
            SolicitudDescanso.query
            .filter(
                SolicitudDescanso.estado == True,
                SolicitudDescanso.usuario_id == user,
            )
            .all()
        )


        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500


@app.route('/request/accepted', methods=['GET'])
@jwt_required()
def getAcceptedRequests():
    try:
        solicitudes = SolicitudDescanso.query.filter(
            SolicitudDescanso.estado == True
        ).all()

        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500

@app.route('/request/compare', methods=['POST'])
@jwt_required()
def compareRequests():

    try:
        data = request.get_json() # Esto es para obtener el cuerpo en json

        fecha_inicio_str = data['fecha_inicio']
        fecha_fin_str = data['fecha_fin']

        if not fecha_inicio_str or not fecha_fin_str:
            return jsonify({"error": "Faltan fechas en los parámetros."}), 400

        # Convertir strings a datetime
        fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d')
        fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d')

        solicitudes = SolicitudDescanso.query.filter(
            SolicitudDescanso.estado == True,
            SolicitudDescanso.fecha_inicio <= fecha_fin,
            SolicitudDescanso.fecha_fin >= fecha_inicio
        ).all()

        solicitudes_descanso = []

        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }

            solicitudes_descanso.append(solicitud_info)

        return jsonify(solicitudes_descanso), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500

# --------- Fin endpoints para las solicitudes de descanso -------------------

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


#@app.route('/schedule/<int:schedule_id>/total_horas', methods=['GET'])
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