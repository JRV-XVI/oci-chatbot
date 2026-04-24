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


# Create Object Store Bucket (Should be replaced by terraform one day)
while ! state_done OBJECT_STORE_BUCKET; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} Checking object storage bucket"
#  oci os bucket create --compartment-id "$(state_get COMPARTMENT_OCID)" --name "$(state_get RUN_NAME)"
  if oci os bucket get --name "$(state_get RUN_NAME)-$(state_get MTDR_KEY)"; then
    state_set_done OBJECT_STORE_BUCKET
    echo -e "${greenColour}[db-setup.sh][+]${endColour} finished checking object storage bucket"
  fi
done



# Wait for Order DB OCID
while ! state_done MTDR_DB_OCID; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} `date`: Waiting for MTDR_DB_OCID"
  sleep 2
done



# Get Wallet
while ! state_done WALLET_GET; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} creating wallet"
  cd $MTDRWORKSHOP_LOCATION
  mkdir wallet
  cd wallet
  oci db autonomous-database generate-wallet --autonomous-database-id "$(state_get MTDR_DB_OCID)" --file 'wallet.zip' --password 'Welcome1' --generate-type 'ALL'
  unzip wallet.zip
  cd $MTDRWORKSHOP_LOCATION
  state_set_done WALLET_GET
  echo -e "${greenColour}[db-setup.sh][+]${endColour} finished creating wallet"
done



# Get DB Connection Wallet and to Object Store
while ! state_done CWALLET_SSO_OBJECT; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} grabbing wallet"
  cd $MTDRWORKSHOP_LOCATION/wallet
  oci os object put --bucket-name "$(state_get RUN_NAME)-$(state_get MTDR_KEY)" --name "cwallet.sso" --file 'cwallet.sso'
  cd $MTDRWORKSHOP_LOCATION
  state_set_done CWALLET_SSO_OBJECT
  echo -e "${greenColour}[db-setup.sh][+]${endColour} done grabbing wallet"
done



# Create Authenticated Link to Wallet
while ! state_done CWALLET_SSO_AUTH_URL; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} creating authenticated link to wallet"
  ACCESS_URI=`oci os preauth-request create --object-name 'cwallet.sso' --access-type 'ObjectRead' --bucket-name "$(state_get RUN_NAME)-$(state_get MTDR_KEY)" --name 'mtdrworkshop' --time-expires $(date '+%Y-%m-%d' --date '+7 days') --query 'data."access-uri"' --raw-output`
  state_set CWALLET_SSO_AUTH_URL "https://objectstorage.$(state_get REGION).oraclecloud.com${ACCESS_URI}"
  echo -e "${greenColour}[db-setup.sh][+]${endColour} done creating authenticated link to wallet"
done



# Give DB_PASSWORD priority
while ! state_done DB_PASSWORD; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} Waiting for DB_PASSWORD"
  sleep 5
done



# Create Inventory ATP Bindings
while ! state_done DB_WALLET_SECRET; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} creating Inventory ATP Bindings"
  cd $MTDRWORKSHOP_LOCATION/wallet
  cat - >sqlnet.ora <<!
WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="/mtdrworkshop/creds")))
SSL_SERVER_DN_MATCH=yes
!
  if kubectl create -f - -n mtdrworkshop; then
    state_set_done DB_WALLET_SECRET
  else
    echo -e "${redColour}[db-setup.sh][x]${endColour} Error: Failure to create db-wallet-secret.  Retrying..."
    sleep 5
  fi <<!
apiVersion: v1
data:
  README: $(base64 -w0 README)
  cwallet.sso: $(base64 -w0 cwallet.sso)
  ewallet.p12: $(base64 -w0 ewallet.p12)
  keystore.jks: $(base64 -w0 keystore.jks)
  ojdbc.properties: $(base64 -w0 ojdbc.properties)
  sqlnet.ora: $(base64 -w0 sqlnet.ora)
  tnsnames.ora: $(base64 -w0 tnsnames.ora)
  truststore.jks: $(base64 -w0 truststore.jks)
kind: Secret
metadata:
  name: db-wallet-secret
!
  cd $MTDRWORKSHOP_LOCATION
done


# DB Connection Setup
export TNS_ADMIN=$MTDRWORKSHOP_LOCATION/wallet
cat - >$TNS_ADMIN/sqlnet.ora <<!
WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="$TNS_ADMIN")))
SSL_SERVER_DN_MATCH=yes
!
MTDR_DB_SVC="$(state_get MTDR_DB_NAME)_tp"
TODO_USER=TODOUSER
ORDER_LINK=ORDERTOINVENTORYLINK
ORDER_QUEUE=ORDERQUEUE



# Get DB Password
while true; do
  if DB_PASSWORD=`kubectl get secret dbuser -n mtdrworkshop --template={{.data.dbpassword}} | base64 --decode`; then
    if ! test -z "$DB_PASSWORD"; then
      break
    fi
  fi
  echo -e "${redColour}[db-setup.sh][x]${endColour} Error: Failed to get DB password.  Retrying..."
  sleep 5
done



# Wait for DB Password to be set in Order DB
while ! state_done MTDR_DB_PASSWORD_SET; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} `date`: Waiting for MTDR_DB_PASSWORD_SET"
  sleep 2
done


# Order DB User, Objects
while ! state_done TODO_USER; do
  echo -e "${yellowColour}[db-setup.sh][+]${endColour} connecting to mtdr database"
  U=$TODO_USER
  SVC=$MTDR_DB_SVC
  sqlplus /nolog <<!
WHENEVER SQLERROR EXIT 1
connect admin/"$DB_PASSWORD"@$SVC
CREATE USER $U IDENTIFIED BY "$DB_PASSWORD" DEFAULT TABLESPACE data QUOTA UNLIMITED ON data;
GRANT CREATE SESSION, CREATE VIEW, CREATE SEQUENCE, CREATE PROCEDURE TO $U;
GRANT CREATE TABLE, CREATE TRIGGER, CREATE TYPE, CREATE MATERIALIZED VIEW TO $U;
GRANT CONNECT, RESOURCE, pdb_dba, SODA_APP to $U;
CREATE TABLE TODOUSER.todoitem (id NUMBER GENERATED ALWAYS AS IDENTITY, description VARCHAR2(4000), creation_ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, done NUMBER(1,0) , PRIMARY KEY (id));
insert into TODOUSER.todoitem  (description, done) values ('Manual item insert', 0);
commit;
!
  state_set_done TODO_USER
  echo -e "${greenColour}[db-setup.sh][+]${endColour} finished connecting to database and creating attributes"
done
# DB Setup Done
state_set_done DB_SETUP