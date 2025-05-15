from extensions import *
from flask import jsonify
# from flask_jwt_extended import get_jwt, get_jwt_identity
from models import Turno, Usuario, TurnoDiarioAsignado, SolicitudDescanso, LocalHolidays
from datetime import datetime, timedelta
from calendar import monthrange
from sqlalchemy import extract, func
import locale
locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')



def getLocalHolidays(year, month):
    try:
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


def getAllLocalHolidays():
    local_holidays = LocalHolidays.query.all()
    return jsonify([{
        "date": holiday.date.strftime('%Y-%m-%d'),
        "name": holiday.name
    } for holiday in local_holidays]), 200



def addNewLocalHoliday(data):
    try:
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
