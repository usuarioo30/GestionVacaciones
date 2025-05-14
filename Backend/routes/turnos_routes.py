from flask import Blueprint, request
from controllers import turnos
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

turnos_bp = Blueprint('turnos_bp', __name__)

@turnos_bp.route('/asignar_turno', methods=['POST'])
def add_turnos():
    data = request.get_json()
    return turnos.asignar_turnos_a_usuarios(data)

@turnos_bp.route('/actualizar_turno_diario', methods=['PUT'])
@jwt_required()
def changeDailyTurnos():
    data = request.get_json()
    return turnos.actualizar_turno_diario(data)

@turnos_bp.route('/admin/turnos_semanales', methods=['GET'])
@jwt_required()
def getDailyTurnosAdmin():
    return turnos.obtener_turnos_semanales_admin()

@turnos_bp.route('/api/admin/turnos_disponibles', methods=['GET'])
@jwt_required()
def getAvailableDailyTurnos():
    fecha_inicio_str = request.args.get('fecha_inicio')
    return turnos.obtener_turnos_disponibles_semanales(fecha_inicio_str)

@turnos_bp.route('/api/horas_turno', methods=['GET'])
@jwt_required()
def getTurnoHours():
    user_id = request.args.get('user_id')
    mes = request.args.get('mes')  # Formato 'YYYY-MM'
    semana_num = request.args.get('semana', type=int)
    return turnos.get_horas_turno(user_id, mes, semana_num)