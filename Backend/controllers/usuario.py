from extensions import *
from extensions import *
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, create_access_token
from models import Turno, Usuario, TurnoDiarioAsignado, SolicitudDescanso
from sqlite3 import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

# El usuario debe estar autenticado con JWT
def registrar_usuario(data):
    """
    Endpoint para crear un nuevo usuario
    POST: /createUser
    """
    # Verificar que se está enviando JSON
    
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



def editar_usuario(id, data):
    try:
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