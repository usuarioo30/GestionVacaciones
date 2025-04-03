from datetime import datetime
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

@app.route("/registerRestRequest", methods=["POST"])
def registrarSolicitudes():
    data = request.get_json()
    usuario_id = data.get("usuario_id")
    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")
    fecha_solicitada = data.get("fecha_solicitada")
    aprobado = data.get("aprobado")

    if not all([usuario_id, fecha_inicio, fecha_fin, fecha_solicitada, aprobado]):
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
            aprobado=aprobado
        )
        db.session.add(nueva_solicitud)
        db.session.commit()
        return {"message": "Solicitud registrada correctamente"}, 201
    except Exception:
        return {"message": "Error al registrar su solicitud, porfavor intentelo denuevo."}, 500

@app.route("/editRestRequest", methods=["PUT"])
def editarSolicitudes():
    data = request.get_json()
    id = data.get("id")
    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")
    aprobado = data.get("aprobado")

    if not all([fecha_inicio, fecha_fin, aprobado]):
        return {"error": "Faltan datos"}, 400

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

# Ejecutar el servidor Flask
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)