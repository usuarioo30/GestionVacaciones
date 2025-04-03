from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
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

# Definir el modelo de Usuario
class Usuario(db.Model):
    __tablename__ = 'usuario'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(120), unique=True, nullable=False)
    roles = db.Column(db.String(255), nullable=False)

    reservas = db.relationship('Reserva', backref='usuario', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Usuario {self.username}>'


# Entidad Proyecto en la base de datos
class Vacaciones(db.Model):
    __tablename__ = 'vacaciones'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), unique=True, nullable=False)

    reservas = db.relationship('Reserva', backref='proyecto', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Proyecto {self.nombre}>'


# Modelo Reserva con claves foráneas que tienen borrado en cascada
class Reserva(db.Model):
    __tablename__ = 'reserva'

    id = db.Column(db.Integer, primary_key=True)
    sala = db.Column(db.String(120), nullable=False)
    fechaHoraInicio = db.Column(db.DateTime, nullable=False)
    duracion = db.Column(db.Integer, nullable=False)
    proyectoAsociado = db.Column(db.Integer, db.ForeignKey('proyecto.id', ondelete='CASCADE'), nullable=False)
    descripcion = db.Column(db.String(255), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False)

    def __repr__(self):
        return f'<Reserva {self.sala}>'


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
            password=hashed_password,
            username='admin',
            roles='admin'
        )

        db.session.add(nuevo_usuario)
        db.session.commit()
        print("Usuario por defecto creado: admin")

# Crear la base de datos y el usuario por defecto
with app.app_context():
    db.create_all()  # Crear las tablas en la base de datos
    crear_usuario_por_defecto()  # Crear el usuario por defecto si no existe

# Ruta para el inicio de sesión con credenciales propias (usuario y contraseña)
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Buscar el usuario en la base de datos
    usuario = Usuario.query.filter_by(username=username).first()

    
    if usuario and check_password_hash(usuario.password, password):
        access_token = create_access_token( identity=usuario.id,  # El ID del usuario como identidad
            additional_claims={  # Aquí agregamos más información
                "nombre": usuario.username,
                "email": usuario.email,
                "rol": usuario.roles
            })
        return jsonify(access_token=access_token), 200
    else:
        return jsonify({"message": "Credenciales incorrectas"}), 401

# Ruta protegida que requiere JWT para acceder
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    usuarioActual = get_jwt_identity()
    return jsonify(logged_in_as=usuarioActual), 200

# Ruta para registrar una reserva
@app.route('/registrarReserva', methods=['POST'])
# @jwt_required()
def registrar_reserva():
    try:
        # Obtener los datos de la reserva desde el cuerpo de la solicitud
        data = request.get_json()
        sala = data.get('sala')
        fechaHoraInicio = data.get('fechaHoraInicio')
        duracion = data.get('duracion')
        proyectoAsociado = data.get('proyectoAsociado')
        descripcion = data.get('descripcion')
        idUsuario = data.get('idUsuario')

        # Validar si los campos necesarios están presentes
        if not all([sala, fechaHoraInicio, duracion, proyectoAsociado, descripcion]):
            return jsonify({"message": "Todos los campos son obligatorios"}), 400

        # Convertir la fecha y hora de inicio a un objeto datetime
        try:
            fechaHoraInicio = datetime.strptime(fechaHoraInicio, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return jsonify({"message": "Formato de fecha y hora no válido. Use 'YYYY-MM-DD HH:MM:SS'."}), 400

        # Crear una nueva reserva
        nueva_reserva = Reserva(
            sala=sala,
            fechaHoraInicio=fechaHoraInicio,
            duracion=duracion,
            proyectoAsociado=proyectoAsociado,
            descripcion=descripcion,
            idUsuario=idUsuario
        )

        # Guardar la nueva reserva en la base de datos
        db.session.add(nueva_reserva)
        db.session.commit()

        return jsonify({"message": "Reserva creada con éxito"}), 201

    except Exception as e:
        # Manejo de errores generales
        return jsonify({"message": "Ocurrió un error al registrar la reserva", "error": str(e)}), 500

# Ruta para eliminar reserva
@app.route('/eliminarReserva/<int:id>', methods=['DELETE'])
def eliminarReserva(id):
    try:
        # Buscar la reserva por su ID
        reserva = Reserva.query.get(id)

        if reserva:
            # Eliminar la reserva
            db.session.delete(reserva)
            db.session.commit()
            return jsonify({"message": "Reserva eliminada con éxito"}), 200
        else:
            return jsonify({"message": "La reserva no existe"}), 404

    except Exception as e:
        return jsonify({"message": "Ocurrió un error al eliminar la reserva", "error": str(e)}), 500

# Ruta para editar una reserva
@app.route('/editarReserva/<int:id>', methods=['PUT'])
def editarReserva(id):
    try:
        # Buscar la reserva por su ID
        reserva = Reserva.query.get(id)

        if reserva:
            # Obtener los datos de la reserva desde el cuerpo de la solicitud
            data = request.get_json()
            sala = data.get('sala')
            fechaHoraInicio = data.get('fechaHoraInicio')
            duracion = data.get('duracion')
            proyectoAsociado = data.get('proyectoAsociado')
            descripcion = data.get('descripcion')
            idUsuario = data.get('idUsuario')

            # Actualizar los campos de la reserva
            if sala:
                reserva.sala = sala
            if fechaHoraInicio:
                reserva.fechaHoraInicio = fechaHoraInicio
            if duracion:
                reserva.duracion = duracion
            if proyectoAsociado:
                reserva.proyectoAsociado = proyectoAsociado
            if descripcion:
                reserva.descripcion = descripcion
            if idUsuario:
                reserva.idUsuario = idUsuario

            # Guardar los cambios en la base de datos
            db.session.commit()
            return jsonify({"message": "Reserva actualizada con éxito"}), 200

    except Exception as e:
        return jsonify({"message": "Reserva no encontrada", "error": str(e)}), 500

@app.route('/reservas', methods=['GET'])
def obtener_reservas():
    try:
        reservas = Reserva.query.all()
        reservas_serializadas = [
            {
                "id": reserva.id,
                "sala": reserva.sala,
                "fechaHoraInicio": reserva.fechaHoraInicio.strftime('%Y-%m-%d %H:%M:%S'),
                "duracion": reserva.duracion,
                "proyectoAsociado": reserva.proyectoAsociado,
                "descripcion": reserva.descripcion,
                "idUsuario": reserva.idUsuario
            }
            for reserva in reservas
        ]
        return jsonify(reservas_serializadas), 200
    except Exception as e:
        return jsonify({"message": "Error al obtener las reservas", "error": str(e)}), 500

@app.route('/usuarios', methods=['GET'])
def obtener_usuarios():
    try:
        usuarios = Usuario.query.all()
        usuarios_serializados = [
            {
                "id": usuario.id,
                "email": usuario.email,
                "username": usuario.username,
                "roles": usuario.roles
            }
            for usuario in usuarios
        ]
        return jsonify(usuarios_serializados), 200
    except Exception as e:
        return jsonify({"message": "Error al obtener los usuarios", "error": str(e)}), 500

# Obtener un usuario por su ID
@app.route('/usuarios/<int:id>', methods=['GET'])
def obtener_usuario_por_id(id):
    try:
        usuario = Usuario.query.get(id)
        usuario_serializado = {
            "id": usuario.id,
            "email": usuario.email,
            "username": usuario.username,
            "roles": usuario.roles
        }
        return jsonify(usuario_serializado), 200
    except Exception as e:
        return jsonify({"message": "Error al obtener el usuario", "error": str(e)}), 500

@app.route('/usuarios/username/<string:username>', methods=['GET'])
def obtener_usuario_por_username(username):
    try:
        # Buscar el usuario por su email
        usuario = Usuario.query.filter_by(username=username).first()

        if not usuario:
            return jsonify({"message": "Usuario no encontrado"}), 404

        # Serializar los datos del usuario
        usuario_serializado = {
            "id": usuario.id,
            "email": usuario.email,
            "username": usuario.username,
            "roles": usuario.roles
        }

        return jsonify(usuario_serializado), 200
    except Exception as e:
        return jsonify({"message": "Error al obtener el usuario", "error": str(e)}), 500

@app.route('/usuarios/email/<string:email>', methods=['GET'])
def obtener_usuario_por_email(email):
    try:
        # Buscar el usuario por su email
        usuario = Usuario.query.filter_by(email=email).first()

        if not usuario:
            return jsonify({"message": "Usuario no encontrado"}), 404

        # Serializar los datos del usuario
        usuario_serializado = {
            "id": usuario.id,
            "email": usuario.email,
            "username": usuario.username,
            "roles": usuario.roles
        }

        return jsonify(usuario_serializado), 200

    except Exception as e:
        return jsonify({"message": "Error al obtener el usuario", "error": str(e)}), 500


# Ruta para eliminar usuarios
@app.route('/usuarios/<int:id>', methods=['DELETE'])
def eliminarUsuario(id):
    try:
        # Buscar un usuario por su ID
        usuario = Usuario.query.get(id)

        if usuario:
            # Eliminar al usuario
            db.session.delete(usuario)
            db.session.commit()
            return jsonify({"message": "Usuario eliminado con éxito"}), 200
        else:
            return jsonify({"message": "El usuario no existe"}), 404

    except Exception as e:
        return jsonify({"message": "Ocurrió un error al eliminar el usuario", "error": str(e)}), 500

# Crear un nuevo usuario
@app.route('/register', methods=['POST'])
def crear_usuario():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        roles = data.get('roles')

        # Validar que todos los campos estén presentes
        if not all([email, password, username, roles]):
            return jsonify({"message": "Todos los campos son obligatorios"}), 400

        # Verificar si el correo ya está registrado
        if Usuario.query.filter_by(email=email).first():
            return jsonify({"message": "El correo ya está registrado"}), 400

        # Verificar si el nombre de usuario ya está registrado
        if Usuario.query.filter_by(username=username).first():
            return jsonify({"message": "El nombre de usuario ya está registrado"}), 400

        # Encriptar la contraseña
        password_hash = generate_password_hash(password)

        # Crear el nuevo usuario
        nuevo_usuario = Usuario(
            email=email,
            password=password_hash,
            username=username,
            roles=roles
        )

        db.session.add(nuevo_usuario)
        db.session.commit()

        return jsonify({"message": "Usuario creado con éxito"}), 201

    except Exception as e:
        return jsonify({"message": "Error al crear el usuario", "error": str(e)}), 500

# Ruta para editar una reserva
@app.route('/usuarios/<int:id>', methods=['PATCH'])
def editarUsuario(id):
    try:
        usuario = Usuario.query.get(id)
        if not usuario:
            return jsonify({"message": "Usuario no encontrado"}), 404

        data = request.get_json()

        # Actualizar los campos si están en la petición
        if "password" in data:
            password_hash = generate_password_hash(data["password"])
            usuario.password = password_hash 
        if "username" in data:
            usuario.username = data["username"]
        if "roles" in data:
            usuario.roles = data["roles"]

        db.session.commit()
        return jsonify({"message": "Usuario actualizado con éxito"}), 200

    except Exception as e:
        return jsonify({"message": "Error al editar el usuario", "error": str(e)}), 500


# Crear un nuevo proyecto
@app.route('/registrarProyecto', methods=['POST'])
def crear_proyecto():
    try:
        data = request.get_json()
        nombre = data.get('nombre')

        # Validar que todos los campos estén presentes
        if not all([nombre]):
            return jsonify({"message": "Todos los campos son obligatorios"}), 400

        # Crear el nuevo usuario
        nuevo_proyecto = Proyecto(
            nombre=nombre,
        )

        db.session.add(nuevo_proyecto)
        db.session.commit()

        return jsonify({"message": "Proyecto creado con éxito"}), 201

    except IntegrityError as e:
        db.session.rollback()  # Revertir la transacción en caso de error
        if "Duplicate entry" in str(e.orig):
            return jsonify({"message": "El nombre del proyecto ya está registrado"}), 400
        return jsonify({"message": "Error de integridad en la base de datos", "error": str(e)}), 400

    except Exception as e:
        return jsonify({"message": "Error al crear el proyecto", "error": str(e)}), 500

# Ruta para editar un proyecto
@app.route('/editarProyecto/<int:id>', methods=['PUT'])
def editarProyecto(id):
    try:
        proyecto = Proyecto.query.get(id)
        if proyecto:
            data = request.get_json()
            nombre = data.get('nombre')
            if nombre:
                proyecto.nombre = nombre
            db.session.commit()
            return jsonify({"message": "Proyecto actualizado con éxito"}), 200
        else:
            return jsonify({"message": "Proyecto no encontrado"}), 404
    except Exception as e:
        return jsonify({"message": "Error al editar el proyecto", "error": str(e)}), 500


@app.route('/proyectos', methods=['GET'])
def obtener_proyectos():
     try:
         proyectos = Proyecto.query.all()
         proyectos_serializados = [
             {
                 "id": proyecto.id,
                 "nombre": proyecto.nombre,
             }
             for proyecto in proyectos
         ]
         return jsonify(proyectos_serializados), 200
     except Exception as e:
         return jsonify({"message": "Error al obtener los proyectos", "error": str(e)}), 500

# Obtener un proyecto por su ID
@app.route('/proyectos/<int:id>', methods=['GET'])
def obtener_proyecto_por_id(id):
    try:
        proyecto = Proyecto.query.get(id)
        proyecto_serializado = {
            "id": proyecto.id,
            "nombre": proyecto.nombre
        }
        return jsonify(proyecto_serializado), 200
    except Exception as e:
        return jsonify({"message": "Error al obtener el proyecto", "error": str(e)}), 500


# Iniciar sesión con google
@app.route("/api/google-login", methods=["POST"])
def google_login():
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

@app.route('/eliminarProyecto/<int:id>', methods=['DELETE'])
def eliminarProyecto(id):
    try:
        proyecto = Proyecto.query.get(id)
        if proyecto:
            db.session.delete(proyecto)
            db.session.commit()
            return jsonify({"message": "Proyecto eliminado con éxito"}), 200
        else:
            return jsonify({"message": "Proyecto no encontrado"}), 404
    except Exception as e:
        return jsonify({"message": "Error al eliminar el proyecto", "error": str(e)}), 500


# Ejecutar la aplicación Flask
if __name__ == '__main__':
    # Crear la base de datos si no existe
    with app.app_context():
        db.create_all()

    # Ejecutar el servidor Flask
    app.run(host="0.0.0.0", port=5000, debug=True)