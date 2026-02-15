# 🔗 WordPress Integration — API Proxy

Este directorio contiene la capa intermediaria que conecta tu formulario de WordPress con el sistema de Apps Script.

## ¿Por qué un API Proxy?

Ventajas sobre conexión directa:
- ✅ **Seguridad**: Valida origen de solicitudes (solo WordPress)
- ✅ **Rate limiting**: Protege contra abuso (100 req/hora por IP)
- ✅ **Validación**: Verifica datos antes de enviar a Apps Script
- ✅ **Logging**: Auditoría completa de todas las solicitudes
- ✅ **Confiabilidad**: Maneja errores de conexión gracefully
- ✅ **Escalabilidad**: Puede agregar caché, metrics, etc.

## Instalación

### Paso 1: Obtener los Script IDs

1. Abre tu Google Apps Script (en Google Sheets, Extensions → Apps Script)
2. Haz clic en "Deploy" → "New Deployment"
3. Selecciona "Web app"
4. Configura:
   - Execute as: Tu cuenta de Google
   - Who has access: Anyone
5. Copia el "Deployment ID" (ej: `AKfycbx...`)

**Para DEV:**
```
DEV_APPS_SCRIPT_URL = https://script.google.com/macros/d/AKfycbx.../usercopy
                                                      ↑↑↑ SCRIPT ID DEV
```

**Para PROD:**
```
PROD_APPS_SCRIPT_URL = https://script.google.com/macros/d/AKfycbz.../usercopy
                                                       ↑↑↑ SCRIPT ID PROD
```

### Paso 2: Actualizar api-proxy.php

Edita las líneas de configuración:

```php
const DEV_APPS_SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_DEV_SCRIPT_ID/usercopy';
const PROD_APPS_SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_PROD_SCRIPT_ID/usercopy';
```

Reemplaza `YOUR_DEV_SCRIPT_ID` y `YOUR_PROD_SCRIPT_ID` con tus IDs.

### Paso 3: Subir a tu servidor

```bash
# Via FTP o tu panel de control
scp api-proxy.php usuario@profesionales.catholizare.com:/public_html/

# Asegurar permisos
chmod 644 api-proxy.php

# Crear directorios para logs
mkdir -p /public_html/logs /public_html/cache
chmod 755 /public_html/logs /public_html/cache
```

### Paso 4: Probar la conexión

```bash
curl -X POST https://profesionales.catholizare.com/api-proxy.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initial_registration",
    "nombre": "Test User",
    "email": "test@example.com",
    "telefono": "+57 310 555 1234",
    "fecha_examen": "2026-02-20"
  }'
```

Deberías recibir:
```json
{
  "success": true,
  "message": "Candidato registrado exitosamente",
  "timestamp": "2026-02-15 10:30:45"
}
```

## Formulario WordPress

### HTML/JavaScript para tu página

```html
<!-- En tu página de WordPress -->
<form id="registration-form">
  <div class="form-group">
    <label>Nombre Completo</label>
    <input type="text" name="nombre" required>
  </div>

  <div class="form-group">
    <label>Email</label>
    <input type="email" name="email" required>
  </div>

  <div class="form-group">
    <label>Teléfono</label>
    <input type="tel" name="telefono" required placeholder="+57 310 555 1234">
  </div>

  <div class="form-group">
    <label>Fecha del Examen</label>
    <input type="date" name="fecha_examen" required>
  </div>

  <button type="submit">Enviar Registro</button>
</form>

<script>
document.getElementById('registration-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const payload = {
    action: 'initial_registration',
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    telefono: formData.get('telefono'),
    fecha_examen: formData.get('fecha_examen')
  };

  try {
    const response = await fetch('https://profesionales.catholizare.com/api-proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Registro exitoso. Revisa tu email para instrucciones.');
      e.target.reset();
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (error) {
    alert('Error de conexión: ' + error.message);
  }
});
</script>
```

## Flujos Soportados

### Flujo 1: Registro Inicial

```
WordPress Form
    ↓
api-proxy.php (valida datos, rate limiting)
    ↓
Google Apps Script (registerCandidate)
    ↓
Google Sheets (Candidatos)
    ↓
Email de bienvenida
```

**Payload:**
```json
{
  "action": "initial_registration",
  "nombre": "Juan García",
  "email": "juan@example.com",
  "telefono": "+57 310 555 1234",
  "fecha_examen": "2026-02-20"
}
```

### Flujo 2: Envío de Examen

```
WebApp Exam Form
    ↓
api-proxy.php (valida token y tiempo)
    ↓
Google Apps Script (gradeExam + OpenAI)
    ↓
Google Sheets (Test_1, Test_2, Test_3)
    ↓
Email con resultado
```

**Payload:**
```json
{
  "action": "submit_exam",
  "token": "E1_CANDIDATO_123456_ABC123",
  "exam": "E1",
  "answers": {
    "q1": "Mi respuesta a la pregunta 1",
    "q2": "Mi respuesta abierta más larga..."
  },
  "startedAt": "2026-02-20T14:00:00Z",
  "finishedAt": "2026-02-20T15:45:30Z",
  "blur_count": 1,
  "copy_count": 0
}
```

## Seguridad

### Validaciones en api-proxy.php

1. **Origen (Origin Header)**
   - Solo acepta `https://profesionales.catholizare.com`
   - Rechaza solicitudes sin Origin/Referer

2. **Rate Limiting**
   - Max 100 solicitudes por IP por hora
   - Almacena contador en `/cache/rate_limit_*.txt`

3. **Validación de Datos**
   - Email válido (filter_var)
   - Teléfono (7-15 dígitos)
   - Fecha en formato YYYY-MM-DD
   - Campos requeridos

4. **Logging**
   - Todas las solicitudes en `/logs/YYYY-MM-DD.log`
   - Incluye IP, User-Agent, action, status
   - Útil para auditoría y debugging

### CORS Headers

```php
Access-Control-Allow-Origin: https://profesionales.catholizare.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Troubleshooting

### Error: "Origen no autorizado"

**Causa**: La solicitud no viene de tu dominio WordPress.

**Solución**:
```php
// En api-proxy.php, agregar tu dominio a ALLOWED_ORIGINS
const ALLOWED_ORIGINS = [
    'https://profesionales.catholizare.com',
    'https://test.ejemplo.com',  // ← Agregar aquí
];
```

### Error: "Límite de solicitudes excedido"

**Causa**: La IP hizo más de 100 solicitudes en 1 hora.

**Solución**: Esperar 1 hora o limpiar el cache:
```bash
rm -f /public_html/cache/rate_limit_*.txt
```

### Error: "JSON malformado"

**Causa**: El formulario no envía JSON válido.

**Solución**: Asegurar que JavaScript hace `JSON.stringify(payload)`:
```javascript
body: JSON.stringify(payload)  // ✅ Correcto
body: payload                   // ❌ Incorrecto
```

### Error: "Timeout" (30 segundos)

**Causa**: Google Apps Script está lento.

**Solución**:
1. Revisar logs en Google Apps Script (`Extensions → Executions`)
2. Optimizar funciones lentas
3. Aumentar timeout en api-proxy.php:
   ```php
   curl_setopt($ch, CURLOPT_TIMEOUT, 60);  // 60 segundos
   ```

## Monitoreo

### Ver logs de solicitudes

```bash
# Logs del proxy
tail -f /public_html/logs/2026-02-15.log

# Ver por IP
grep "192.168.1.1" /public_html/logs/*.log

# Ver por action
grep "submit_exam" /public_html/logs/*.log
```

### Estadísticas rápidas

```bash
# Solicitudes por hour
grep "initial_registration" /public_html/logs/2026-02-15.log | wc -l

# Errores
grep "BLOCKED\|ERROR" /public_html/logs/2026-02-15.log
```

## Próximos Pasos

1. **Rate limiting avanzado**: Per-email instead of per-IP
2. **Caché**: Almacenar respuestas para candidatos que reintenten
3. **Webhooks**: Notificaciones en tiempo real
4. **Métricas**: Integración con Google Analytics
5. **Encriptación**: SSL pinning para requests

## Referencia Rápida

| Acción | Payload | Descripción |
|--------|---------|-------------|
| `initial_registration` | nombre, email, telefono, fecha_examen | Registra candidato y envía token |
| `submit_exam` | token, exam, answers, startedAt, finishedAt | Envía examen completado para calificar |

## Soporte

Para errores o preguntas:
- 📋 Revisar logs en `/logs/`
- 🔍 Activar modo debug en Code.gs
- 📧 Contactar admin@rccc.org

---

**Última actualización**: 2026-02-15
**Versión**: 1.0
**Status**: ✅ Producción
