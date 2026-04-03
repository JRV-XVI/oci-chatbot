#!/bin/bash
#
# Punto de entrada del aprovisionamiento del entorno MTDR en OCI.
# Verifica precondiciones y delega la orquestacion a utils/main-setup.sh.
# Es idempotente: si el setup ya fue completado, no vuelve a ejecutarlo.
#
# Usage: source setup.sh
# Usage incorrecto: ./setup.sh
#
# Globals requeridos:
#   MTDRWORKSHOP_LOCATION
#   MTDRWORKSHOP_STATE_HOME
#   MTDRWORKSHOP_LOG
#
# Copyright (c) 2022 Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.


#Make sure this is run via source or .
# Debe ejecutarse con source para reutilizar estado y variables del shell actual.
if ! (return 0 2>/dev/null); then
  echo "ERROR: Usage 'source setup.sh'"
  exit
fi

if state_done SETUP; then
  echo "The setup has been completed"
  return
fi

SETUP_SCRIPT="$MTDRWORKSHOP_LOCATION/utils/main-setup.sh"

# Se valida si el orquestador ya esta corriendo para evitar setups duplicados.
# TODO(devops@local): usar pgrep -f con patron mas estricto para evitar falsos
# positivos en hosts con multiples procesos similares.
if ps -ef | grep "$SETUP_SCRIPT" | grep -v grep; then
  echo "The $SETUP_SCRIPT is already running.  If you want to restart it then kill it and then rerun."
else
  $SETUP_SCRIPT 2>&1 | tee -ai $MTDRWORKSHOP_LOG/main-setup.log
fi