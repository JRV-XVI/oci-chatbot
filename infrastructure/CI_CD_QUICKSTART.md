# RESUMEN RÁPIDO: Configuración de CI/CD en OCI DevOps

## 📋 Checklist de Configuración

### 1️⃣ Crear 4 Secretos en OCI Vault

| Nombre | Valor | Tipo |
|--------|-------|------|
| `ocir-region` | `us-ashburn-1` (*tu región*) | Text |
| `ocir-namespace` | Ver en OCI Console → Registry Settings | Text |
| `ocir-username` | `tenancy-name/user@email.com` | Text |
| `ocir-token` | Token generado en My Profile → Auth Tokens | Secret |

**Cómo conseguir cada valor:**

- **ocir-region:** Mira la región de tu tenancy (top-right en OCI Console)
- **ocir-namespace:** Go to Registry Settings en OCI Console y busca "Namespace"
- **ocir-username:** Tu usuario OCI o formato especial para OCIR
- **ocir-token:** Crea uno en My Profile → Auth Tokens (¡no compartir!)

### 2️⃣ Crear IAM Policy

En **Identity & Security → Policies**, agregar:

```
allow group DevOpsEngineers to read secret-family in compartment <your-compartment>
allow group DevOpsEngineers to manage devops-pipelines in compartment <your-compartment>
```

O para Service Account:
```
allow service devops to read secret-family in compartment <your-compartment>
```

### 3️⃣ Crear OCI DevOps Project

1. Ve a **Developer Services → Projects**
2. Click **Create Project**
3. Name: `forgetask-ci-cd`

### 4️⃣ Crear Build Pipeline

1. En el Project → **Build Pipelines** → **Create Pipeline**
2. Name: `build-and-push`
3. Click **Create**
4. **Add Stage** → **Build Stage**
5. Configurar:
   - **Stage Name:** `Build and Push Images`
   - **Build Spec File Path:** `build_spec_cicd.yaml`
   - **Primary Code Repository:** Conectar tu repositorio (GitHub/DevOps)
   - **Build Runner:** Linux VM Shape (ej: `VM.Standard2.1`)

### 5️⃣ Agregar Vault Secrets al Build Stage

1. En **Build Stage** → **Edit**
2. Scroll a **Build Stage Settings**
3. Click **Add Secret**:
   - Variable Name: `OCIR_REGION` → Select Secret
   - Variable Name: `OCIR_NAMESPACE` → Select Secret
   - Variable Name: `OCIR_USERNAME` → Select Secret
   - Variable Name: `OCIR_TOKEN` → Select Secret

### 6️⃣ Opcional: Agregar Trigger

1. En Build Pipeline → **Triggers** → **Create trigger**
2. **Trigger Type:** Push
3. **Repository:** Tu repo
4. **Branch:** `main`
5. ✓ Auto-ejecutará con cada commit

### 7️⃣ Probar

1. Build Pipeline → **Start Manual Run**
2. Click **Start Run**
3. Ver Progress en Build History

## 📊 Flujo Completo

```
┌─────────────────┐
│  Commit a main  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  OCI DevOps Trigger     │
│  (opcional automático)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Build Pipeline         │
│  (build_spec_cicd.yaml) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  1. Clone repo          │
│  2. Obtener secretos    │
│  3. Docker login        │
│  4. Build images        │
│  5. Push a OCIR         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  ✓ Imágenes en OCIR     │
│  Ready para deploy      │
└─────────────────────────┘
```

## 🔗 Archivos Generados

- **`build_spec_cicd.yaml`** - Full spec con validaciones
- **`build_spec_simple.yaml`** - Versión simplificada
- **`OCI_DEVOPS_SETUP.md`** - Documentación detallada
- **`get-vault-secrets.sh`** - Script para obtener OCIDs

## 🛠️ Comandos Útiles (OCI CLI)

```bash
# Listar secretos en compartment
oci vault secret list --compartment-id <compartment-id> --all

# Crear secreto desde CLI
oci vault secret create-base64 \
  --compartment-id <compartment-id> \
  --vault-id <vault-id> \
  --secret-name ocir-token \
  --secret-content-type BASE64 \
  --secret-content $(cat <<< "tu-token" | base64)

# Ver detalles de un secreto
oci vault secret get --secret-id <secret-ocid>

# Ver logs de un build
oci devops build-pipeline-stage list-build-pipeline-stages \
  --build-pipeline-id <pipeline-id>
```

## ⚠️ Consideraciones de Seguridad

- **NUNCA** commitees el OCIR_TOKEN en el repo
- Usa OCI Vault para todos los secretos (no variables planas)
- Limita permisos de lectura a solo quien necesita
- Rota tokens regularmente (30-90 días)
- Usa Service Accounts en lugar de cuentas personales si es posible

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| Build falla con "Secret not found" | Verifica OCIDs en build_spec_cicd.yaml |
| Docker login failed | El OCIR_TOKEN expiró, genera uno nuevo |
| No tiene permisos | Agrega IAM Policy al usuario/grupo |
| Build nunca inicia | Verifica que build_spec esté en la raíz del repo |
| Imágenes no aparecen en Registry | Revisa logs en Build History |

---

**Próximo paso:** Actualiza los OCIDs en `build_spec_cicd.yaml` y ejecuta el primer build manualmente.
