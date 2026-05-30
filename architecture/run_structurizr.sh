#!/usr/bin/env bash
# Genera workspace.json desde workspace.dsl y arranca Structurizr Lite

REPO_ROOT="$(pwd)"
ARCH_DIR="$REPO_ROOT/architecture"
DSL_PATH="$ARCH_DIR/workspace.dsl"

if [ ! -f "$DSL_PATH" ]; then
  echo "ERROR: No se encontro $DSL_PATH. Ejecuta desde la raiz del repo." >&2
  exit 1
fi

# Detener contenedor anterior si existe
if docker ps -q --filter "name=structurizr-lite" | grep -q .; then
  echo "Deteniendo contenedor anterior..."
  docker stop structurizr-lite > /dev/null
fi

echo "Iniciando Structurizr Lite en http://localhost:8080 ..."
docker run --rm -d \
  -p 8080:8080 \
  -v "$ARCH_DIR:/usr/local/structurizr" \
  --name structurizr-lite \
  structurizr/lite

if [ $? -ne 0 ]; then
  echo "ERROR: No se pudo iniciar Structurizr Lite." >&2
  exit 2
fi

echo ""
echo "Listo. Abre http://localhost:8080 en el navegador."
echo "El archivo workspace.json se generara automaticamente en architecture/"
echo ""
echo "Para detener el contenedor ejecuta:  docker stop structurizr-lite"
