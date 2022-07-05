#!/usr/bin/env sh

curl -H "Content-Type: application/json" -d @`dirname $0`/../assets/datagen/endpoint-code-updates-config.json http://localhost:8083/connectors
