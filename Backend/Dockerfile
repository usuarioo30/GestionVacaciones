# Usa la imagen base de Python para Flask
FROM python

# Instalar NGINX
RUN apt-get update && apt-get install -y nginx

# Configurar el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar el archivo de requerimientos
COPY requirements.txt ./

# Instalar las dependencias de Flask
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente de la aplicación Flask al contenedor
COPY . .

# Copiar el archivo de configuración de NGINX para el backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 5000 para Flask y el puerto 80 para NGINX
EXPOSE 5000
EXPOSE 80

# Iniciar NGINX y Flask en el mismo contenedor
CMD service nginx start && python app.py
