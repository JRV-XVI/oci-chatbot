# 1. Uso de WebSockets

Date: 2026-05-28

## Status

Accepted

## Context

Los usuarios deben visualizar cambios en tareas y sprints sin necesidad de recargar continuamente la página.

Las actualizaciones frecuentes mediante consultas periódicas (polling) generarían tráfico innecesario y mayor carga sobre el servidor.

## Decision

Se implementará un servicio independiente basado en WebSockets para enviar actualizaciones en tiempo real a los clientes conectados.

## Consequences

Positivas:

- Actualizaciones instantáneas.
- Menor consumo de ancho de banda.
- Mejor experiencia de usuario.

Negativas:

- Mayor complejidad operativa.
- Necesidad de gestionar conexiones persistentes.
- Incremento en los requerimientos de monitoreo.