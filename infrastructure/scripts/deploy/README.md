# Deploy de Aplicación

Este directorio contiene los scripts para el **ciclo de vida de despliegue de la aplicación**:
compilar la app, construir/publicar la imagen Docker y desplegarla en Kubernetes.

A diferencia de los scripts de `../utils/`, que participan en el aprovisionamiento
general del entorno, estos scripts están pensados para la **iteración diaria del
desarrollo**: cuando ya existe infraestructura, pero se quiere volver a construir
o volver a desplegar la aplicación.

> 📖 Contexto general:
> - Infraestructura raíz: [`../../README.md`](../../README.md)
> - Scripts de operación del entorno: [`../README.md`](../README.md)
> - Scripts internos y orquestadores: [`../utils/README.md`](../utils/README.md)
> - Manifests y contexto de Kubernetes: [`../../kubernetes/README.md`](../../kubernetes/README.md)
> - Infraestructura Terraform: [`../../terraform/README.md`](../../terraform/README.md)

---

## Contenido

```text
infraestructura/scripts/deploy/
├── build.sh   ← Compila la app, construye la imagen Docker y la publica
├── deploy.sh  ← Genera el manifest final y lo aplica en Kubernetes
└── README.md
```

---

## Cuándo usar esta carpeta

Usa estos scripts cuando:

- El entorno OCI y Kubernetes **ya fue aprovisionado**
- Ya ejecutaste `source ../env.sh` en tu shell
- Quieres volver a compilar la app después de cambios en backend/frontend
- Quieres desplegar una nueva versión en OKE sin rehacer todo el `setup`

**No** uses esta carpeta para crear infraestructura desde cero.  
Para eso existen:

- [`../setup.sh`](../setup.sh)
- [`../destroy.sh`](../destroy.sh)
- [`../utils/main-setup.sh`](../utils/main-setup.sh)
- [`../utils/main-destroy.sh`](../utils/main-destroy.sh)

---

## Dependencias importantes

Estos scripts dependen del estado y entorno cargado previamente por:

- [`../env.sh`](../env.sh), que exporta variables y carga funciones auxiliares
- [`../utils/state-functions.sh`](../utils/state-functions.sh), especialmente `state_get`
- El namespace y acceso a Kubernetes configurados durante el setup
- El Container Registry creado durante el aprovisionamiento
- El manifest de Kubernetes usado por `deploy.sh`

En otras palabras: **estos scripts no son totalmente autónomos**.  
Asumen que el entorno ya fue preparado por el flujo principal de infraestructura.

---

## Prerrequisitos

Antes de ejecutar `build.sh` o `deploy.sh`, verifica lo siguiente:

1. Haber cargado el entorno:
   ```bash
   source ../env.sh
   ```

2. Haber completado el setup del entorno al menos una vez:
   ```bash
   source ../setup.sh
   ```

3. Tener acceso funcional a:
   - Docker
   - Maven
   - `kubectl`
   - OCI CLI
   - El registry de OCIR
   - El clúster OKE

4. Estar ubicado en esta carpeta o ejecutar los scripts con su ruta correcta:
   ```bash
   cd infraestructura/scripts/deploy
   ```

---

## Uso rápido

```bash
cd infraestructura/scripts/deploy

source ../env.sh
./build.sh
./deploy.sh
```

---

## Flujo de trabajo

```text
Cambio en código
    │
    ├── build.sh
    │     ├── Compila la aplicación con Maven
    │     ├── Construye la imagen Docker
    │     └── Publica la imagen en OCIR
    │
    └── deploy.sh
          ├── Toma un manifest plantilla
          ├── Sustituye placeholders con valores reales del entorno
          ├── Genera un YAML con timestamp
          └── Ejecuta kubectl apply en el namespace mtdrworkshop
```

---

## Scripts

---

### [`build.sh`](./build.sh)

**Propósito:** construir la versión desplegable de la aplicación y publicarla en el registry.

### ¿Qué hace?

1. Define el nombre base de la imagen:
   - `todolistapp-springboot`
   - versión `0.1`

2. Obtiene `DOCKER_REGISTRY`:
   - primero desde el entorno actual
   - si no existe, intenta recuperarlo con `state_get DOCKER_REGISTRY`

3. Construye la referencia completa de la imagen:
   ```bash
   ${DOCKER_REGISTRY}/todolistapp-springboot:0.1
   ```

4. Ejecuta el empaquetado Maven:
   ```bash
   mvn clean package spring-boot:repackage
   ```

5. Construye la imagen Docker:
   ```bash
   docker build -f Dockerfile -t $IMAGE .
   ```

6. Publica la imagen en el registry:
   ```bash
   docker push $IMAGE
   ```

7. Si el push fue exitoso, elimina la imagen local para ahorrar espacio:
   ```bash
   docker rmi "$IMAGE"
   ```

### Resultado esperado

- Un artefacto Spring Boot compilado
- Una imagen Docker publicada en OCIR
- La imagen local removida opcionalmente si el push fue exitoso

### Cuándo usarlo

- Cuando cambió el backend
- Cuando cambió el frontend empaquetado dentro de la app
- Cuando cambió el `Dockerfile`
- Antes de ejecutar `deploy.sh` si quieres desplegar una nueva imagen

---

### [`deploy.sh`](./deploy.sh)

**Propósito:** desplegar la aplicación en Kubernetes usando un manifest plantilla con placeholders.

### ¿Qué hace?

1. Valida o recupera estas variables:
   - `DOCKER_REGISTRY`
   - `TODO_PDB_NAME`
   - `OCI_REGION`
   - `UI_USERNAME`

2. Crea una copia del manifest con timestamp:
   ```bash
   todolistapp-springboot-YYYY-MM-DD_HH:MM:SS.yaml
   ```

3. Reemplaza placeholders del template con `sed`:
   - `%DOCKER_REGISTRY%`
   - `%TODO_PDB_NAME%`
   - `%OCI_REGION%`
   - `%UI_USERNAME%`

4. Aplica el manifest al namespace:
   ```bash
   kubectl apply -f <archivo-generado> -n mtdrworkshop
   ```

5. Si recibe cualquier argumento, usa inyección de Istio:
   ```bash
   istioctl kube-inject -f <archivo-generado> | kubectl apply ...
   ```

### Resultado esperado

- Un archivo YAML final generado con timestamp
- Un `Deployment` y/o `Service` actualizados en Kubernetes
- La app desplegada en el namespace `mtdrworkshop`

### Cuándo usarlo

- Después de `build.sh`
- Cuando solo cambió la configuración de despliegue
- Cuando quieres redesplegar la misma imagen
- Cuando quieres probar el manifest con o sin Istio

---

## 🧩 Relación con otros scripts

### [`../utils/java-builds.sh`](../utils/java-builds.sh)

Este script cumple una función parecida a `build.sh`, pero dentro del
**setup automatizado** del entorno.  
La diferencia es:

- `../utils/java-builds.sh` se ejecuta como parte del aprovisionamiento total
- `./build.sh` está pensado para ejecución manual y repetida durante desarrollo

### [`../env.sh`](../env.sh)

Debe cargarse con `source` antes de usar esta carpeta.  
Sin eso, funciones como `state_get` no estarán disponibles en el shell actual.

### [`../utils/oke-setup.sh`](../utils/oke-setup.sh)

Si `kubectl` no puede acceder al clúster o al namespace esperado,
el problema normalmente está relacionado con la configuración inicial de OKE,
no con `deploy.sh`.

### [`../../kubernetes/README.md`](../../kubernetes/README.md)

Ese README debe documentar el manifest plantilla consumido por `deploy.sh`,
sus placeholders y la convención para los YAML generados.

---

## 🛠️ Variables utilizadas

| Variable | Usada por | Descripción |
|---|---|---|
| `DOCKER_REGISTRY` | `build.sh`, `deploy.sh` | Registry de OCI donde vive la imagen |
| `TODO_PDB_NAME` | `deploy.sh` | Nombre de la base de datos/pdb usado en el manifest |
| `OCI_REGION` | `deploy.sh` | Región OCI usada en configuración del despliegue |
| `UI_USERNAME` | `deploy.sh` | Usuario configurado para la aplicación |
| `IMAGE_NAME` | `build.sh` | Nombre lógico de la imagen |
| `IMAGE_VERSION` | `build.sh` | Tag actual de la imagen |

---

## 📦 Archivos externos relevantes

Durante la ejecución, estos scripts dependen o interactúan con:

- [`./build.sh`](./build.sh)
- [`./deploy.sh`](./deploy.sh)
- `Dockerfile`
- El manifest plantilla de Kubernetes consumido por `deploy.sh`
- El estado generado por `../utils/state-functions.sh`

Si cambias la ubicación del manifest de Kubernetes, recuerda actualizar
la ruta dentro de `deploy.sh`.

---

## 🧪 Verificación posterior al despliegue

Después de correr `deploy.sh`, es recomendable validar:

```bash
kubectl get pods -n mtdrworkshop
kubectl get services -n mtdrworkshop
kubectl get deployments -n mtdrworkshop
```

Si ya cargaste `../env.sh`, también puedes usar los aliases definidos allí.
