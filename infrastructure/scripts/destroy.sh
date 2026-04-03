#!/bin/bash
#
# Punto de entrada del teardown del entorno MTDR en OCI.
# Delega la destruccion principal a utils/main-destroy.sh y luego archiva
# artefactos locales de estado para trazabilidad.
#
# Usage: source destroy.sh
# Usage incorrecto: ./destroy.sh
#
# Globals requeridos:
#   MTDRWORKSHOP_LOCATION
#   MTDRWORKSHOP_STATE_HOME
#   MTDRWORKSHOP_LOG
#
# Copyright (c) 2022 Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

# Make sure this is run via source or .
# Debe ejecutarse con source para conservar contexto de entorno y estado.

if ! (return 0 2>/dev/null); then
  echo "ERROR: Usage 'source destroy.sh'"
  exit
fi

# main-destroy.sh coordina la limpieza de recursos OCI y terraform destroy.
# TODO(devops@local): revisar sincronizacion entre scripts de limpieza en
# background y terraform destroy para reducir condiciones de carrera.
$MTDRWORKSHOP_LOCATION/utils/main-destroy.sh

# Archiva el estado local con timestamp para auditoria y debugging posterior.
deleteDir=toDelete_$(date +%Y%m%d_%H%M%S)
mkdir $deleteDir
mv state $deleteDir
mv tls $deleteDir
mv wallet $deleteDir
mv log $deleteDir

echo 'Recommendations:'
echo '  1. Manually rename compartment'
echo '  2. Manually check/remove OKE cluster from compartment'
echo '  3. Manually check/remove Auth Tokens'
echo '  4. Manually check/remove Buckets from compartment'
echo '  5. Manually check/remove Compute Instances from compartment'
echo '  6. Manually check/remove ATP DB from compartment'
echo '  7. Try remove compartment elements through Tenancy Explorer'
