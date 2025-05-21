from flask import Blueprint, request
from controllers import pdf
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

pdf_bp = Blueprint('pdf_bp', __name__)

@pdf_bp.route('/<int:user_id>/<string:mes>', methods=['GET'])
@jwt_required()
def genPdf(user_id, mes):
    return pdf.generar_pdf_turnos(user_id=user_id, mes=mes)