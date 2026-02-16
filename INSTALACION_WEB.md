# 🚀 GUÍA DE INSTALACIÓN — Sistema Web RCCC

**Versión**: 1.0
**Fecha**: 2026-02-15
**Tiempo estimado**: 30-45 minutos

---

## 📋 Resumen de Instalación

```
PASO 1: Descargar archivos desde GitHub
PASO 2: Subir archivos a profesionales.catholizare.com
PASO 3: Actualizar Code.gs en Google Apps Script
PASO 4: Configurar URLs en Google Sheets
PASO 5: Actualizar proxy2.php con deployment ID
PASO 6: Testing completo
```

---

## 📥 PASO 1: Descargar Archivos

Los archivos están en GitHub en la rama `claude/candidate-selection-tracker-rb6Ke`:

**Ubicación en GitHub**:
```
web-assets/catholizare_sistem/
├── registro/
│   └── index.html
├── terminos/
│   └── index.html
├── examen-e2/
│   └── index.html
├── examen-e3/
│   └── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── api.js
├── proxy2.php
├── logs/          (crear carpeta vacía)
└── cache/         (crear carpeta vacía)
```

**Descargar**:
1. Ve a GitHub: https://github.com/Jesuscatholizare/admisiones-catholizare
2. Branch: `claude/candidate-selection-tracker-rb6Ke`
3. Click "Code" → "Download ZIP"
4. Extrae la carpeta `web-assets/catholizare_sistem/` (NO solo web-assets)

---

## 📤 PASO 2: Subir Archivos a Servidor Web

### Opción A: cPanel File Manager

1. Abre cPanel de tu hosting
2. Click "File Manager"
3. Navega a: `/home/tuusuario/public_html/` (o donde esté profesionales.catholizare.com)
4. **CREA CARPETA**: `catholizare_sistem/`
5. Dentro de esa carpeta, crea esta estructura:

```
public_html/catholizare_sistem/
├── registro/
│   └── index.html
├── terminos/
│   └── index.html
├── examen-e2/
│   └── index.html
├── examen-e3/
│   └── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── api.js
├── proxy2.php
├── logs/          (crear carpeta vacía)
└── cache/         (crear carpeta vacía)
```

6. Sube cada archivo en su lugar correcto
7. **IMPORTANTE**: Todo debe estar dentro de `/catholizare_sistem/`

### Opción B: FTP/SFTP

1. Abre cliente FTP (FileZilla, WinSCP, etc.)
2. Conecta a tu servidor
3. Navega a la carpeta raíz web
4. Crea las carpetas (si no existen)
5. Sube los archivos respetando la estructura

### Opción C: SSH

```bash
# Conectar
ssh usuario@profesionales.catholizare.com

# Crear estructura
mkdir -p public_html/catholizare_sistem/{registro,terminos,examen-e2,examen-e3,assets/{css,js},logs,cache}

# Subir archivos (desde tu máquina)
scp web-assets/catholizare_sistem/registro/index.html usuario@profesionales.catholizare.com:~/public_html/catholizare_sistem/registro/
scp web-assets/catholizare_sistem/terminos/index.html usuario@profesionales.catholizare.com:~/public_html/catholizare_sistem/terminos/
# ... etc para todos los archivos

# Importante: Todo va dentro de ~/public_html/catholizare_sistem/
```

### Verificar permisos

```bash
# Los HTML deben tener permisos 644
chmod 644 registro/index.html
chmod 644 terminos/index.html
chmod 644 examen-e2/index.html
chmod 644 examen-e3/index.html

# PHP debe tener permisos 644
chmod 644 proxy2.php

# Las carpetas de logs y cache deben ser escribibles
chmod 755 logs/
chmod 755 cache/
```

---

## 🔧 PASO 3: Actualizar Code.gs en Google Apps Script

### Agregar nuevas funciones

1. Abre Google Sheets DEV: https://docs.google.com/spreadsheets/d/18jo3Na2fVaCop6S3AA4Cws_QWPJ3q-rFMkEH5QhUGb8
2. Extensions → Apps Script
3. Abre Code.gs
4. Ve al **FINAL del archivo**
5. Copia y pega las funciones de `CODE_GAS_UPDATES.md`:
   - acceptTerms()
   - sendEmailTermsAcceptedToAdmin()
   - validateToken()
   - Actualizar doPost()

6. **Presiona Ctrl+S para guardar**
7. No ejecutes nada, solo guarda

### Agregar columnas en Google Sheets

1. Abre el tab "Candidatos" en Google Sheets
2. Desplázate a la derecha hasta la última columna
3. Agrega dos columnas nuevas (L y M):

| Columna | Nombre | Tipo |
|---------|--------|------|
| L | fecha_aceptacion_terminos | Texto (formato DateTime) |
| M | ip_aceptacion_terminos | Texto |

---

## ⚙️ PASO 4: Configurar URLs

### En Google Sheets Config

Agrega/actualiza estas líneas en la hoja "Config":

```
Key: PROXY_URL
Value: https://profesionales.catholizare.com/proxy2.php
Type: string

Key: WEBSITE_URL
Value: https://profesionales.catholizare.com
Type: string

Key: REGISTRO_URL
Value: https://profesionales.catholizare.com/registro/
Type: string

Key: TERMINOS_URL
Value: https://profesionales.catholizare.com/terminos/
Type: string

Key: EXAMEN_E2_URL
Value: https://profesionales.catholizare.com/examen-e2/
Type: string

Key: EXAMEN_E3_URL
Value: https://profesionales.catholizare.com/examen-e3/
Type: string
```

---

## 🔑 PASO 5: Actualizar proxy2.php

### Agregar Deployment ID

1. En Google Apps Script, haz click en "Deploy"
2. Busca el "New deployment" o copia el "Deployment ID"
3. Debería verse así: `AKfycbxyz...`

4. En proxy2.php, busca esta línea:

```php
define('GAS_DEPLOYMENT_URL', 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercopy');
```

5. Reemplaza `YOUR_DEPLOYMENT_ID` con tu ID real:

```php
define('GAS_DEPLOYMENT_URL', 'https://script.google.com/macros/d/AKfycbxyz.../usercopy');
```

6. Guarda el archivo

---

## 🧪 PASO 6: Testing Completo

### Test 1: Acceso a formulario

```
1. Abre: https://profesionales.catholizare.com/catholizare_sistem/registro/
2. Deberías ver el formulario de registro
3. Completa todos los campos
4. Click "Registrarse"
5. Deberías ver: "✅ Registro exitoso"
```

### Test 2: Verificar email

```
1. Revisa tu email (incluye spam)
2. Deberías recibir: "Tu candidatura en RCCC"
3. El email debe incluir link de examen E1
```

### Test 3: Examen E1

```
1. Copia el link del email (formato: /examen-e1/?uid=...&token=...)
2. Abre el link en navegador
3. Deberías ver: "Examen E1"
4. Completa preguntas
5. Click "Enviar Examen"
6. Deberías ver: "✅ Examen enviado"
```

### Test 4: Admin aprueba E1

```
1. Abre dashboard admin
2. Filtra por candidato de test
3. Click "Acciones"
4. Tab "Aprobar Examen"
5. Selecciona "E1"
6. Click "Aprobar Examen"
7. Deberías ver: "✅ Éxito"
```

### Test 5: Aceptar Términos

```
1. Revisa email del candidato
2. Deberías recibir: "Aceptación de Términos"
3. Click link (formato: /terminos/?uid=...&token=...)
4. Lee términos
5. Marca 3 checkboxes de aceptación
6. Click "Acepto los Términos"
7. Deberías ver: "✅ Términos aceptados"
8. Redirige a examen E2 automáticamente
```

### Test 6: Verificar Google Sheets

```
1. Abre Google Sheets Candidatos
2. Busca tu candidato de test
3. Verifica:
   - Columna L: tiene fecha/hora de aceptación
   - Columna M: tiene IP
   - Columna K (status): es "pending_review_E2"
```

---

## 📊 Estructura Final Esperada

Después de completar, deberías tener en profesionales.catholizare.com:

```
profesionales.catholizare.com/
└── catholizare_sistem/                     ← ⭐ TODO AQUÍ
    ├── registro/index.html                  ✅
    ├── terminos/index.html                  ✅
    ├── examen-e2/index.html                 ✅
    ├── examen-e3/index.html                 ✅
    ├── assets/
    │   ├── css/styles.css                   ✅
    │   └── js/api.js                        ✅
    ├── proxy2.php                           ✅ (actualizado con Deployment ID)
    ├── logs/                                ✅ (carpeta, permiso 755)
    ├── cache/                               ✅ (carpeta, permiso 755)
    └── .htaccess                            (opcional, para rewrite)
```

---

## 🔐 Verificación de Seguridad

### .htaccess (opcional pero recomendado)

Crea archivo `.htaccess` en la raíz:

```apache
# Permitir acceso a archivos HTML y PHP
<FilesMatch "\.html$|\.php$">
    Allow from all
</FilesMatch>

# Proteger carpetas sensibles
<FilesMatch "logs|cache">
    Deny from all
</FilesMatch>

# CORS headers (si Apache)
Header always set Access-Control-Allow-Origin "https://profesionales.catholizare.com"
Header always set Access-Control-Allow-Methods "POST, GET, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, X-Requested-With"
```

---

## ❌ Troubleshooting

### Error: "404 Not Found" en formulario

**Causa**: Archivos no están en la ubicación correcta

**Solución**:
1. Verifica que `/registro/index.html` exista
2. Asegúrate de subir en carpeta correcta (no en subfolder)
3. Verifica permisos: `chmod 644 registro/index.html`

### Error: "CORS blocked"

**Causa**: proxy2.php no acepta origen

**Solución**:
1. Abre proxy2.php
2. Verifica la sección `$allowed_origins`
3. Asegúrate que incluya `https://profesionales.catholizare.com`

### Error: "Rate limit exceeded"

**Causa**: Demasiados requests desde la misma IP

**Solución**:
1. En proxy2.php, aumenta `MAX_REQUESTS_PER_IP`
2. Reduce en modo test:
```php
define('MAX_REQUESTS_PER_IP', 50); // Temporal para testing
```

### Error: "Gateway error"

**Causa**: proxy2.php no puede conectar a GAS

**Solución**:
1. Verifica Deployment ID en proxy2.php
2. Verifica que URL de GAS sea correcta
3. Verifica que GAS esté deployado como "Web app"

---

## ✅ Checklist Final

- [ ] Descargué archivos de GitHub
- [ ] Creé estructura de carpetas en servidor web
- [ ] Subí todos los archivos HTML al servidor
- [ ] Subí proxy2.php y actualicé Deployment ID
- [ ] Agregué carpetas logs/ y cache/ con permisos 755
- [ ] Copié funciones a Code.gs en Apps Script
- [ ] Agregué columnas L y M en Google Sheets
- [ ] Actualicé URLs en Google Sheets Config
- [ ] Probé acceso a https://profesionales.catholizare.com/registro/
- [ ] Hice testing completo (6 tests)
- [ ] ✅ Sistema funcionando correctamente

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en `/logs/proxy.log` (si DEBUG=true en proxy2.php)
2. Abre consola del navegador (F12) y revisa errores
3. En Google Apps Script, abre Extensions → Executions para ver logs
4. Contacta: admin@rccc.org

---

**¡Instalación Completada!** 🎉

El sistema completo de registro, exámenes y términos está funcionando.

