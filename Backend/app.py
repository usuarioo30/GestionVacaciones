from datetime import datetime
from sqlite3 import IntegrityError
from operator import truediv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

# Configuración de la base de datos y otros parámetros
class Config:
    SQLALCHEMY_DATABASE_URI = 'mysql://root:Usuario1234@localhost/gestionvacaciones'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'miClave'

# Inicializa la base de datos y JWT
db = SQLAlchemy()
jwt = JWTManager()

class Usuario(db.Model):
    __tablename__ = 'usuario'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    nombreCompleto = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    rol = db.Column(db.String(20), nullable=False)

    def __repr__(self):
        return f'<Usuario {self.username}>'

class SolicitudDescanso(db.Model):
    __tablename__ = 'solicitudDescanso'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    fecha_inicio = db.Column(db.DateTime, nullable=False)
    fecha_fin = db.Column(db.DateTime, nullable=False)
    fecha_solicitud = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.Boolean, nullable=True, default=None)
    motivo = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f'<SolicitudDescanso {self.id}>'

# Función para crear la aplicación
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inicializa SQLAlchemy y JWT con la aplicación
    db.init_app(app)
    jwt.init_app(app)

    # Habilita CORS para todas las rutas
    CORS(app, resources={r"/*": {"origins": "http://localhost"}})

    return app

app = create_app()

# Función para crear un usuario por defecto si no existe
def crear_usuario_por_defecto():
    usuario = Usuario.query.filter_by(username='admin').first()

    if not usuario:
        hashed_password = generate_password_hash('admin')
        nuevo_usuario = Usuario(
            email='admin@apeiroo.com',
            nombreCompleto='Administrador',
            password=hashed_password,
            username='admin',
            rol='admin'
        )

        db.session.add(nuevo_usuario)
        db.session.commit()
        print("Usuario por defecto creado: admin")

# Crear la base de datos y el usuario por defecto
with app.app_context():
    db.create_all()
    crear_usuario_por_defecto()


# 
# POST: /login
# Response: 200 OK {"access_token": token}
# Response: 401 Unauthorized {"message": "Credenciales inválidas"}
@app.route('/login', methods=['POST'])
def login():
    """
    Endpoint para iniciar sesión y obtener un token JWT
    POST: /login
    Request Body: {"username": username, "password": password}
    Response: 200 OK {"access_token": token}
    Response: 401 Unauthorized {"message": "Credenciales inválidas"}
    """
    data = request.get_json()
    # hashed_password = generate_password_hash(data['password'], method='sha256')
    usuario = Usuario.query.filter_by(username=data['username']).first()

    if not usuario or not check_password_hash(usuario.password, data['password']):
        return jsonify({'message': 'Credenciales inválidas'}), 401

    access_token = create_access_token(
        identity=str(usuario.id), 
        additional_claims={"username": usuario.username, "nombreCompleto": usuario.nombreCompleto, "rol": usuario.rol},
        expires_delta=timedelta(hours=24)),
    return jsonify({'access_token': access_token}), 200

@app.route("/api/google-login", methods=["POST"])
def google_login():
    """
    Endpoint para iniciar sesión con google y obtener un token JWT
    POST: /api/google-login
    Request Body: {"email": email}
    Response: 200 OK {"access_token": token}
    Response: 400 Bad Request {"error": "Email is required"}
    Response: 404 Not Found {"exists": False, "error": "User not found"}
    """

    data = request.json
    if "email" not in data:
        return jsonify({"error": "Email is required"}), 400

    user = Usuario.query.filter_by(email=data["email"]).first()

    if not user:
        return jsonify({"exists": False, "error": "User not found"}), 404

    return jsonify({
        "exists": True,
        "message": f"Welcome {user.username}!",
        "role": user.rol
    }), 200


@app.route('/user/create', methods=['POST'])
@jwt_required()  # El usuario debe estar autenticado con JWT
def registrar_usuario():
    """
    Endpoint para crear un nuevo usuario
    POST: /createUser
    """
    # Verificar que se está enviando JSON
    data = request.get_json()
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

@app.route('/user/<int:user_id>', methods=['GET'])
@jwt_required()
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


@app.route('/request/edit/<int:id>', methods=['PUT'])
@jwt_required()
def editar_solicitud(id):
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
        # Obtener el usuario autenticado
        claims = get_jwt()
        rol = claims.get('rol')

        # Buscar la solicitud por ID
        solicitud = SolicitudDescanso.query.get(id)

        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404

        if solicitud.estado is not None:
            return jsonify({'error': 'Solo se puede editar una solicitud pendiente'}), 403

        if rol not in ['admin', 'user']:
            return jsonify({'error': 'No tienes permisos para editar esta solicitud'}), 403

        data = request.get_json()

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


@app.route("/request/register", methods=["POST"])
@jwt_required()
def registrarSolicitudes():

    usuario_id = get_jwt_identity()

    claims = get_jwt()

    rol = claims.get('rol')

    if rol != 'user':
        return jsonify({"error": "Un admin no puede crear una solicitud"}), 403

    data = request.get_json()

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


  

@app.route('/request/manage/<int:id>', methods=['PUT'])
@jwt_required()
def manageRequest(id):
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
            data = request.get_json()
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
  

@app.route('/request/delete/<int:id>', methods=['DELETE'])
@jwt_required()
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




@app.route('/request/list', methods=['GET'])
@jwt_required()
def listar_solicitudes():
    try:
        usuario_id = get_jwt_identity()
        claims = get_jwt()

        rol = claims.get('rol')

        if rol != 'user':
            return jsonify({"error": "No tienes permisos para acceder a esta lista de solicitudes."}), 403

        solicitudes = SolicitudDescanso.query.filter_by(usuario_id=usuario_id).all()

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

@app.route('/request/list-admin', methods=['GET'])
@jwt_required()
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
    

# Obtener todas las solicitudes de un usuario
@app.route('/request/<int:user>', methods=['GET'])
@jwt_required()
def getUserRequest(user):
    try:
        solicitudes = SolicitudDescanso.query.filter(user==SolicitudDescanso.usuario_id)

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




# Ejecutar el servidor Flask
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)