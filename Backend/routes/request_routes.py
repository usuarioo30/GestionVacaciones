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

@request_bp.route('/manage/<int:id>', methods=['PUT'])
@jwt_required()
def handle_request(id):
    data = request.get_json()
    return solicitud.manageRequest(id, data)

@request_bp.route('/list', methods=['GET'])
@jwt_required()
def list_requests():
    return solicitud.listar_solicitudes()

@request_bp.route('/list-admin', methods=['GET'])
@jwt_required()
def list_admin_request():
    return solicitud.listar_solicitudes_admin()


@request_bp.route('/list-admin/all', methods=['GET'])
@jwt_required()
def list_all_admin_request():
    return solicitud.listar_todas_solicitudes_admin()

@request_bp.route('/<int:user>', methods=['GET'])
@jwt_required()
def get_requests_from_a_user(user):
    return solicitud.getUserRequest(user)

@request_bp.route('/accepted/<int:user>', methods=['GET'])
@jwt_required()
def acceptedRequestOfAUser(user):
    return solicitud.getAcceptedUserRequest(user)

@request_bp.route('/accepted', methods=['GET'])
@jwt_required()
def all_accepted_request():
    return solicitud.getAcceptedRequests()

@request_bp.route('/compare', methods=['POST'])
@jwt_required()
def checkRequests():
    data = request.get_json()
    return solicitud.compareRequests(data)