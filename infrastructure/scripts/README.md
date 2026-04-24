# Scripts de Orquestacion

Este directorio centraliza la automatizacion operativa del entorno en OCI.

El modelo de ejecucion se basa en hitos persistidos en disco (state files), para reanudar setup/destroy sin reiniciar todo desde cero.

## Alcance

Esta documentacion cubre todos los archivos en:

- [env.sh](env.sh)
- [setup.sh](setup.sh)
- [destroy.sh](destroy.sh)
- [deploy](deploy)
- [utils](utils)

Para detalle del flujo de despliegue de app (build/deploy de manifests), revisar [deploy/README.md](deploy/README.md).

## Mapa de carpetas

```text
infrastructure/scripts/
├── env.sh
├── setup.sh
├── destroy.sh
├── deploy/
│   ├── build.sh
│   ├── deploy.sh
│   └── README.md
└── utils/
    ├── db-setup.sh
    ├── java-builds.sh
    ├── kube_token_cache.sh
    ├── lb-destroy.sh
    ├── main-destroy.sh
    ├── main-setup.sh
    ├── oke-setup.sh
    ├── os-destroy.sh
    ├── repo-destroy.sh
    ├── state-functions.sh
    ├── terraform.sh
    └── python/
        ├── generate-unique-key.py
        └── process-cluster-ocid-json.py
```

## Flujo real actual

```text
source env.sh
  -> carga estado, funciones state_*, aliases y PATH

source setup.sh
  -> ejecuta utils/main-setup.sh
     -> lanza en background: java-builds.sh, terraform.sh, oke-setup.sh
     -> NO lanza db-setup.sh (bloque comentado)
     -> crea secretos (wallet, app, UI) y marca SETUP_VERIFIED

source destroy.sh
  -> ejecuta utils/main-destroy.sh
     -> lanza en background: os-destroy.sh, repo-destroy.sh, lb-destroy.sh
     -> terraform destroy -auto-approve
```

## Hitos y estado

El estado vive en `$MTDRWORKSHOP_STATE_HOME/state` y se maneja desde [utils/state-functions.sh](utils/state-functions.sh).

Funciones clave:

- `state_done HITO`: verifica existencia de archivo.
- `state_set HITO valor`: guarda valor del hito.
- `state_set_done HITO`: marca hito sin payload.
- `state_get HITO`: lee valor del hito.
- `state_reset HITO`: elimina hito.

## Scripts raiz

### [env.sh](env.sh)

Rol:

- Debe ejecutarse con `source`.
- Inicializa contexto para setup/destroy/deploy.

Que hace:

1. Valida ejecucion con `source`.
2. Define helper `sed_i` (wrapper portable para sed in-place).
3. Configura `JAVA_HOME` si la JVM actual no es version 22.
4. Exporta `MTDRWORKSHOP_LOCATION`, `MTDRWORKSHOP_STATE_HOME`, `MTDRWORKSHOP_LOG`.
5. Crea carpeta de logs.
6. Carga [utils/state-functions.sh](utils/state-functions.sh).
7. Define aliases de kubectl y agrega [utils](utils) al PATH.

### [setup.sh](setup.sh)

Rol:

- Wrapper de entrada para aprovisionamiento.

Que hace:

1. Valida ejecucion con `source`.
2. Si detecta proceso activo de [utils/main-setup.sh](utils/main-setup.sh), evita duplicado.
3. Si no, ejecuta [utils/main-setup.sh](utils/main-setup.sh) y loguea en `main-setup.log`.

Nota actual importante:

- El guard clause revisa hito `SETUP`, pero el flujo actual marca `SETUP_VERIFIED`.
- En la practica, `setup.sh` puede volver a invocar `main-setup.sh`, que sale rapido cuando `SETUP_VERIFIED` ya existe.

### [destroy.sh](destroy.sh)

Rol:

- Wrapper de entrada para teardown.

Que hace:

1. Valida ejecucion con `source`.
2. Ejecuta [utils/main-destroy.sh](utils/main-destroy.sh).
3. Archiva `state`, `tls`, `wallet`, `log` en `toDelete_YYYYMMDD_HHMMSS`.
4. Imprime checklist de validacion manual en OCI.

## Carpeta deploy

### [deploy/build.sh](deploy/build.sh)

- Construye y publica imagen backend `forgetask:0.1` en `DOCKER_REGISTRY`.
- El bloque de frontend existe pero esta comentado.

### [deploy/deploy.sh](deploy/deploy.sh)

- Renderiza templates backend/frontend en [../kubernetes/generated](../kubernetes/generated).
- Reemplaza placeholders y aplica con kubectl al namespace `mtdrworkshop`.
- Modo istio depende de `DEPLOY_MODE=istio` en entorno.

### [deploy/README.md](deploy/README.md)

- Documentacion detallada y actualizada del subflujo de build/deploy.

## Utils activos en el setup/destroy principal

### [utils/main-setup.sh](utils/main-setup.sh)

Rol:

- Orquestador principal de provisioning.

Que hace en estado actual:

1. Determina `RUN_TYPE`:
   - Green Button (home tipo `/home/ll..._us`) o modo normal.
   - Si `BYO_K8S` esta definido, marca hitos para saltar parte de OKE.
2. Pide y valida `USER_OCID` (si aplica), resuelve `USER_NAME`.
3. Genera `MTDR_KEY` con [utils/python/generate-unique-key.py](utils/python/generate-unique-key.py).
4. Resuelve `RUN_NAME`, `TENANCY_OCID`, `REGION`, `COMPARTMENT_OCID`.
5. Lanza en background:
   - [utils/java-builds.sh](utils/java-builds.sh)
   - [utils/terraform.sh](utils/terraform.sh)
   - [utils/oke-setup.sh](utils/oke-setup.sh)
6. Realiza login Docker y guarda `DOCKER_REGISTRY` y token.
7. Solicita credenciales UI (username/password).
8. Espera `PROVISIONING` y `OKE_NAMESPACE`.
9. Crea secreto `db-wallet-secret` desde [../../forgetask/wallet](../../forgetask/wallet).
10. Crea secreto `forgetask-app-secrets` (DB user/pass + Telegram variables).
11. Espera `OKE_SETUP`.
12. Crea secreto `frontendadmin` con password de UI.
13. Verifica hitos finales (`JAVA_BUILDS`, `OKE_SETUP`, `PROVISIONING`) y marca `SETUP_VERIFIED`.

Notas actuales:

- El lanzamiento de [utils/db-setup.sh](utils/db-setup.sh) esta comentado.
- Varias secciones de ATP legacy permanecen comentadas.

### [utils/terraform.sh](utils/terraform.sh)

Rol:

- Ejecutar terraform con variables provenientes del sistema de hitos.

Que hace:

1. Exporta `TF_VAR_*` desde `state_get`.
2. Si `K8S_PROVISIONING` ya esta marcado, elimina `containerengine.tf` y `core.tf` antes de aplicar.
3. Genera `~/.terraformrc` para mirror local de plugins.
4. Ejecuta `terraform init` y `terraform apply -auto-approve` en [../terraform](../terraform).
5. Marca `K8S_PROVISIONING` y `PROVISIONING`.

### [utils/java-builds.sh](utils/java-builds.sh)

Rol:

- Script de compatibilidad para hito de builds.

Que hace hoy:

1. Espera hito `DOCKER_REGISTRY`.
2. Marca `JAVA_BUILDS`.

Nota:

- No realiza build/push real actualmente; la construccion se delega al flujo de [deploy/build.sh](deploy/build.sh).

### [utils/oke-setup.sh](utils/oke-setup.sh)

Rol:

- Preparar acceso kubectl al cluster OKE y namespace.

Que hace:

1. Genera cert TLS local en `scripts/tls` y marca `SSL`.
2. Espera `K8S_PROVISIONING`.
3. Obtiene `OKE_OCID` leyendo output terraform via [utils/python/process-cluster-ocid-json.py](utils/python/process-cluster-ocid-json.py).
4. Ejecuta `oci ce cluster create-kubeconfig`.
5. Configura credencial kubectl para usar [utils/kube_token_cache.sh](utils/kube_token_cache.sh).
6. Espera hasta 3 nodos `Ready` (si no esta `BYO_K8S`).
7. Crea namespace `mtdrworkshop`.
8. Crea secreto docker registry `ocir-secret`.
9. Marca `OKE_SETUP`.

### [utils/main-destroy.sh](utils/main-destroy.sh)

Rol:

- Orquestar teardown completo.

Que hace:

1. Si `RUN_TYPE=3` (LiveLabs), sale sin teardown.
2. Lanza en background:
   - [utils/os-destroy.sh](utils/os-destroy.sh)
   - [utils/repo-destroy.sh](utils/repo-destroy.sh)
   - [utils/lb-destroy.sh](utils/lb-destroy.sh)
3. Ejecuta `terraform init` + `terraform destroy -auto-approve` en [../terraform](../terraform).
4. Si `BYO_K8S`, elimina namespace `mtdrworkshop`.

## Utils auxiliares y legacy

### [utils/db-setup.sh](utils/db-setup.sh)

Estado:

- Script legacy completo para ATP/wallet/usuario SQL.
- No es invocado por el flujo actual de [utils/main-setup.sh](utils/main-setup.sh).

Que realiza si se ejecuta manualmente:

- Verifica bucket, espera `MTDR_DB_OCID`, genera wallet ATP, sube `cwallet.sso`, crea PAR URL, crea secreto `db-wallet-secret`, espera password DB, conecta con sqlplus y crea usuario/tabla `TODOUSER.todoitem`.

### [utils/kube_token_cache.sh](utils/kube_token_cache.sh)

- Cachea token OKE en `~/.kube/TOKEN` por 240s.
- Si expira, regenera token con OCI CLI usando args `--cluster-id` y `--region`.

### [utils/os-destroy.sh](utils/os-destroy.sh)

- Borra preauth requests del bucket `${RUN_NAME}-${MTDR_KEY}`.
- Borra objetos `wallet.zip` y `cwallet.sso` si existen hitos asociados.
- No elimina bucket (bloque comentado).

### [utils/repo-destroy.sh](utils/repo-destroy.sh)

- Actualmente no-op: toda la logica de borrado de imagenes/repos esta comentada.

### [utils/lb-destroy.sh](utils/lb-destroy.sh)

- Lista y elimina todos los load balancers del compartment actual.

## Utilidades Python

### [utils/python/generate-unique-key.py](utils/python/generate-unique-key.py)

- Genera clave aleatoria lowercase+digitos de longitud 5.
- Se usa para `MTDR_KEY`.

### [utils/python/process-cluster-ocid-json.py](utils/python/process-cluster-ocid-json.py)

- Lee JSON por stdin y extrae `lab_oke_cluster_id.value`.
- Devuelve string de error si la estructura no coincide.

## Recomendaciones para developers

1. Iniciar siempre con [env.sh](env.sh) usando `source`.
2. Usar [setup.sh](setup.sh) para provisioning y [destroy.sh](destroy.sh) para teardown.
3. Para despliegue iterativo de app, usar flujo documentado en [deploy/README.md](deploy/README.md).
4. Revisar `state/` y logs antes de relanzar procesos largos.
5. Tratar [utils/db-setup.sh](utils/db-setup.sh) y [utils/repo-destroy.sh](utils/repo-destroy.sh) como legacy hasta su reintegracion al flujo principal.