# 1. Uso de Spring Boot

Date: 2026-05-28

## Status

Accepted

## Context

Forgetask requiere exponer servicios REST, gestionar autenticación de usuarios, realizar operaciones CRUD sobre tareas y sprints, e integrarse con servicios externos.

Se necesita una tecnología madura, ampliamente documentada y con soporte para aplicaciones empresariales.

## Decision

Se utilizará Spring Boot como framework principal para el desarrollo del backend.

Spring Boot proporcionará la infraestructura para servicios REST, inyección de dependencias, configuración y acceso a datos.

## Consequences

Positivas:

- Amplio ecosistema de herramientas.
- Alta productividad de desarrollo.
- Integración sencilla con Oracle Database.
- Comunidad extensa y documentación abundante.

Negativas:

- Curva de aprendizaje para desarrolladores sin experiencia en Spring.
- Mayor consumo de recursos respecto a soluciones más ligeras.