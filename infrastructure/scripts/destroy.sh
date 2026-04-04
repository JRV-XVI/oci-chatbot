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

#-----Colours-----#
greenColour="\e[0;32m\033[1m"
redColour="\e[0;31m\033[1m"
yellowColour="\e[0;33m\033[1m"
endColour="\033[0m\e[0m"

if ! (return 0 2>/dev/null); then
  echo "${redColour}[ERROR]${endColour} Usage 'source destroy.sh'"
  exit
fi

# main-destroy.sh coordina la limpieza de recursos OCI y terraform destroy.
# TODO(devops@local): revisar sincronizacion entre scripts de limpieza en
# background y terraform destroy para reducir condiciones de carrera.
$MTDRWORKSHOP_LOCATION/utils/main-destroy.sh

# Archiva el estado local con timestamp para auditoria y debugging posterior.
deleteDir=$MTDRWORKSHOP_STATE_HOME/toDelete_$(date +%Y%m%d_%H%M%S)
mkdir -p $deleteDir
mv $MTDRWORKSHOP_STATE_HOME/state $deleteDir 2>/dev/null || true
mv $MTDRWORKSHOP_STATE_HOME/tls $deleteDir 2>/dev/null || true
mv $MTDRWORKSHOP_STATE_HOME/wallet $deleteDir 2>/dev/null || true
mv $MTDRWORKSHOP_STATE_HOME/log $deleteDir 2>/dev/null || true

echo "${greenColour}[+]${endColour} Recommendations:"
echo '  ${yellowColour}1.${endColour} Manually rename compartment'
echo '  ${yellowColour}2.${endColour} Manually check/remove OKE cluster from compartment'
echo '  ${yellowColour}3.${endColour} Manually check/remove Auth Tokens'
echo '  ${yellowColour}4.${endColour} Manually check/remove Buckets from compartment'
echo '  ${yellowColour}5.${endColour} Manually check/remove Compute Instances from compartment'
echo '  ${yellowColour}6.${endColour} Manually check/remove ATP DB from compartment'
echo '  ${yellowColour}7.${endColour} Try remove compartment elements through Tenancy Explorer'
