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

# Delete LBs
echo -e "${yellowColour}[lb-destroy.sh][+]${endColour} Deleting Load Balancers"
LBIDS=`oci lb load-balancer list --compartment-id "$(state_get COMPARTMENT_OCID)" --query "join(' ',data[*].id)" --raw-output`
for lb in $LBIDS; do
  oci lb load-balancer delete --load-balancer-id "$lb" --force
done
echo -e "${greenColour}[lb-destroy.sh][+]${endColour} Finished Deleting Load Balancers"