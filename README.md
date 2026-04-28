# B2B Supplier Registry Portal

Plataforma unificada para el registro de proveedores, gestión de clientes y administración de solicitudes comerciales.

## Requisitos Previos

- **Node.js** (v18 o superior)
- **Git**

## Guía de Instalación para Colaboradores

Si acabas de clonar este repositorio, sigue estos pasos para configurar tu entorno local. La base de datos es SQLite, por lo que **no necesitas instalar ningún motor de base de datos extra**.

### 1. Configurar el Backend

1. Abre una terminal y navega a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea tu archivo de configuración de entorno. Haz una copia del archivo `.env.example` y renómbralo a `.env`:
   * En Windows: `copy .env.example .env`
   * En Mac/Linux: `cp .env.example .env`
4. Inicializa la base de datos de Prisma. Este comando creará el archivo SQLite y aplicará todas las tablas:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *El backend correrá en http://localhost:3000*

### 2. Configurar el Frontend

1. Abre **otra** ventana de terminal y navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia la aplicación de React/Vite:
   ```bash
   npm run dev
   ```
   *El frontend correrá en http://localhost:5173*

## Usuarios de Prueba por Defecto

Si necesitas un usuario administrador para acceder al Panel de Control en `/login`, puedes registrarte directamente como cliente o usar la ruta de registro de proveedor y luego aprobar la solicitud desde la base de datos (o usar un script de seed si existe). 

Actualmente, como es entorno de desarrollo, el servicio de correos **es simulado (mock)**. Cualquier correo de confirmación de registro aparecerá impreso en la terminal del backend, no se enviará ningún correo real.
