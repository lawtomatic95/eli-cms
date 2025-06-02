const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const SITE_URL = process.env.SITE_URL || 'orange-deer-523695.hostingersite.com';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Inicializar base de datos
const db = new sqlite3.Database('noticias.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS noticias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    extracto TEXT NOT NULL,
    contenido TEXT NOT NULL,
    imagen TEXT,
    fecha TEXT NOT NULL,
    destacada INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Ruta principal - Panel Admin
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Panel - Team Ruscitti</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100">
        <div class="container mx-auto px-4 py-8">
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
                <h1 class="text-3xl font-bold text-center mb-8 text-red-600">
                    Panel de Noticias - Team Ruscitti
                </h1>
                
                <form id="noticiaForm" enctype="multipart/form-data" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Título</label>
                        <input type="text" name="titulo" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                        <input type="date" name="fecha" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Extracto (resumen corto)</label>
                        <textarea name="extracto" required rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Contenido completo</label>
                        <textarea name="contenido" required rows="6"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Imagen</label>
                        <input type="file" name="imagen" accept="image/*" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                    </div>
                    
                    <div class="flex items-center">
                        <input type="checkbox" name="destacada" id="destacada" 
                               class="mr-2 focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded">
                        <label for="destacada" class="text-sm font-medium text-gray-700">Noticia destacada</label>
                    </div>
                    
                    <button type="submit" 
                            class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold">
                        Publicar Noticia
                    </button>
                </form>
                
                <div id="mensaje" class="mt-4 p-4 rounded-md hidden"></div>
                
                <div class="mt-8">
                    <h2 class="text-xl font-bold mb-4">Noticias Publicadas</h2>
                    <div id="listaNoticias" class="space-y-2"></div>
                </div>
            </div>
        </div>
        
        <script>
            // Cargar noticias al inicio
            cargarNoticias();
            
            // Establecer fecha actual por defecto
            document.querySelector('input[name="fecha"]').value = new Date().toISOString().split('T')[0];
            
            document.getElementById('noticiaForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                
                try {
                    const response = await fetch('/api/noticias', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        mostrarMensaje('¡Noticia publicada exitosamente!', 'success');
                        e.target.reset();
                        document.querySelector('input[name="fecha"]').value = new Date().toISOString().split('T')[0];
                        cargarNoticias();
                    } else {
                        mostrarMensaje('Error: ' + result.error, 'error');
                    }
                } catch (error) {
                    mostrarMensaje('Error de conexión', 'error');
                }
            });
            
            function mostrarMensaje(texto, tipo) {
                const mensaje = document.getElementById('mensaje');
                mensaje.textContent = texto;
                mensaje.className = \`mt-4 p-4 rounded-md \${tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}\`;
                mensaje.classList.remove('hidden');
                
                setTimeout(() => {
                    mensaje.classList.add('hidden');
                }, 5000);
            }
            
            async function cargarNoticias() {
                try {
                    const response = await fetch('/api/noticias');
                    const noticias = await response.json();
                    
                    const lista = document.getElementById('listaNoticias');
                    lista.innerHTML = noticias.map(noticia => \`
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded border">
                            <div>
                                <h3 class="font-semibold">\${noticia.titulo}</h3>
                                <p class="text-sm text-gray-600">\${noticia.fecha}</p>
                            </div>
                            <button onclick="eliminarNoticia(\${noticia.id})" 
                                    class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                                Eliminar
                            </button>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error cargando noticias:', error);
                }
            }
            
            async function eliminarNoticia(id) {
                if (confirm('¿Estás segura de eliminar esta noticia?')) {
                    try {
                        const response = await fetch(\`/api/noticias/\${id}\`, {
                            method: 'DELETE'
                        });
                        
                        if (response.ok) {
                            mostrarMensaje('Noticia eliminada', 'success');
                            cargarNoticias();
                        }
                    } catch (error) {
                        mostrarMensaje('Error eliminando noticia', 'error');
                    }
                }
            }
        </script>
    </body>
    </html>
  `);
});

// API para crear noticia
app.post('/api/noticias', upload.single('imagen'), (req, res) => {
  const { titulo, extracto, contenido, fecha, destacada } = req.body;
  const imagen = req.file ? req.file.filename : null;
  
  const stmt = db.prepare("INSERT INTO noticias (titulo, extracto, contenido, imagen, fecha, destacada) VALUES (?, ?, ?, ?, ?, ?)");
  stmt.run(titulo, extracto, contenido, imagen, fecha, destacada ? 1 : 0, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Generar HTML actualizado
    generarHTML();
    
    res.json({ id: this.lastID, message: 'Noticia creada exitosamente' });
  });
  stmt.finalize();
});

// API para obtener noticias
app.get('/api/noticias', (req, res) => {
  db.all("SELECT * FROM noticias ORDER BY fecha DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// API para eliminar noticia
app.delete('/api/noticias/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM noticias WHERE id = ?", id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Generar HTML actualizado
    generarHTML();
    
    res.json({ message: 'Noticia eliminada' });
  });
});

// Función para generar HTML
function generarHTML() {
  db.all("SELECT * FROM noticias ORDER BY fecha DESC", (err, noticias) => {
    if (err) {
      console.error('Error obteniendo noticias:', err);
      return;
    }
    
    console.log(`Generando HTML con ${noticias.length} noticias`);
    
    // Aquí generaremos el HTML y lo enviaremos al sitio
    // Por ahora solo log para ver que funciona
    console.log('HTML generado exitosamente');
  });
}

app.listen(PORT, () => {
  console.log(`Eli CMS corriendo en puerto ${PORT}`);
});