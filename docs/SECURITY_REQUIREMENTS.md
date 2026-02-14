# 🔒 Requisitos de Seguridad — Tests Anti-Fraude

## ⚠️ CRÍTICO: Protección de Evaluaciones

Cada test (Test_1, Test_2, Test_3) DEBE tener medidas de seguridad para evitar:
1. **Copia de respuestas** (copiar/pegar)
2. **Cambio de ventana** (tab switching)
3. **Uso de IA** para respuestas abiertas
4. **Exceso de tiempo** (máximo 2 horas por test)

---

## 📋 Requisito 1: Anti-Copia (Copy Protection)

### Implementación
```javascript
// En HTML del formulario de test:
document.addEventListener('copy', (e) => {
  e.preventDefault();
  showWarning('Copiar contenido está deshabilitado en esta evaluación');
});

document.addEventListener('cut', (e) => {
  e.preventDefault();
  showWarning('Cortar contenido está deshabilitado');
});

document.addEventListener('paste', (e) => {
  e.preventDefault();
  showWarning('Pegar contenido está deshabilitado en respuestas');
});
```

### Qué hace
- ❌ Bloquea Ctrl+C / Cmd+C
- ❌ Bloquea Ctrl+V / Cmd+V
- ❌ Bloquea Ctrl+X / Cmd+X
- ✅ Muestra advertencia al candidato
- ✅ Registra intentos en Timeline

### Evento a registrar
```
Evento: INTENTO_COPIA
Candidato: [ID]
Timestamp: [fecha/hora]
Detalles: Intento bloqueado de copiar en Test N
```

---

## 🪟 Requisito 2: Anti-Cambio de Ventana (Tab Switching Detection)

### Implementación
```javascript
// En la página del test:
let tabChanges = 0;
const MAX_TAB_SWITCHES = 3; // máximo 3 cambios permitidos

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Usuario cambió de ventana/tab
    tabChanges++;

    if (tabChanges > MAX_TAB_SWITCHES) {
      // Pausar test automáticamente
      pauseTestAndWarn(`Has cambiado de ventana ${tabChanges} veces.
                        El test se ha pausado. Máximo 3 intentos permitidos.`);
      addTimelineEvent('CAMBIO_VENTANA_EXCEDIDO', {tabChanges: tabChanges});
    } else {
      showWarning(`Cambio de ventana detectado (${tabChanges}/${MAX_TAB_SWITCHES}).
                   No cambies de ventana durante la evaluación.`);
      addTimelineEvent('CAMBIO_VENTANA_DETECTADO', {attempt: tabChanges});
    }
  }
});
```

### Qué hace
- 🔍 Detecta cada vez que el usuario cambia a otro tab/ventana
- ⚠️ Advierte después de 1er y 2do cambio
- ❌ Pausa automáticamente después de 3 cambios
- ✅ Registra intentos en Timeline

### Eventos a registrar
```
Evento 1: CAMBIO_VENTANA_DETECTADO
Evento 2: CAMBIO_VENTANA_EXCEDIDO
Evento 3: TEST_PAUSADO_AUTO (por exceso de cambios)
```

---

## 🤖 Requisito 3: Protección Contra IA (Validación de Respuestas)

### Implementación (Frontend)
```javascript
// En el submitTest():
// 1. Validar respuestas no son demasiado "perfectas"
// 2. Detectar patrones de IA

function validateResponseForAI(responseText) {
  const RED_FLAGS = [
    'En conclusión, esta respuesta proporciona',  // patrón ChatGPT
    'Como asistente de IA',                        // auto-identificación
    'De acuerdo con mi entrenamiento',            // patrón de IA
    '...',                                        // agregar más patrones
  ];

  const hasRedFlag = RED_FLAGS.some(flag =>
    responseText.toLowerCase().includes(flag.toLowerCase())
  );

  return !hasRedFlag;
}
```

### Implementación (Backend - OpenAI Grading)
```
En la función gradeOpenAnswers():

1. OpenAI recibe respuesta
2. OpenAI también evalúa si la respuesta parece generada por IA
3. Retorna:
   - calificacion: 0-100
   - probabilidad_ia: 0-100 (qué tan probable es que sea IA)

4. Si probabilidad_ia > 70:
   - Registrar en Timeline: RESPUESTA_SOSPECHOSA_IA
   - Admin verá advertencia en Dashboard
   - Admin decide si rechaza o permite
```

### Prompt para OpenAI
```
Califica la siguiente respuesta en contexto psicológico/consultoría.

IMPORTANTE: También evalúa si la respuesta parece haber sido generada por IA.

Respuesta: [RESPUESTA_DEL_CANDIDATO]

Retorna JSON:
{
  "calificacion": 0-100,
  "probabilidad_ia": 0-100,
  "justificacion": "...",
  "flagged": true/false,
  "razon_flag": "..."
}
```

### Eventos a registrar
```
Evento: RESPUESTA_POSIBLE_IA
Candidato: [ID]
Timestamp: [fecha/hora]
Test: N
Probabilidad_IA: [0-100]
Detalles: Admin debe revisar manualmente
```

---

## ⏱️ Requisito 4: Timer (Máximo 2 Horas por Test)

### Implementación (Frontend)
```javascript
const TEST_TIMEOUT_MINUTES = 120; // 2 horas = 120 minutos
let timeStarted = null;
let timeRemaining = TEST_TIMEOUT_MINUTES * 60; // en segundos

function initTimer() {
  timeStarted = new Date();
  updateTimerDisplay();

  const interval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();

    if (timeRemaining <= 0) {
      clearInterval(interval);
      autoSubmitTest('Se acabó el tiempo. Test enviado automáticamente.');
    } else if (timeRemaining === 5 * 60) {
      // Advertencia a los 5 minutos
      showWarning('Te quedan 5 minutos para completar el test');
    } else if (timeRemaining === 1 * 60) {
      // Advertencia a 1 minuto
      showWarning('Te queda 1 minuto. Envía tu respuesta ahora.');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  document.getElementById('timer').textContent =
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Color rojo si quedan menos de 5 minutos
  if (timeRemaining < 5 * 60) {
    document.getElementById('timer').style.color = 'red';
  }
}
```

### Implementación (Backend)
```javascript
// En submitTest():
function validateTestDuration(candidateId, testNumber) {
  // Verificar en Sheets cuándo se inició el test
  const testStarted = getTestStartTime(candidateId, testNumber);
  const now = new Date();
  const durationMinutes = (now - testStarted) / (1000 * 60);

  if (durationMinutes > 120) {
    return {
      valid: false,
      reason: 'Test excedió 2 horas. No puede enviarse.',
      durationMinutes: durationMinutes
    };
  }

  return {
    valid: true,
    durationMinutes: durationMinutes
  };
}
```

### Eventos a registrar
```
Evento: TEST_INICIADO
Test: N
Candidato: [ID]
Timestamp: [inicio]
Deadline: [inicio + 2 horas]

Evento: TEST_COMPLETADO_A_TIEMPO
o
Evento: TEST_COMPLETADO_EXTEMPORANEO (si pasó 2 horas)

Evento: TEST_AUTO_ENVIADO (si se acabó tiempo)
```

---

## 📊 Dashboard Admin — Indicadores de Riesgo

En la pestaña de detalles de candidato, el admin verá:

```
┌─────────────────────────────────────┐
│ ⚠️ INDICADORES DE SEGURIDAD         │
├─────────────────────────────────────┤
│ Copias intentadas:        2         │
│ Cambios de ventana:       1/3       │
│ Respuestas sospechosas:   1 ⚠️      │
│ Tiempo total Test 1:      1h 45min ✅
│                                      │
│ 🔴 RECOMENDACIÓN: Revisar manual    │
│    Respuesta Q3 parece IA (78%)      │
└─────────────────────────────────────┘
```

Admin puede entonces:
- ✅ Aprobar de todas formas
- ❌ Rechazar por fraude
- 🔍 Investigar manualmente

---

## 🔐 Implementación en Sheets

Agregar columnas a **Test_1, Test_2, Test_3**:

```
... (columnas existentes) ...
F: Calificacion_IA
G: Aprobado_Admin
H: Intentos_Copia          ← NUEVO
I: Cambios_Ventana         ← NUEVO
J: Tiempo_Total_Minutos    ← NUEVO
K: Probabilidad_IA         ← NUEVO (0-100)
L: Respuesta_Sospechosa    ← NUEVO (SÍ/NO)
M: Notas_Admin             ← Observaciones
```

---

## 📱 Requisito 5: Bloqueo de Dispositivos Móviles

Algunos contextos requieren que el test SOLO se responda desde desktop/laptop:

```javascript
function checkDeviceType() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent);

  if (isMobile) {
    showError('Este test debe responderse desde una computadora de escritorio. ' +
              'Los celulares/tablets no están permitidos.');
    return false;
  }
  return true;
}
```

**Decir si es necesario o no en tu contexto.**

---

## 🎯 Checklist de Seguridad (Fase 7 — Dashboard)

Al implementar el código, validar:

- [ ] Anti-copia funcionando (Ctrl+C/V/X bloqueados)
- [ ] Tab switching detectado y limitado a 3
- [ ] Timer visible y funcionando (cuenta hacia atrás)
- [ ] Auto-envío al agotar 2 horas
- [ ] Advertencias a 5 min y 1 min
- [ ] Eventos registrados en Timeline
- [ ] OpenAI detecta respuestas sospechosas
- [ ] Dashboard muestra indicadores de riesgo
- [ ] Admin puede aprobar/rechazar basado en indicadores

---

## 📝 Próximas Decisiones

- [ ] ¿Bloquear móviles completamente o permitir?
- [ ] ¿Máximo 3 cambios de ventana es correcto o menos?
- [ ] ¿Qué % de probabilidad de IA dispara alerta (70% es muy bajo?)?
- [ ] ¿Permitir pausa durante el test o se pausa automáticamente después?
