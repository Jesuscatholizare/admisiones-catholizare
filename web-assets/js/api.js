/**
 * RCCC - API Helper
 * Helper functions para comunicar con proxy2.php → GAS
 * Fecha: 2026-02-15
 */

// Configuración
const API_CONFIG = {
    PROXY_URL: '/proxy2.php',
    TIMEOUT: 30000,
    DEBUG: true
};

/**
 * Llamar proxy2.php con datos
 * @param {Object} data - Datos a enviar {action, candidateId, ...}
 * @param {Function} onSuccess - Callback éxito
 * @param {Function} onError - Callback error
 */
async function callAPI(data, onSuccess, onError) {
    try {
        showLoading(true);

        const response = await fetch(API_CONFIG.PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data),
            timeout: API_CONFIG.TIMEOUT
        });

        const result = await response.json();

        if (response.ok && result.success) {
            logDebug('API Success', result);
            if (onSuccess) onSuccess(result);
            showAlert('✅ ' + (result.message || 'Éxito'), 'success');
        } else {
            logDebug('API Error', result);
            const error = result.error || 'Error desconocido';
            if (onError) onError(error);
            showAlert('❌ ' + error, 'error');
        }
    } catch (error) {
        logDebug('API Exception', error);
        if (onError) onError(error.message);
        showAlert('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Validar token
 */
async function validateToken(token) {
    return new Promise((resolve, reject) => {
        callAPI(
            { action: 'validateToken', token: token },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

/**
 * Registrar candidato
 */
async function registerCandidate(data) {
    return new Promise((resolve, reject) => {
        callAPI(
            {
                action: 'handleRegistration',
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                categoriaProfesional: data.categoria,
                caminoAcademico: data.caminoAcademico,
                caminoEspiritual: data.caminoEspiritual
            },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

/**
 * Aceptar términos
 */
async function acceptTerms(candidateId, token) {
    return new Promise((resolve, reject) => {
        callAPI(
            {
                action: 'acceptTerms',
                candidateId: candidateId,
                token: token,
                clientIp: await getClientIP()
            },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

/**
 * Enviar respuestas de examen
 */
async function submitExam(exam, candidateId, token, answers) {
    return new Promise((resolve, reject) => {
        callAPI(
            {
                action: 'handleExamSubmit',
                exam: exam,
                candidateId: candidateId,
                token: token,
                answers: answers,
                timeSpent: getTimeSpent(),
                userAgent: navigator.userAgent
            },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

/**
 * Obtener candidatos para admin
 */
async function getCandidates() {
    return new Promise((resolve, reject) => {
        callAPI(
            { action: 'getCandidatesForAdmin' },
            (result) => resolve(result.candidates || []),
            (error) => reject(error)
        );
    });
}

/**
 * Aprobar examen (admin)
 */
async function approveExam(candidateId, exam) {
    return new Promise((resolve, reject) => {
        callAPI(
            {
                action: 'approveExamAdmin',
                candidateId: candidateId,
                exam: exam
            },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

/**
 * Rechazar examen (admin)
 */
async function rejectExam(candidateId, exam, reason) {
    return new Promise((resolve, reject) => {
        callAPI(
            {
                action: 'rejectExamAdmin',
                candidateId: candidateId,
                exam: exam,
                reason: reason
            },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

/**
 * Categorizar candidato (admin)
 */
async function categorizeCandidate(candidateId, category) {
    return new Promise((resolve, reject) => {
        callAPI(
            {
                action: 'assignCategoryAndApprove',
                candidateId: candidateId,
                category: category
            },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

/**
 * Realizar handoff (admin)
 */
async function performHandoff(candidateId) {
    return new Promise((resolve, reject) => {
        callAPI(
            {
                action: 'performHandoff',
                candidateId: candidateId
            },
            (result) => resolve(result),
            (error) => reject(error)
        );
    });
}

// UI Helpers

/**
 * Mostrar/ocultar loading
 */
function showLoading(show = true) {
    const btn = document.querySelector('button[type="submit"], .btn-primary');
    if (!btn) return;

    if (show) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="loading"></span> Procesando...';
    } else {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        if (btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
        }
    }
}

/**
 * Mostrar alerta
 */
function showAlert(message, type = 'info') {
    // Buscar o crear contenedor de alerta
    let alert = document.querySelector('.alert');
    if (!alert) {
        alert = document.createElement('div');
        alert.className = 'alert';
        const card = document.querySelector('.card');
        if (card) {
            card.insertBefore(alert, card.firstChild);
        }
    }

    alert.className = `alert alert-${type} show`;
    alert.textContent = message;

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
}

/**
 * Obtener IP del cliente
 */
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

/**
 * Calcular tiempo transcurrido
 */
let startTime = null;

function initTimer() {
    startTime = Date.now();
}

function getTimeSpent() {
    if (!startTime) return 0;
    return Math.round((Date.now() - startTime) / 1000);
}

/**
 * Log en modo debug
 */
function logDebug(label, data) {
    if (API_CONFIG.DEBUG) {
        console.log(`[RCCC] ${label}:`, data);
    }
}

/**
 * Extraer parámetros de URL
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        uid: params.get('uid'),
        token: params.get('token'),
        exam: params.get('exam')
    };
}

/**
 * Guardar/obtener datos del localStorage
 */
const storage = {
    set: (key, value) => {
        localStorage.setItem(`rccc_${key}`, JSON.stringify(value));
    },
    get: (key) => {
        const value = localStorage.getItem(`rccc_${key}`);
        return value ? JSON.parse(value) : null;
    },
    remove: (key) => {
        localStorage.removeItem(`rccc_${key}`);
    },
    clear: () => {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('rccc_')) localStorage.removeItem(key);
        });
    }
};

/**
 * Validar email
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validar teléfono
 */
function isValidPhone(phone) {
    const regex = /^[\d\s\-\+\(\)]{10,}$/;
    return regex.test(phone.replace(/\s/g, ''));
}

// Inicializar en document ready
document.addEventListener('DOMContentLoaded', () => {
    initTimer();
    logDebug('API Helper Initialized', { proxy: API_CONFIG.PROXY_URL });
});
