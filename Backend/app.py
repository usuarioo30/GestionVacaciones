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

from routes import request_bp

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

@app.route('/api/asignar_turno', methods=['POST'])
def asignar_turnos_a_usuarios():
    data = request.get_json()
    user_id = data.get('user_id')
    turno_id = data.get('turno_id')
    mes = data.get('mes')  # Formato 'YYYY-MM'

    if not user_id or not turno_id or not mes:
        return {"error": "Faltan parámetros 'user_id', 'turno_id' o 'mes'"}, 400

    usuario = Usuario.query.get(user_id)
    turno = Turno.query.get(turno_id)

    if not usuario or not turno:
        return {"error": "Usuario o turno no encontrado"}, 404

    try:
        # Desglosamos el mes recibido (formato 'YYYY-MM')
        anio, mes_num = map(int, mes.split('-'))

        # Obtenemos el número de días del mes
        dias_en_mes = monthrange(anio, mes_num)[1]
    except ValueError:
        return {"error": "Formato de mes incorrecto, usa 'YYYY-MM'"}, 400

    # Calculamos el primer y último día del mes
    primer_dia = datetime(anio, mes_num, 1).date()
    ultimo_dia = datetime(anio, mes_num, dias_en_mes).date()

    # Eliminar turnos anteriores del usuario en el mes
    TurnoDiarioAsignado.query.filter(
        TurnoDiarioAsignado.user_id == user_id,
        TurnoDiarioAsignado.fecha >= primer_dia,
        TurnoDiarioAsignado.fecha <= ultimo_dia
    ).delete()

    # Asignar el turno diario para cada día del mes
    for i in range(dias_en_mes):
        fecha = primer_dia + timedelta(days=i)
        asignacion = TurnoDiarioAsignado(user_id=user_id, fecha=fecha, turno_id=turno_id)
        db.session.add(asignacion)

    db.session.commit()
    return {"message": f"Turnos diarios asignados correctamente para el mes {mes}"}, 200


@app.route('/api/actualizar_turno_diario', methods=['PUT'])
@jwt_required()
def actualizar_turno_diario():
    data = request.get_json()
    user_id = data.get('user_id')
    fecha_str = data.get('fecha')
    turno_id = data.get('turno_id')

    if not all([user_id, fecha_str, turno_id]):
        return jsonify({"error": "Faltan datos necesarios"}), 400

    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido"}), 400

    asignacion = TurnoDiarioAsignado.query.filter_by(user_id=user_id, fecha=fecha).first()

    if asignacion:
        asignacion.turno_id = turno_id
    else:
        asignacion = TurnoDiarioAsignado(user_id=user_id, fecha=fecha, turno_id=turno_id)
        db.session.add(asignacion)

    db.session.commit()
    return jsonify({"message": "Turno actualizado correctamente"}), 200

@app.route('/api/admin/turnos_semanales', methods=['GET'])
@jwt_required()
def obtener_turnos_semanales_admin():
    turnos_diarios = TurnoDiarioAsignado.query.join(Usuario).join(Turno).all()
    resultado = {}

    for asignacion in turnos_diarios:
        usuario = asignacion.usuario
        turno = asignacion.turno
        fecha = asignacion.fecha
        mes = fecha.strftime('%Y-%m')
        nombre_mes = fecha.strftime('%B').capitalize()

        semana_inicio = fecha - timedelta(days=fecha.weekday())
        semana_fin = semana_inicio + timedelta(days=6)

        primer_dia_mes = fecha.replace(day=1)
        ultimo_dia_mes = fecha.replace(day=monthrange(fecha.year, fecha.month)[1])

        # Nuevo rango real: restringido al mes actual
        inicio_real = max(semana_inicio, primer_dia_mes)
        fin_real = min(semana_fin, ultimo_dia_mes)

        # Semana ID con rango REAL dentro del mes
        semana_id = f"{inicio_real.strftime('%Y-%m-%d')} a {fin_real.strftime('%Y-%m-%d')}"
        semana_texto = f"Semana del {inicio_real.strftime('%d')} al {fin_real.strftime('%d')} de {nombre_mes}"
        semana_num = inicio_real.isocalendar()[1]

        vacaciones = checkIfHasVacationsOnDate(usuario.id, semana_inicio, semana_fin)
        esta_de_vacaciones = any(v.fecha_inicio.date() <= fecha <= v.fecha_fin.date() for v in vacaciones)

        if mes not in resultado:
            resultado[mes] = {"nombre_mes": nombre_mes, "semanas": {}}

        # Importante: clave de semana debe usar semana_id, no solo número
        clave_semana = (usuario.id, semana_id)

        if clave_semana not in resultado[mes]["semanas"]:
            resultado[mes]["semanas"][clave_semana] = {
                "semana": semana_id,
                "semana_texto": semana_texto,
                "usuario": usuario.nombreCompleto,
                "id_usuario": usuario.id,
                "horario": {d: "-" for d in ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']},
                "horas_trabajadas": 0,
                "semana_num": semana_num
            }

        dias_semana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        dia_idx = fecha.weekday()
        dia_nombre_es = dias_semana[dia_idx]

        resultado[mes]["semanas"][clave_semana]["horario"][dia_nombre_es] = (
            "Vacaciones" if esta_de_vacaciones else getattr(turno, f"dia_{dia_nombre_es}")
        )

        if not esta_de_vacaciones and turno:
            resultado[mes]["semanas"][clave_semana]["horas_trabajadas"] += turno.horas / 7

    resultado_final = {}
    dias_ordenados = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

    for mes, data in resultado.items():
        semanas_ordenadas = []
        for semana in sorted(data["semanas"].values(), key=lambda x: x['semana']):
            horario_dict = semana['horario']
            semana['horario'] = [
                {"dia": dia, "turno": horario_dict.get(dia, "-")} for dia in dias_ordenados
            ]
            semanas_ordenadas.append({
                **semana,
                "semana_num": semana["semana_num"]
            })

        resultado_final[mes] = {
            "nombre_mes": data["nombre_mes"],
            "semanas": semanas_ordenadas
        }

    return jsonify(resultado_final), 200

@app.route('/api/admin/turnos_disponibles', methods=['GET'])
@jwt_required()
def obtener_turnos_disponibles_semanales():
    fecha_inicio_str = request.args.get('fecha_inicio')
    if not fecha_inicio_str:
        return jsonify({"error": "Faltan parámetros, se necesita 'fecha_inicio' en formato 'YYYY-MM-DD'"}), 400

    try:
        fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido"}), 400

    fecha_fin = fecha_inicio + timedelta(days=6)

    turnos_disponibles = Turno.query.all()

    resultados = {}

    for turno in turnos_disponibles:
        for dia_semana in range(7):
            dia_nombre_es = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'][dia_semana]

            for usuario in Usuario.query.all():
                if usuario.id not in resultados:
                    resultados[usuario.id] = {
                        "nombre": usuario.nombreCompleto,
                        "turnos_disponibles": {d: [] for d in ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']},
                        "vacaciones": set()
                    }

                resultados[usuario.id]["turnos_disponibles"][dia_nombre_es].append({
                    "turno_id": turno.id,
                    "descripcion": getattr(turno, f"dia_{dia_nombre_es}"),
                    "horario": turno.horas
                })

                vacaciones = checkIfHasVacationsOnDate(usuario.id, fecha_inicio + timedelta(days=dia_semana), fecha_inicio + timedelta(days=dia_semana))
                if vacaciones:
                    resultados[usuario.id]["vacaciones"].add(fecha_inicio + timedelta(days=dia_semana))

    turnos_finales = []

    for usuario_id, usuario_data in resultados.items():
        turnos_finales.append({
            "usuario": usuario_data["nombre"],
            "turnos_disponibles": usuario_data["turnos_disponibles"],
            "vacaciones": list(usuario_data["vacaciones"])
        })

    return jsonify(turnos_finales), 200


def checkIfHasVacationsOnDate(usuario_id, fecha_inicio, fecha_fin):

    vacations = SolicitudDescanso.query.filter(
        SolicitudDescanso.usuario_id == usuario_id,
        SolicitudDescanso.fecha_inicio <= fecha_fin,
        SolicitudDescanso.fecha_fin >= fecha_inicio,
        SolicitudDescanso.estado == True
        
    ).all()

    return vacations

@app.route('/api/horas_turno', methods=['GET'])
@jwt_required()
def get_horas_turno():
    user_id = request.args.get('user_id')
    mes = request.args.get('mes')  # Formato 'YYYY-MM'
    semana_num = request.args.get('semana', type=int)

    if not all([user_id, mes, semana_num]):
        return jsonify({"error": "Faltan parámetros: user_id, mes o semana"}), 400

    try:
        anio, mes_num = map(int, mes.split('-'))
    except ValueError:
        return jsonify({"error": "Formato de mes inválido"}), 400

    # Obtener primer y último día del mes
    dias_en_mes = monthrange(anio, mes_num)[1]
    primer_dia_mes = datetime(anio, mes_num, 1).date()
    ultimo_dia_mes = datetime(anio, mes_num, dias_en_mes).date()

    # Calcular las fechas de todas las semanas en el mes
    semanas = []
    semana_actual = []

    for i in range(dias_en_mes):
        dia = primer_dia_mes + timedelta(days=i)
        if dia.weekday() == 0 and semana_actual:
            semanas.append(semana_actual)
            semana_actual = []
        semana_actual.append(dia)

    if semana_actual:
        semanas.append(semana_actual)

    # Validar número de semana
    if semana_num > len(semanas):
        return jsonify({"error": f"El mes {mes} no tiene la semana número {semana_num}"}), 400

    # Fechas de la semana solicitada
    semana = semanas[semana_num - 1]
    fecha_inicio = semana[0]
    fecha_fin = semana[-1]

    # Obtener asignaciones de esa semana
    asignaciones = TurnoDiarioAsignado.query.join(Turno).filter(
        TurnoDiarioAsignado.user_id == user_id,
        TurnoDiarioAsignado.fecha >= fecha_inicio,
        TurnoDiarioAsignado.fecha <= fecha_fin
    ).all()

    # Obtener vacaciones
    vacaciones = checkIfHasVacationsOnDate(user_id, fecha_inicio, fecha_fin)

    total_horas = 0
    for asignacion in asignaciones:
        fecha = asignacion.fecha
        if any(v.fecha_inicio.date() <= fecha <= v.fecha_fin.date() for v in vacaciones):
            continue  # Día en vacaciones

        turno = asignacion.turno
        if turno:
            # Suponiendo que 'horas' representa las horas semanales, las dividimos por 7
            total_horas += turno.horas / 7  # simplificado

    return jsonify({"horas": round(total_horas, 2)}), 200

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