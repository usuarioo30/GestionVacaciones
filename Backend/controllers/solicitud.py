from extensions import *
from flask import jsonify
from flask_jwt_extended import get_jwt
from models import SolicitudDescanso
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
