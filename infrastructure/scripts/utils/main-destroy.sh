#!/bin/bash
# Copyright (c) 2022 Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

# Fail on error
set -e

#Colours
greenColour="\e[0;32m\033[1m"
endColour="\033[0m\e[0m"
redColour="\e[0;31m\033[1m"
blueColour="\e[0;34m\033[1m"
yellowColour="\e[0;33m\033[1m"
purpleColour="\e[0;35m\033[1m"
grayColour="\e[0;37m\033[1m"

# Switch to SSH Key auth for the oci cli (workaround to perm issue awaiting fix)
# source $MTDRWORKSHOP_LOCATION/utils/oci-cli-cs-key-auth.sh


# No destroy necessary for Live Labs
if test "$(state_get RUN_TYPE)" == "3"; then
  echo -e "${greenColour}[main-destroy.sh][+]${endColour} No teardown required for Live Labs"
  exit
fi


# Run the os-destroy.sh in the background
if ps -ef | grep "$MTDRWORKSHOP_LOCATION/utils/os-destroy.sh" | grep -v grep; then
  echo -e "${yellowColour}[main-destroy.sh][+]${endColour} $MTDRWORKSHOP_LOCATION/utils/os-destroy.sh is already running"
else
  echo -e "${greenColour}[main-destroy.sh][+]${endColour} Executing os-destroy.sh in the background"
  nohup $MTDRWORKSHOP_LOCATION/utils/os-destroy.sh &>> $MTDRWORKSHOP_LOG/os-destroy.log &
fi


# Run the repo-destroy.sh in the background
if ps -ef | grep "$MTDRWORKSHOP_LOCATION/utils/repo-destroy.sh" | grep -v grep; then
  echo -e "${yellowColour}[main-destroy.sh][+]${endColour} $MTDRWORKSHOP_LOCATION/utils/repo-destroy.sh is already running"
else
  echo -e "${greenColour}[main-destroy.sh][+]${endColour} Executing repo-destroy.sh in the background"
  nohup $MTDRWORKSHOP_LOCATION/utils/repo-destroy.sh &>> $MTDRWORKSHOP_LOG/repo-destroy.log &
fi


# Run the lb-destroy.sh in the background
if ps -ef | grep "$MTDRWORKSHOP_LOCATION/utils/lb-destroy.sh" | grep -v grep; then
  echo -e "${yellowColour}[main-destroy.sh][+]${endColour} $MTDRWORKSHOP_LOCATION/utils/lb-destroy.sh is already running"
else
  echo -e "${greenColour}[main-destroy.sh][+]${endColour} Executing lb-destroy.sh in the background"
  nohup $MTDRWORKSHOP_LOCATION/utils/lb-destroy.sh &>> $MTDRWORKSHOP_LOG/lb-destroy.log &
fi


# Terraform Destroy
echo -e "${greenColour}[main-destroy.sh][+]${endColour} Running terraform destroy"
cd $MTDRWORKSHOP_LOCATION/../terraform
export TF_VAR_ociTenancyOcid="$(state_get TENANCY_OCID)"
export TF_VAR_ociUserOcid="$(state_get USER_OCID)"
export TF_VAR_ociCompartmentOcid="$(state_get COMPARTMENT_OCID)"
export TF_VAR_ociRegionIdentifier="$(state_get REGION)"
export TF_VAR_runName="$(state_get RUN_NAME)"
export TF_VAR_mtdrDbName="$(state_get MTDR_DB_NAME)"
export TF_VAR_mtdrKey="$(state_get MTDR_KEY)"
terraform init
terraform destroy -auto-approve


# If BYO K8s then delete the mtdrworkshop namespace in k8s
if state_done BYO_K8S; then
  kubectl delete ns mtdrworkshop
fi
