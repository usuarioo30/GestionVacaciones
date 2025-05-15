from extensions import *
from flask import send_file
# from flask_jwt_extended import get_jwt, get_jwt_identity
from models import Turno, Usuario, TurnoDiarioAsignado, SolicitudDescanso, LocalHolidays
from datetime import datetime, timedelta
from calendar import monthrange
from sqlalchemy import extract, func
import locale
locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')

from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4, landscape
import os
from io import BytesIO


def generar_pdf_turnos(user_id, mes):
    usuario = Usuario.query.get(user_id)
    if not usuario:
        return {"error": "Usuario no encontrado"}, 404

    try:
        anio, mes_num = map(int, mes.split('-'))
        dias_en_mes = monthrange(anio, mes_num)[1]
    except ValueError:
        return {"error": "Formato de mes incorrecto, usa 'YYYY-MM'"}, 400

    fecha_inicio = datetime(anio, mes_num, 1).date()
    fecha_fin = datetime(anio, mes_num, dias_en_mes).date()

    turnos = TurnoDiarioAsignado.query.filter(
        TurnoDiarioAsignado.user_id == user_id,
        TurnoDiarioAsignado.fecha >= fecha_inicio,
        TurnoDiarioAsignado.fecha <= fecha_fin
    ).all()

    if not turnos:
        return {"error": "No hay turnos asignados para este mes"}, 404

    # Preparar buffer y fuente
    buffer = BytesIO()
    font_path = os.path.join("fonts", "Montserrat-Regular.ttf")
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont("Montserrat", font_path))
        font_name = "Montserrat"
    else:
        font_name = "Helvetica"

    nombre_mes = datetime(anio, mes_num, 1).strftime('%B')
    pdf_title = f"horario_{usuario.username}_{nombre_mes.capitalize()}_{anio}"

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40,
        title=pdf_title
    )

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    title_style.fontName = font_name
    title_style.fontSize = 22

    subtitle_style = styles["Heading2"]
    subtitle_style.fontName = font_name
    subtitle_style.fontSize = 14

    elements = []
    elements.append(Paragraph("Horario de Turnos", title_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"<b>Empleado:</b> {usuario.nombreCompleto}", subtitle_style))
    elements.append(Paragraph(f"<b>Mes:</b> {nombre_mes.capitalize()} {anio}", subtitle_style))
    elements.append(Spacer(1, 20))

    encabezado = ['Semana', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    table_data = [encabezado]

    # Agrupar turnos por semana
    dias_turnos = {t.fecha: t for t in turnos}
    semanas = []
    semana_actual = []
    dia_actual = fecha_inicio

    while dia_actual <= fecha_fin:
        if dia_actual.weekday() == 0 and semana_actual:
            semanas.append(semana_actual)
            semana_actual = []
        semana_actual.append(dia_actual)
        dia_actual += timedelta(days=1)
    if semana_actual:
        semanas.append(semana_actual)

    for semana in semanas:
        inicio = semana[0]
        fin = semana[-1]
        etiqueta_semana = f"{inicio.day:02d}-{fin.day:02d}"

        fila = ["-" for _ in range(7)]
        vacaciones = checkIfHasVacationsOnDate(user_id, inicio, fin)

        for dia in semana:
            if dia.month != mes_num:
                continue

            idx = dia.weekday()
            if vacaciones and any(v.fecha_inicio.date() <= dia <= v.fecha_fin.date() for v in vacaciones):
                fila[idx] = "Vacaciones"
            elif dia in dias_turnos:
                turno = dias_turnos[dia].turno
                dia_nombre = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'][idx]
                fila[idx] = getattr(turno, f"dia_{dia_nombre}")

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

def checkIfHasVacationsOnDate(usuario_id, fecha_inicio, fecha_fin):

    vacations = SolicitudDescanso.query.filter(
        SolicitudDescanso.usuario_id == usuario_id,
        SolicitudDescanso.fecha_inicio <= fecha_fin,
        SolicitudDescanso.fecha_fin >= fecha_inicio,
        SolicitudDescanso.estado == True
        
    ).all()

    return vacations