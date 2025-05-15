from flask import Blueprint, request
from controllers import localholiday
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

localholiday_bp = Blueprint('localholiday_bp', __name__)

@localholiday_bp.route('', methods=['GET']) # No es muy elegante pero funciona
@jwt_required()
def monthlyLocalHolidays():
    # Obtener el mes de la fecha
    year = request.args.get('date').split('-')[0]  # Obtener el año de la fecha
    month = request.args.get('date').split('-')[1]
    return localholiday.getLocalHolidays(year, month)

@localholiday_bp.route('/all', methods=['GET'])
@jwt_required()
def allLocalHolidays():
    return localholiday.getAllLocalHolidays()

@localholiday_bp.route('/add', methods=['POST'])
@jwt_required()
def addHoliday():
    data = request.get_json()
    return localholiday.addNewLocalHoliday(data)