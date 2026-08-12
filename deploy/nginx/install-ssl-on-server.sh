#!/usr/bin/env bash
# Установка / обновление SSL на VPS (Let's Encrypt ckad-all + nginx).
# Запуск на сервере: bash /opt/ckad/deploy/nginx/install-ssl-on-server.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LE_LIVE="/etc/letsencrypt/live/ckad-all"
SSL_DIR="/etc/ssl/ckad"

DOMAINS=(
  xn----8sbaaoishcaoovty5ae8dp.xn--p1ai
  www.xn----8sbaaoishcaoovty5ae8dp.xn--p1ai
  xn--80aaalhpgcamnurx3ad5do.xn--p1ai
  www.xn--80aaalhpgcamnurx3ad5do.xn--p1ai
  centrcatalog.ru
  www.centrcatalog.ru
)

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx
fi

DOMAIN_ARGS=()
for d in "${DOMAINS[@]}"; do
  DOMAIN_ARGS+=(-d "$d")
done

if [[ -d "${LE_LIVE}" ]]; then
  certbot certonly --cert-name ckad-all --expand --nginx --non-interactive "${DOMAIN_ARGS[@]}"
else
  certbot certonly --cert-name ckad-all --nginx --non-interactive --agree-tos --register-unsafely-without-email "${DOMAIN_ARGS[@]}"
fi

mkdir -p "${SSL_DIR}"
install -m 644 "${LE_LIVE}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
install -m 600 "${LE_LIVE}/privkey.pem" "${SSL_DIR}/privkey.pem"
chmod 755 "${SSL_DIR}"

mkdir -p /etc/letsencrypt/renewal-hooks/deploy
install -m 0755 "${SCRIPT_DIR}/ckad-certbot-deploy-hook.sh" /etc/letsencrypt/renewal-hooks/deploy/ckad-reload-nginx.sh

# Renewal must use nginx plugin (not standalone) so nginx stays up
if [[ -f /etc/letsencrypt/renewal/ckad-all.conf ]]; then
  sed -i 's/^authenticator = standalone$/authenticator = nginx/' /etc/letsencrypt/renewal/ckad-all.conf
  if ! grep -q '^authenticator = nginx$' /etc/letsencrypt/renewal/ckad-all.conf; then
    echo "[ssl] WARN: could not confirm authenticator=nginx in renewal config" >&2
  fi
fi

install -m 0644 "${SCRIPT_DIR}/ckad-proxy.inc" /etc/nginx/snippets/ckad-proxy.inc
install -m 0644 "${SCRIPT_DIR}/ckad.conf" /etc/nginx/sites-available/ckad.conf
ln -sf /etc/nginx/sites-available/ckad.conf /etc/nginx/sites-enabled/ckad.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
systemctl enable --now certbot.timer

echo "[ssl] OK — HTTPS via /etc/letsencrypt/live/ckad-all (auto-renew: certbot.timer)"
