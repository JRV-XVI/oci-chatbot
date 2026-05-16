#!/bin/bash
# get-vault-secrets.sh
# Script para obtener los OCID de los secretos en OCI Vault

set -e

COMPARTMENT_NAME="${1:-}"

if [ -z "$COMPARTMENT_NAME" ]; then
  echo "Uso: $0 <compartment-name>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 forgetask-prod"
  echo ""
  echo "Este script necesita:"
  echo "  • OCI CLI instalado y configurado"
  echo "  • Permisos para listar secretos"
  exit 1
fi

# Obtener compartment ID
echo "[*] Buscando compartment: $COMPARTMENT_NAME"
COMPARTMENT_ID=$(oci iam compartment list --all --raw-output --query "data[?name=='$COMPARTMENT_NAME'].id | [0]" 2>/dev/null)

if [ -z "$COMPARTMENT_ID" ]; then
  echo "[!] Error: Compartment no encontrado"
  exit 1
fi

echo "[+] Compartment ID: $COMPARTMENT_ID"
echo ""

# Obtener todos los Vaults en el compartment
echo "[*] Buscando Vaults en el compartment..."
VAULT_IDS=$(oci kms management vault list --compartment-id "$COMPARTMENT_ID" --all --raw-output --query "data[].id" 2>/dev/null)

if [ -z "$VAULT_IDS" ]; then
  echo "[!] No se encontraron Vaults. Crea uno primero en OCI Console > Security > Vault"
  exit 1
fi

echo "[+] Vaults encontrados:"
for VAULT_ID in $VAULT_IDS; do
  VAULT_NAME=$(oci kms management vault get --vault-id "$VAULT_ID" --raw-output --query "data.display_name" 2>/dev/null)
  echo "   • $VAULT_NAME ($VAULT_ID)"
done

echo ""
echo "[*] Buscando secretos en los Vaults..."

# Buscar secretos
oci vault secret list --compartment-id "$COMPARTMENT_ID" --all --raw-output --query "data[].[id, secret_name, description]" 2>/dev/null | while IFS=$'\t' read -r SECRET_ID NAME DESC; do
  if [ "$NAME" = "ocir-region" ] || [ "$NAME" = "ocir-namespace" ] || [ "$NAME" = "ocir-username" ] || [ "$NAME" = "ocir-token" ]; then
    echo ""
    echo "[+] Secreto encontrado:"
    echo "    Name: $NAME"
    echo "    OCID: $SECRET_ID"
    if [ -n "$DESC" ]; then
      echo "    Desc: $DESC"
    fi
  fi
done

echo ""
echo "========================================="
echo "Para usar en build_spec.yaml:"
echo "========================================="
echo ""
echo "env:"
echo "  vaultVariables:"
echo "    OCIR_REGION: \"<OCID-DEL-SECRETS>\"" 
echo "    OCIR_NAMESPACE: \"<OCID-DEL-SECRETS>\""
echo "    OCIR_USERNAME: \"<OCID-DEL-SECRETS>\""
echo "    OCIR_TOKEN: \"<OCID-DEL-SECRETS>\""
