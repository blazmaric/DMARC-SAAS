#!/bin/bash
set -e

# Create transport map
echo "dmarc.m-host.si dmarc-ingest:" > /etc/postfix/transport
postmap /etc/postfix/transport

# Create virtual map (empty for now)
touch /etc/postfix/virtual
postmap /etc/postfix/virtual

# Start Postfix
exec postfix start-fg
