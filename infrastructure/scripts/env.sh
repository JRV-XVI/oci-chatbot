#!/bin/bash
#
# Punto de entrada para inicializar el entorno MTDR en la sesion actual.
# Exporta variables, aliases y funciones compartidas por setup y destroy.
# Debe cargarse con source para que los cambios persistan en el shell activo.
#
# Usage: source env.sh
# Usage incorrecto: ./env.sh
#
# Globals modificados:
#   MTDRWORKSHOP_LOCATION
#   MTDRWORKSHOP_STATE_HOME
#   MTDRWORKSHOP_LOG
#   JAVA_HOME
#   PATH
#
# Copyright (c) 2022 Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

#Colours
greenColour="\e[0;32m\033[1m"
endColour="\033[0m\e[0m"
redColour="\e[0;31m\033[1m"
blueColour="\e[0;34m\033[1m"
yellowColour="\e[0;33m\033[1m"
purpleColour="\e[0;35m\033[1m"
grayColour="\e[0;37m\033[1m"

# Make sure this is run via source or .
# Ejecutar con ./env.sh crea un subshell y las exportaciones se pierden.
if ! (return 0 2>/dev/null); then
  echo -e "${redColour}[env.sh][x]${endColour} Usage 'source env.sh'"
  exit
fi

# POSIX compliant find and replace
#######################################
# Reemplazo in-place compatible con Linux/macOS.
# Globals:
#   (none)
# Arguments:
#   $1 - Expresion sed (string)
#   $2 - Archivo destino (path)
# Outputs:
#   Sobrescribe el archivo con el contenido transformado.
# Returns:
#   0 si la operacion finaliza correctamente.
#######################################
function sed_i() {
  local OP="$1"
  local FILE="$2"

  # Se usa archivo temporal porque sed -i varia entre GNU sed y BSD sed.
  sed -e "$OP" "$FILE" >"/tmp/$FILE"
  mv -- "/tmp/$FILE" "$FILE"
}

export -f sed_i

#######################################
# Configura JAVA_HOME para Linux o macOS.
# Globals:
#   JAVA_HOME
#   PATH
# Arguments:
#   (none)
# Outputs:
#   Exporta JAVA_HOME y antepone su binario en PATH.
# Returns:
#   0 si se configuro correctamente.
#######################################
function set_javahome() {
  if test -d ~/graalvm-community-openjdk-22.0.2+9.1/bin; then
    # Ruta esperada en Linux.
    export JAVA_HOME=~/graalvm-community-openjdk-22.0.2+9.1;
  else
    # Ruta esperada en macOS.
    export JAVA_HOME=~/graalvm-community-openjdk-22.0.2+9.1/Contents/Home
  fi
  export PATH=$JAVA_HOME/bin:$PATH
}

# Resuelve la ruta absoluta del directorio del script sin depender del cwd.
export MTDRWORKSHOP_LOCATION="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd $MTDRWORKSHOP_LOCATION
echo -e "${greenColour}[env.sh][+]${endColour} MTDRWORKSHOP_LOCATION: $MTDRWORKSHOP_LOCATION"



JAVA_TEST=$(java -version 2>&1)
if echo "$JAVA_TEST" | grep -q "22\."; then
  echo "JAVA Found: $JAVA_TEST"
else
  set_javahome
fi

# Define ubicacion de estado persistente para soportar reanudacion por hitos.
if test -d ~/mtdrworkshop-state; then
  export MTDRWORKSHOP_STATE_HOME=~/mtdrworkshop-state
else
  export MTDRWORKSHOP_STATE_HOME=$MTDRWORKSHOP_LOCATION
fi
echo "${greenColour}[+]${endColour} MTDRWORKSOP_STATE_HOME: $MTDRWORKSHOP_STATE_HOME"

# Crea carpeta de logs para setup/destroy y procesos en background.
export MTDRWORKSHOP_LOG=$MTDRWORKSHOP_STATE_HOME/log
mkdir -p $MTDRWORKSHOP_LOG

# Carga funciones de hitos (state_done/state_set/state_get/state_set_done).
source $MTDRWORKSHOP_LOCATION/utils/state-functions.sh

# SHORTCUT ALIASES AND UTILS...
alias k='kubectl'
alias kt='kubectl --insecure-skip-tls-verify'
alias pods='kubectl get po --all-namespaces'
alias services='kubectl get services --all-namespaces'
alias gateways='kubectl get gateways --all-namespaces'
alias secrets='kubectl get secrets --all-namespaces'
alias ingresssecret='kubectl get secrets --all-namespaces | grep istio-ingressgateway-certs'
alias virtualservices='kubectl get virtualservices --all-namespaces'
alias deployments='kubectl get deployments --all-namespaces'
alias mtdrworkshop='echo deployments... ; deployments|grep mtdrworkshop ; echo pods... ; pods|grep mtdrworkshop ; echo services... ; services | grep mtdrworkshop ; echo secrets... ; secrets|grep mtdrworkshop ; echo "other shortcut commands... most can take partial podname as argument, such as [logpod front] or [deletepod order]...  pods  services secrets deployments " ; ls $MTDRWORKSHOP_LOCATION/utils/'
alias sshpod1='kubectl exec -i -t $(kubectl get pod --namespace mtdrworkshop \
  --selector=app=forgetask --output jsonpath='{.items[0].metadata.name}') \
  -n mtdrworkshop -- /bin/bash'
# TODO(devops@local): validar que cada alias requerido exista cuando kubectl no
# este instalado para mejorar onboarding en equipos nuevos.
export PATH=$PATH:$MTDRWORKSHOP_LOCATION/utils/
