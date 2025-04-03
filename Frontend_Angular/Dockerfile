# Usa la imagen de NGINX
FROM nginx:alpine

# Copiar los archivos estáticos de Angular generados en /dist a NGINX
COPY /dist /usr/share/nginx/html

# Copiar el archivo de configuración de NGINX para el frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80 para que NGINX sirva los archivos
EXPOSE 80

# Mantener el servicio de NGINX corriendo
CMD ["nginx", "-g", "daemon off;"]