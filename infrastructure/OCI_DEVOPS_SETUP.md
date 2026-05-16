# Configuración de OCI DevOps CI/CD para Build & Push

## 1. Crear Secretos en OCI Vault

### Paso 1: Acceder a OCI Vault
1. Ve a **OCI Console** → **Security** → **Vault**
2. Selecciona o crea un Vault en tu compartment
3. Click en **Secrets**

### Paso 2: Crear los 4 Secretos Necesarios

#### a) OCIR_REGION
- **Name:** `ocir-region`
- **Description:** Región de OCIR (ej: us-ashburn-1, sa-saopaulo-1)
- **Secret Contents:** `us-ashburn-1` (o tu región)
- **Encryption Key:** Selecciona tu Master Key

#### b) OCIR_NAMESPACE
- **Name:** `ocir-namespace`
- **Description:** Namespace de OCIR desde tu tenancy
- **Secret Contents:** `lkn5rqq3zxyz` (encontrar en OCI Console → Registry Settings)
- **Encryption Key:** Misma que arriba

#### c) OCIR_USERNAME
- **Name:** `ocir-username`
- **Description:** Username para login en OCIR
- **Secret Contents:** `tu-tenancy-name/tu-email@domain.com` o username simple
- **Encryption Key:** Misma que arriba

#### d) OCIR_TOKEN (⚠️ SENSIBLE)
- **Name:** `ocir-token`
- **Description:** Auth Token generado en OCI Profile
- **Secret Contents:** Tu token completo (generado en My Profile → Auth Tokens)
- **Encryption Key:** Misma que arriba

### Paso 3: Obtener OCIDs de los Secretos
Después de crear cada secreto, copia su **OCID** (verlo en los detalles del secreto):
```
ocid1.vaultsecret.oc1.region.xxxxxxxxxxxxx
```

## 2. Configurar Políticas IAM

El usuario/grupo de DevOps Build necesita permisos para leer los secretos.

### Crear una Policy:
1. Ve a **Identity & Security** → **Policies**
2. Click **Create Policy**
3. Agrega estas reglas:

```
allow group DevOpsEngineers to use secrets in compartment CompartmentName
allow group DevOpsEngineers to read secret-family in compartment CompartmentName
allow group DevOpsEngineers to manage devops-connection in compartment CompartmentName
allow group DevOpsEngineers to manage devops-pipelines in compartment CompartmentName
```

Si usas una Service Account (recomendado para CI/CD):
```
allow service devops to read secret-family in compartment CompartmentName
```

## 3. Configurar OCI DevOps Pipeline

### Opción A: Con OCI Terraform (Recomendado)

```hcl
# En infrastructure/terraform/devops_pipeline.tf

resource "oci_devops_project" "forgetask_project" {
  display_name           = "forgetask-ci-cd"
  compartment_id         = var.compartment_id
  notification_config {
    topic_id = oci_ons_notification_topic.devops_topic.id
  }
}

resource "oci_devops_build_pipeline" "forgetask_build" {
  project_id = oci_devops_project.forgetask_project.id
  display_name = "forgetask-build-and-push"
  
  build_pipeline_parameters {
    items {
      default_value = "main"
      description   = "Git branch"
      name          = "branch"
    }
  }
}

resource "oci_devops_build_pipeline_stage" "build_stage" {
  build_pipeline_id = oci_devops_build_pipeline.forgetask_build.id
  build_pipeline_stage_type = "BUILD"
  
  display_name = "Build Images"
  
  build_pipeline_stage_predecessor_collection {
    items {
      id = oci_devops_build_pipeline.forgetask_build.id
    }
  }
  
  build_source_collection {
    items {
      branch           = "main"
      connection_type  = "DEVOPS_CODE_REPOSITORY"
      repository_id    = oci_devops_repository.repo.id
    }
  }
}
```

### Opción B: Manualmente en OCI Console

1. **Crear DevOps Project**
   - **Name:** `forgetask-cicd`
   - **Compartment:** Tu compartment

2. **Crear Repository** (opcional, sino integra con GitHub/GitLab)
   - Upload tu código
   - O configura webhook de GitHub

3. **Crear Build Pipeline**
   - **Name:** `build-and-push-to-ocir`
   - **Add Build Stage:**
     - **Build Spec File Path:** `build_spec_cicd.yaml`
     - **Primary Code Repository:** Tu repo (GitHub/DevOps Repo)
     - **Build Runner:** Linux (VM o OKE)

4. **Configurar Secrets en el Stage**
   - Click en Build Stage → **Edit**
   - En "Build Stage Settings":
     - Vault Secrets:
       - `OCIR_REGION` → Seleccionar secret
       - `OCIR_NAMESPACE` → Seleccionar secret
       - `OCIR_USERNAME` → Seleccionar secret
       - `OCIR_TOKEN` → Seleccionar secret

## 4. Configurar Trigger (Opcional)

Para ejecutar automáticamente:

1. En el Build Pipeline → **Add Trigger**
2. **Trigger Type:** Push (on code commit)
3. **Repository:** Tu repo
4. **Branch:** main (u otra rama)

## 5. Ejecutar Manualmente la Primera Vez

```bash
# En OCI Console, dentro del Build Pipeline
# Click "Start Manual Run"
# Opcional: Sobrescribir variables si necesitas
# Click "Start Run"
```

## Variables del Build Spec

Si necesitas agregar más variables edita `build_spec_cicd.yaml`:

```yaml
env:
  variables:
    MY_VAR: "value"  # Variable estática
  vaultVariables:
    SECRET_VAR: "ocid1.vaultsecret.oc1...."  # Referencia a secreto
```

## Monitoreo

- **Build Logs:** DevOps Console → Build History → Select Run → View Logs
- **Artifact Registry:** Verifica imágenes en Container Registry
- **Runtime:** Cada build toma ~10-15 minutos normalmente

## Troubleshooting

### Error: "Secret not found"
→ Verifica que el OCID del secreto sea correcto

### Error: "Access denied"
→ Revisa las políticas IAM, el usuario debe tener permisos `read secret-family`

### Docker login falla
→ Verifica que OCIR_TOKEN sea válido (no expirado). Genera uno nuevo en My Profile

### Build Pipeline no inicia
→ Revisa que el `build_spec_cicd.yaml` esté en la raíz del repo
