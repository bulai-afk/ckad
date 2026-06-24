#!/usr/bin/env bash
# Первичная настройка VPS для GitHub Actions deploy (Ubuntu 22.04+).
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/ckad/current}"
SHARED="${SHARED:-/opt/ckad/shared}"
DB_NAME="${DB_NAME:-ckad}"
DB_USER="${DB_USER:-ckad}"
NODE_MAJOR="${NODE_MAJOR:-22}"

export DEBIAN_FRONTEND=noninteractive

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "v${NODE_MAJOR}\\."; then
  echo "[bootstrap] installing Node.js ${NODE_MAJOR}.x"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

echo "[bootstrap] node $(node -v) npm $(npm -v)"

if ! command -v nginx >/dev/null 2>&1; then
  echo "[bootstrap] installing nginx"
  apt-get install -y -qq nginx
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p /etc/ssl/ckad
chmod 755 /etc/ssl/ckad
install -m 0644 "${SCRIPT_DIR}/nginx/ckad-proxy.inc" /etc/nginx/snippets/ckad-proxy.inc
if [ -f /etc/ssl/ckad/fullchain.pem ] && [ -f /etc/ssl/ckad/privkey.pem ]; then
  NGINX_SITE="${SCRIPT_DIR}/nginx/ckad.conf"
  chmod 644 /etc/ssl/ckad/fullchain.pem
  chmod 600 /etc/ssl/ckad/privkey.pem
else
  NGINX_SITE="${SCRIPT_DIR}/nginx/ckad-http.conf"
fi
install -m 0644 "${NGINX_SITE}" /etc/nginx/sites-available/ckad.conf
ln -sf /etc/nginx/sites-available/ckad.conf /etc/nginx/sites-enabled/ckad.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx
if [ -f /etc/ssl/ckad/fullchain.pem ] && [ -f /etc/ssl/ckad/privkey.pem ]; then
  echo "[bootstrap] nginx :80 and :443 (SSL)"
else
  echo "[bootstrap] nginx :80 only — run deploy/nginx/install-ssl-on-server.sh after placing certs"
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "[bootstrap] installing MariaDB"
  apt-get install -y -qq mariadb-server
  systemctl enable --now mariadb
fi

mkdir -p "${SHARED}/env"
chmod 700 "${SHARED}" "${SHARED}/env"

ENV_FILE="${SHARED}/env/backend.env"
if [ ! -f "${ENV_FILE}" ]; then
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
  mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
  mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
  mysql -e "FLUSH PRIVILEGES;"
  cat >"${ENV_FILE}" <<EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@127.0.0.1:3306/${DB_NAME}"
PORT=4000
NODE_ENV=production
EOF
  chmod 600 "${ENV_FILE}"
  echo "[bootstrap] wrote ${ENV_FILE}"
else
  echo "[bootstrap] ${ENV_FILE} already exists — skipped DB init"
fi

FRONT_ENV="${SHARED}/env/frontend.env"
if [ ! -f "${FRONT_ENV}" ]; then
  cat >"${FRONT_ENV}" <<'EOF'
NODE_ENV=production
PORT=3000
BACKEND_API_URL=http://127.0.0.1:4000
EOF
  chmod 600 "${FRONT_ENV}"
  echo "[bootstrap] wrote ${FRONT_ENV}"
else
  if ! grep -q '^BACKEND_API_URL=' "${FRONT_ENV}"; then
    printf '\nBACKEND_API_URL=http://127.0.0.1:4000\n' >>"${FRONT_ENV}"
    echo "[bootstrap] appended BACKEND_API_URL to ${FRONT_ENV}"
  fi
fi

install -m 0644 "${SCRIPT_DIR}/systemd/ckad-backend.service" /etc/systemd/system/ckad-backend.service
install -m 0644 "${SCRIPT_DIR}/systemd/ckad-frontend.service" /etc/systemd/system/ckad-frontend.service
systemctl daemon-reload
systemctl enable ckad-backend ckad-frontend

mkdir -p "${APP_ROOT}/backend/data/uploads/inline"
chown -R www-data:www-data "${APP_ROOT}/backend/data" 2>/dev/null || true
chmod -R u+rwX "${APP_ROOT}/backend/data" 2>/dev/null || true

echo "[bootstrap] done — Node, MariaDB, nginx :80, env files, systemd units"
