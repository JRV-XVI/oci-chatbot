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

# Delete Object Store
echo -e "${yellowColour}[os-destroy.sh][+]${endColour} Deleting Object Store..."
# Per-auth

# ## delete object storage bucket
# oci os bucket delete --bucket-name "$(state_get RUN_NAME)"

PARIDS=`oci os preauth-request list --bucket-name "$(state_get RUN_NAME)-$(state_get MTDR_KEY)" --query "join(' ',data[*].id)" --raw-output`
for id in $PARIDS; do
    oci os preauth-request delete --par-id "$id" --bucket-name "$(state_get RUN_NAME)-$(state_get MTDR_KEY)" --force
done

# Object
if state_done WALLET_ZIP_OBJECT; then
  oci os object delete --object-name "wallet.zip" --bucket-name "$(state_get RUN_NAME)-$(state_get MTDR_KEY)" --force
  state_reset WALLET_ZIP_OBJECT
fi

# Object
if state_done CWALLET_SSO_OBJECT; then
  oci os object delete --object-name "cwallet.sso" --bucket-name "$(state_get RUN_NAME)-$(state_get MTDR_KEY)" --force
  state_reset CWALLET_SSO_OBJECT
fi

## Bucket
#if state_done OBJECT_STORE_BUCKET; then
#   oci os bucket delete --bucket-name "$(state_get RUN_NAME)" --force
# state_reset OBJECT_STORE_BUCKET
#fi

echo -e "${greenColour}[os-destroy.sh][+]${endColour} Finished Deleting Object Store"