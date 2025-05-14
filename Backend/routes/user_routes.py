from flask import Blueprint, request
from controllers import usuario
from flask_jwt_extended import jwt_required
user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/create', methods=['POST'])
@jwt_required()
def create_user():
    data = request.get_json()
    return usuario.registrar_usuario(data)

@user_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def getUser(user_id):
    return usuario.getUserById(user_id)

@user_bp.route('/list', methods=['GET'])
@jwt_required()
def returnAllUsers():
    return usuario.getAllUsers()

# @user_bp.route('/users', methods=['GET'])
# @jwt_required()
# def returnAllUsers2():
#     return usuario.getAllUsers()


@user_bp.route('/list/min', methods=['GET'])
@jwt_required()
def returnMinimizedUsersInfo():
    return usuario.getAllUsersMin()

@user_bp.route('/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def deleteUser(id):
    return usuario.eliminar_usuario(id)

@user_bp.route('/edit/<int:id>', methods=['PUT'])
@jwt_required()
def editUser(id):
    # Obtener los datos enviados en el cuerpo de la solicitud
    data = request.get_json()
    return usuario.editar_usuario(id=id, data=data)