# Workflow IA — Catholizare Admisiones

## Objetivo
Permitir que la IA programe cambios con contexto estable y mínimo intercambio.

## Regla de oro
Todo cambio va a `dev`. `main` solo recibe merges cuando ya pasó prueba.

## Qué me mandas SIEMPRE (en cada pedido)
1) Objetivo (1 línea): qué debe lograr el cambio.
2) Alcance: qué archivos se pueden tocar / qué NO se debe tocar.
3) Comandos:
   - git status
   - git log --oneline -10
   - git branch --show-current
4) Evidencia: pega el contenido del/los archivos a editar (o al menos los bloques relevantes).
5) Criterio de aceptación: “se considera listo cuando…”

## Cómo te respondo yo
- Lista exacta de archivos modificados
- Código final para copiar/pegar (por archivo)
- Comandos Git exactos: add/commit/push
- Checklist de prueba (DEV y PROD si aplica)

## Estructura del repo
- apps-script-dev/  -> entorno dev
- apps-script-prod/ -> entorno prod
- docs/             -> contexto + decisiones + workflow

## Convención de commits
- feat: ...
- fix: ...
- docs: ...
- chore: ...
