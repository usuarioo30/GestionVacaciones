from flask import Blueprint, request
from controllers import solicitud
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

request_bp = Blueprint('request_bp', __name__)

@request_bp.route("/register", methods=["POST"])
@jwt_required()
def create_request():
    data = request.get_json()
    usuario_id = get_jwt_identity()
    return solicitud.registrarSolicitudes(data, usuario_id)

@request_bp.route('/edit/<int:id>', methods=['PUT'])   
@jwt_required()
def edit_request(id):                                  
    data = request.get_json()                          
    claims = get_jwt()
    rol = claims.get('rol')

    return solicitud.editar_solicitud(id, data, rol)

@request_bp.route('/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_request(id):
    return solicitud.eliminar_solicitud(id)
