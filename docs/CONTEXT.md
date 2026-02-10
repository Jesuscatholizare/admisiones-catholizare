# Catholizare — Proceso de Admisión (Contexto)

## Objetivo
Centralizar y automatizar el proceso de admisión (dashboard + acciones + integración con hojas y correos).

## Repositorio
- Rama main: estable / releases
- Rama dev: trabajo diario

## Carpetas
- apps-script-dev/: versión en desarrollo
- apps-script-prod/: versión estable (producción)

## Flujo general
Usuario -> WebApp -> Apps Script -> Sheets -> (emails/notificaciones)

## Convenciones
- Cambios nuevos siempre en rama dev
- main solo recibe merges cuando ya pasó pruebas
