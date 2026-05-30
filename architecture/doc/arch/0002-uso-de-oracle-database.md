# 2. Uso de Oracle Database

Date: 2026-05-28

## Status

Accepted

## Context

Forgetask requiere almacenar información persistente relacionada con usuarios, tareas, sprints, métricas y reportes. Pero se nos exige utilizar el entorno OCI para nuestro proyecto, por lo que necesitamos utilizar su base de datos

## Decision

Se utilizará Oracle Database como sistema gestor de base de datos principal.

## Consequences

Positivas:

- Soporte robusto para transacciones.
- Alta confiabilidad.
- Herramientas maduras para administración.
- Escalabilidad empresarial.

Negativas:

- Mayor complejidad administrativa comparada con motores más ligeros.
- Mayor costo.