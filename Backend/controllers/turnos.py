from extensions import *
from flask import jsonify
# from flask_jwt_extended import get_jwt, get_jwt_identity
from models import Turno, Usuario, TurnoDiarioAsignado, SolicitudDescanso
from datetime import datetime, timedelta
from calendar import monthrange
import locale
locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')



def asignar_turnos_a_usuarios(data):
    
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



def actualizar_turno_diario(data):
    
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



def obtener_turnos_disponibles_semanales(fecha_inicio_str):
    
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


def get_horas_turno(user_id, mes, semana_num):


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


def checkIfHasVacationsOnDate(usuario_id, fecha_inicio, fecha_fin):

    vacations = SolicitudDescanso.query.filter(
        SolicitudDescanso.usuario_id == usuario_id,
        SolicitudDescanso.fecha_inicio <= fecha_fin,
        SolicitudDescanso.fecha_fin >= fecha_inicio,
        SolicitudDescanso.estado == True
        
    ).all()

    return vacations