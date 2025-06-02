FROM node:18-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache sqlite

# Copiar package.json y instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads public/uploads

# Exponer puerto
EXPOSE 3001

# Comando de inicio
CMD ["node", "server.js"]