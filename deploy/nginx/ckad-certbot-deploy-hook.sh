#!/usr/bin/env bash
# Certbot deploy hook: sync copies for bootstrap paths and reload nginx.
set -euo pipefail

LE_LIVE="/etc/letsencrypt/live/ckad-all"
SSL_DIR="/etc/ssl/ckad"

if [[ -f "${LE_LIVE}/fullchain.pem" && -f "${LE_LIVE}/privkey.pem" ]]; then
  mkdir -p "${SSL_DIR}"
  install -m 644 "${LE_LIVE}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
  install -m 600 "${LE_LIVE}/privkey.pem" "${SSL_DIR}/privkey.pem"
fi

systemctl reload nginx
