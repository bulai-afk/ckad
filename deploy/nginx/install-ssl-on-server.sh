#!/usr/bin/env bash
# Установка SSL на VPS Selectel (после копирования сертификатов из Timeweb).
# Запуск на сервере: bash /opt/ckad/deploy/nginx/install-ssl-on-server.sh
set -euo pipefail

SSL_DIR="/etc/ssl/ckad"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "${SSL_DIR}/fullchain.pem" || ! -f "${SSL_DIR}/privkey.pem" ]]; then
  echo "[ssl] Ожидаются файлы:"
  echo "  ${SSL_DIR}/fullchain.pem  — сертификат + промежуточный (два блока CERTIFICATE)"
  echo "  ${SSL_DIR}/privkey.pem    — приватный ключ"
  exit 1
fi

chmod 755 "${SSL_DIR}"
chmod 644 "${SSL_DIR}/fullchain.pem"
chmod 600 "${SSL_DIR}/privkey.pem"

install -m 0644 "${SCRIPT_DIR}/ckad-proxy.inc" /etc/nginx/snippets/ckad-proxy.inc
install -m 0644 "${SCRIPT_DIR}/ckad.conf" /etc/nginx/sites-available/ckad.conf
ln -sf /etc/nginx/sites-available/ckad.conf /etc/nginx/sites-enabled/ckad.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "[ssl] OK — HTTPS на порту 443, редирект зеркал на https://центр-каталогизации.рф"
