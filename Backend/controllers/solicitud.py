from extensions import *
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity
from models import SolicitudDescanso, Usuario
from datetime import datetime


def registrarSolicitudes(data, usuario_id):

    claims = get_jwt()

    rol = claims.get('rol')

    if rol != 'user':
        return jsonify({"error": "Un admin no puede crear una solicitud"}), 403

    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")
    motivo = data.get("motivo")

    if not all([fecha_inicio, fecha_fin, motivo]):
        return jsonify({"error": "Faltan datos"}), 400

    try:
        fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
        fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')

        nueva_solicitud = SolicitudDescanso(
            usuario_id=usuario_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            motivo=motivo
        )
        db.session.add(nueva_solicitud)
        db.session.commit()
        return jsonify({"message": "Solicitud registrada correctamente"}), 201

    except Exception as e:
        return jsonify({"error": "Error al registrar su solicitud", "message": str(e)}), 500


def editar_solicitud(id, data, rol):
    """
    Endpoint para editar una solicitud de descanso.
    PUT: /request/edit/{id}
    Request Body: {"fecha_inicio": "YYYY-MM-DD", "fecha_fin": "YYYY-MM-DD", "motivo": "string"}
    Response: 200 OK {"message": "Solicitud editada correctamente"}
    Response: 400 Bad Request {"error": "Faltan datos"}
    Response: 404 Not Found {"error": "Solicitud no encontrada"}
    Response: 403 Forbidden {"error": "No tienes permisos para editar esta solicitud"}
    Response: 500 Internal Server Error {"error": "Hubo un error al editar la solicitud"}
    """
    try:

        # Buscar la solicitud por ID
        solicitud = SolicitudDescanso.query.get(id)

        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404

        if solicitud.estado is not None:
            return jsonify({'error': 'Solo se puede editar una solicitud pendiente'}), 403

        if rol not in ['admin', 'user']:
            return jsonify({'error': 'No tienes permisos para editar esta solicitud'}), 403

        fecha_inicio = data.get("fecha_inicio")
        fecha_fin = data.get("fecha_fin")
        motivo = data.get("motivo")

        if not all([fecha_inicio, fecha_fin, motivo]):
            return jsonify({"error": "Faltan datos"}), 400

        try:
            fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido. Usa 'YYYY-MM-DD'."}), 400

        solicitud.fecha_inicio = fecha_inicio
        solicitud.fecha_fin = fecha_fin
        solicitud.motivo = motivo

        db.session.commit()

        return jsonify({'message': 'Solicitud editada correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Hubo un error al editar la solicitud', 'message': str(e)}), 500
    


def eliminar_solicitud(id):
    """
    Endpoint para eliminar una solicitud.
    DELETE: /request/delete/{id}
    Response: 200 OK {"message": "Solicitud eliminada correctamente"}
    Response: 404 Not Found {"error": "Solicitud no encontrada"}
    Response: 403 Forbidden {"error": "No tienes permisos para eliminar esta solicitud"}
    Response: 500 Internal Server Error {"error": "Hubo un error al eliminar la solicitud"}
    """
    try:
        # Obtener el usuario autenticado (ID del usuario desde el JWT)
        claims = get_jwt()  # Obtenemos los claims del JWT
        rol = claims.get('rol')  # Obtener el rol del usuario desde los claims

        # Buscar la solicitud por ID
        solicitud = SolicitudDescanso.query.get(id)

        # Verificar si la solicitud existe
        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404

        # Verificar si el rol es 'admin' o 'user'
        if rol in ['admin', 'user']:
            # Si es admin o user, puede eliminar la solicitud sin importar el creador
            db.session.delete(solicitud)
            db.session.commit()

            return jsonify({'message': 'Solicitud eliminada correctamente'}), 200
        else:
            # Si el rol no es 'admin' ni 'user', no tiene permisos para eliminar
            return jsonify({'error': 'No tienes permisos para eliminar esta solicitud'}), 403

    except Exception as e:
        # En caso de error, revertir cualquier cambio en la base de datos
        db.session.rollback()
        return jsonify({'error': 'Hubo un error al eliminar la solicitud', 'message': str(e)}), 500
    


def manageRequest(id, data):
    """
    Endpoint para aceptar o rechazar una solicitud
    PUT: /request/manage/{id}
    Request Body: {"aprobado": True/False}
    Response: 200 OK {"message": message}
    Response: 404 Not Found {"message": "Solicitud no encontrada"}
    Response: 500 Internal Server Error {"message": "Error al editar la solicitud", "error": str(e)}
    """
    try:
        # Obtener el usuario autenticado
        usuarioId = get_jwt_identity()
        
        usuario_actual = Usuario.query.filter_by(id=usuarioId).first()


        # Verificar si el usuario es admin
        if usuario_actual.rol != 'admin':
            return jsonify({"error": "No tienes permisos para gestionar solicitudes"}), 403

        solicitud = SolicitudDescanso.query.get(id)
        
        if solicitud:
            # Obtener el dato de aprobación del cuerpo de la solicitud
            estado = data.get('estado')

            if estado is None:
                return jsonify({"error": "Falta el parámetro 'aprobado'"}), 400

            # Actualizar la solicitud con la aprobación
            solicitud.estado = estado
            db.session.commit()
            
            message = "Solicitud " + ("aprobada" if estado else "rechazada") + " con éxito"
            return jsonify({"message": message}), 200
        else:
            return jsonify({"message": "Solicitud no encontrada"}), 404
    except Exception as e:
        return jsonify({"message": "Error al editar la solicitud", "error": str(e)}), 500
    


def listar_solicitudes():
    try:
        usuario_id = get_jwt_identity()
        claims = get_jwt()

        rol = claims.get('rol')

        if rol != 'user':
            return jsonify({"error": "No tienes permisos para acceder a esta lista de solicitudes."}), 403

        solicitudes = SolicitudDescanso.query.filter_by(usuario_id=usuario_id, estado=None).all()

        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500



def listar_solicitudes_admin():
    try:
        # Obtener la identidad del usuario autenticado
        claims = get_jwt()

        rol = claims.get('rol')

        if rol != 'admin':
            # Si no es admin, se retorna un error
            return jsonify({"error": "No tienes permisos para acceder a esta lista de solicitudes."}), 403

        # Si el rol es 'admin', se devuelven todas las solicitudes
        solicitudes = SolicitudDescanso.query.filter(SolicitudDescanso.estado==None).all() # No me reconoce null, usé None

        # Formatear las solicitudes para la respuesta JSON
        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500
    


def listar_todas_solicitudes_admin():
    try:
        # Obtener la identidad del usuario autenticado
        claims = get_jwt()

        rol = claims.get('rol')

        if rol != 'admin':
            # Si no es admin, se retorna un error
            return jsonify({"error": "No tienes permisos para acceder a esta lista de solicitudes."}), 403

        # Si el rol es 'admin', se devuelven todas las solicitudes
        resultados = db.session.query(SolicitudDescanso, Usuario.username, Usuario.nombreCompleto, Usuario.id)\
        .join(Usuario, SolicitudDescanso.usuario_id == Usuario.id)\
        .filter(SolicitudDescanso.estado.isnot(None))\
        .all()

        data = [
            {
                "id": solicitud.id,
                "estado": solicitud.estado,
                "motivo": solicitud.motivo,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "usuario_id": usuario_id,
                "username": username,
                "nombreCompleto": nombreCompleto
                
            }
            for solicitud, username, nombreCompleto, usuario_id in resultados
        ]
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500

# Obtener todas las solicitudes de un usuario
def getUserRequest(user):
    try:
        solicitudes = SolicitudDescanso.query.filter(
            SolicitudDescanso.usuario_id == user,
            SolicitudDescanso.estado != None
        ).all()

        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500
    

def getAcceptedUserRequest(user):
    try:

        # consulta principal: estado aceptado y (propias o de los que te han compartido)
        solicitudes = (
            SolicitudDescanso.query
            .filter(
                SolicitudDescanso.estado == True,
                SolicitudDescanso.usuario_id == user,
            )
            .all()
        )


        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500
    

def getAcceptedRequests():
    try:
        solicitudes = SolicitudDescanso.query.filter(
            SolicitudDescanso.estado == True
        ).all()

        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }
            solicitudes_data.append(solicitud_info)

        return jsonify(solicitudes_data), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500



def compareRequests(data):

    try:

        fecha_inicio_str = data['fecha_inicio']
        fecha_fin_str = data['fecha_fin']

        if not fecha_inicio_str or not fecha_fin_str:
            return jsonify({"error": "Faltan fechas en los parámetros."}), 400

        # Convertir strings a datetime
        fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d')
        fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d')

        solicitudes = SolicitudDescanso.query.filter(
            SolicitudDescanso.estado == True,
            SolicitudDescanso.fecha_inicio <= fecha_fin,
            SolicitudDescanso.fecha_fin >= fecha_inicio
        ).all()

        solicitudes_descanso = []

        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitud": solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                "estado": solicitud.estado,
                "motivo": solicitud.motivo
            }

            solicitudes_descanso.append(solicitud_info)

        return jsonify(solicitudes_descanso), 200

    except Exception as e:
        return jsonify({"error": "Ocurrió un error al obtener las solicitudes.", "message": str(e)}), 500