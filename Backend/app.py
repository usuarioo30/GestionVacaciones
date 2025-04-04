from datetime import datetime
from sqlite3 import IntegrityError
from operator import truediv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


# Configuración de la base de datos y otros parámetros
class Config:
    SQLALCHEMY_DATABASE_URI = 'mysql://root:Usuario1234@localhost/gestionvacaciones'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'miClave'  # Clave secreta para JWT
    JWT_SECRET_KEY = 'mi_secreto_jwt'  # Clave secreta para JWT

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
    fecha_solicitada = db.Column(db.DateTime, default=datetime.utcnow)
    aprobado = db.Column(db.Boolean, nullable=True, default=None)

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
## POST: /login
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
    usuario = Usuario.query.filter_by(username=data['username']).first()

    if not usuario or not check_password_hash(usuario.password, data['password']):
        return jsonify({'message': 'Credenciales inválidas'}), 401

    access_token = create_access_token(identity=str(usuario.id))
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
        "role": user.roles
    }), 200


@app.route('/createUser', methods=['POST'])
@jwt_required()  # El usuario debe estar autenticado con JWT
def registrar_usuario():

    """
    Endpoint para crear un nuevo usuario
    POST: /createUser
    Request Body: {
        "email": email,
        "nombreCompleto": nombreCompleto,
        "password": password,
        "username": username,
        "rol": rol
    }
    Response: 201 OK {'message': 'Usuario creado exitosamente'}
    Response: 400 Bad Request {'message': 'Datos JSON no proporcionados o mal formateados'}
    Response: 409 Conflict {'message': 'El usuario ya existe'}
    Response: 500 Internal Server Error {'message': 'Error al crear el usuario', 'error': str(e)}
    """

    # Verificar que se está enviando JSON
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Datos JSON no proporcionados o mal formateados'}), 400

    # Obtener la identidad del usuario autenticado
    current_user = get_jwt_identity()
    
    # Hash de la contraseña
    hashed_password = generate_password_hash(data['password'])

    # Crear nuevo usuario
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
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'El usuario ya existe'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error al crear el usuario', 'error': str(e)}), 500


@app.route("/registerRequest", methods=["POST"])
@jwt_required()
def registrarSolicitudes():
    """
    Endpoint para crear un nuevo usuario
    POST: /createUser
    Request Body: {
        "usuario_id": usuario_id,
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "fecha_solicitada": fecha_solicitada
    }
    Response: 201 OK {"message": "Solicitud registrada correctamente"}, 201
    Response: 400 Bad Request {"error": "Faltan datos"}
    Response: 409 Conflict {'message': 'El usuario ya existe'}
    Response: 500 Internal Server Error {"message": "Error al registrar su solicitud, porfavor intentelo denuevo."}
    """

    data = request.get_json()
    usuario_id = data.get("usuario_id")
    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")
    fecha_solicitada = data.get("fecha_solicitada")
    #aprobado = data.get("aprobado")

    if not all([usuario_id, fecha_inicio, fecha_fin, fecha_solicitada]):
        return {"error": "Faltan datos"}, 400

    try:
        fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d %H:%M:%S')
        fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d %H:%M:%S')
        fecha_solicitada = datetime.strptime(fecha_solicitada, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        return {"error": "Formato de fecha incorrecto"}, 400
    try:
        nueva_solicitud = SolicitudDescanso(
            usuario_id=usuario_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fecha_solicitada=fecha_solicitada,
        )
        db.session.add(nueva_solicitud)
        db.session.commit()
        return {"message": "Solicitud registrada correctamente"}, 201
    except Exception:
        return {"message": "Error al registrar su solicitud, porfavor intentelo denuevo."}, 500

  

@app.route('/request/manage/<int:id>', methods=['PUT'])
@jwt_required()
def manageRequest(id):
    """
    Endpoint para crear un nuevo usuario
    POST: /createUser
    Request Body: {
        "aprobado": aprobado,
    }
    Response: 200 OK {"message": message}
    Response: 400 Bad Request {"error": "Faltan datos"}
    Response: 404 Not Found {"message": "Solicitud no encontrada"}
    Response: 500 Internal Server Error {"message": "Error al editar la solicitud", "error": str(e)}
    """


    try:
        solicitud = SolicitudDescanso.query.get(id)
        
        data = request.get_json()
        aprobado = data.get('aprobado')

        if solicitud:
            solicitud.aprobado = True if aprobado else False
            db.session.commit()
            message = "Solicitud "+"aprobada" if aprobado else "denegada"+" con éxito"
            return jsonify({"message": message}), 200
        else :
            return jsonify({"message": "Solicitud no encontrada"}), 404
    except Exception as e:
        return jsonify({"message": "Error al editar la solicitud", "error": str(e)}), 500
  

@app.route('/deleteRequest/<int:id>', methods=['DELETE'])
def eliminar_solicitud(id):
    solicitud = SolicitudDescanso.query.get(id)

@app.route("/editRequest", methods=["PUT"])
@jwt_required()
def editarSolicitudes():
    data = request.get_json()
    id = data.get("id")
    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")
    aprobado = data.get("aprobado")
    try:
        solicitud = SolicitudDescanso.query.filter_by(id=id).first()
        if not solicitud:
            return {"error": "Solicitud no encontrada"}, 404

        solicitud.fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d %H:%M:%S')
        solicitud.fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d %H:%M:%S')
        solicitud.aprobado = aprobado

        db.session.commit()
        return {"message": "Solicitud editada correctamente"}, 200
    except Exception:
        return {"message": "Error al editar la solicitud"}, 500

@app.route('/requests', methods=['GET'])
@jwt_required()
def listar_solicitudes():
    try:
        solicitudes = SolicitudDescanso.query.all()
        
        solicitudes_data = []
        for solicitud in solicitudes:
            solicitud_info = {
                "id": solicitud.id,
                "usuario_id": solicitud.usuario_id,
                "fecha_inicio": solicitud.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_fin": solicitud.fecha_fin.strftime('%Y-%m-%d %H:%M:%S'),
                "fecha_solicitada": solicitud.fecha_solicitada.strftime('%Y-%m-%d %H:%M:%S'),
                "aprobado": solicitud.aprobado
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