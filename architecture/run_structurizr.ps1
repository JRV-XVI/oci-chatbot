#!/usr/bin/env pwsh
# Genera workspace.json desde workspace.dsl y arranca Structurizr Lite

$repoRoot = (Get-Location).Path
$archDir  = Join-Path $repoRoot "architecture"
$dslPath  = Join-Path $archDir "workspace.dsl"

if (-not (Test-Path $dslPath)) {
    Write-Error "No se encontro $dslPath. Ejecuta este script desde la raiz del repo."
    exit 1
}

# Detener contenedor anterior si existe
$existing = docker ps -q --filter "name=structurizr-lite"
if ($existing) {
    Write-Host "Deteniendo contenedor anterior..."
    docker stop structurizr-lite | Out-Null
}

Write-Host "Iniciando Structurizr Lite en http://localhost:8080 ..."
docker run --rm -d `
    -p 8080:8080 `
    -v "${archDir}:/usr/local/structurizr" `
    --name structurizr-lite `
    structurizr/lite

if ($LASTEXITCODE -ne 0) {
    Write-Error "No se pudo iniciar Structurizr Lite."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Listo. Abre http://localhost:8080 en el navegador."
Write-Host "El archivo workspace.json se generara automaticamente en architecture/"
Write-Host ""
Write-Host "Para detener el contenedor ejecuta:  docker stop structurizr-lite"
