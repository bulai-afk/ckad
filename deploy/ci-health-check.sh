#!/usr/bin/env bash
# Health checks for GitHub Actions deploy workflows.
# Usage: ci-health-check.sh <frontend|backend> <ssh-user> <ssh-host> [site-url]
set -euo pipefail

MODE="${1:?mode (frontend|backend)}"
DEPLOY_USER="${2:?ssh user}"
DEPLOY_HOST="${3:?ssh host}"
SITE_URL="${4:-}"

# Сертификат выпущен на punycode; DEPLOY_SITE_URL часто задан кириллицей.
PUBLIC_SITE_PUNYCODE="https://xn----8sbaaoishcaoovty5ae8dp.xn--p1ai"
PUBLIC_SITE_HOST="xn----8sbaaoishcaoovty5ae8dp.xn--p1ai"

wait_curl() {
  local url="$1"
  local attempt
  for attempt in $(seq 1 15); do
    if curl -fsS --max-time 10 -o /dev/null -w '' "$url"; then
      echo "OK $url"
      return 0
    fi
    echo "Health check attempt $attempt/15 failed for $url, retrying in 3s..."
    sleep 3
  done
  echo "::error::Health check failed after 15 attempts: $url"
  return 1
}

ssh_local() {
  ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "$@"
}

wait_local_https() {
  ssh_local "set -euo pipefail
    for attempt in \$(seq 1 30); do
      if curl -fsS --max-time 5 -o /dev/null \
         -H 'Host: ${PUBLIC_SITE_HOST}' \
         'https://127.0.0.1/' -k; then
        echo 'OK localhost HTTPS (nginx :443 -> Next.js)'
        exit 0
      fi
      echo \"Local HTTPS attempt \$attempt/30, waiting 2s...\"
      sleep 2
    done
    echo '::error::Local HTTPS health check failed on server'
    systemctl --no-pager -l status ckad-frontend nginx || true
    journalctl -u ckad-frontend -n 40 --no-pager || true
    exit 1
  "
}

# С GitHub Actions http://<VPS-IP>/ часто даёт 502 (прокси/фильтр хостера), хотя
# localhost и https://<punycode>/ работают. Публичную доступность проверяем по HTTPS-домену.
wait_public_homepage() {
  if [ -n "$SITE_URL" ]; then
    local base="${SITE_URL%/}"
    if wait_curl "${base}/"; then
      echo "OK ${base}/ (DEPLOY_SITE_URL)"
      return 0
    fi
    echo "::warning::DEPLOY_SITE_URL unreachable from CI (${base}/), trying punycode..."
  fi
  wait_curl "${PUBLIC_SITE_PUNYCODE}/"
  echo "OK ${PUBLIC_SITE_PUNYCODE}/ (public HTTPS)"
}

case "$MODE" in
  frontend)
    ssh_local 'set -euo pipefail
      for attempt in $(seq 1 30); do
        if curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:3000/ \
           && curl -fsS --max-time 5 -o /dev/null http://127.0.0.1/; then
          echo "OK localhost (Next.js :3000 + nginx :80)"
          exit 0
        fi
        echo "Local health attempt $attempt/30, waiting 2s..."
        sleep 2
      done
      echo "::error::Local health check failed on server"
      systemctl --no-pager -l status ckad-frontend || true
      journalctl -u ckad-frontend -n 40 --no-pager || true
      exit 1
    '
    wait_local_https
    wait_public_homepage
    ;;
  backend)
    ssh_local 'set -euo pipefail
      for attempt in $(seq 1 30); do
        if curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:4000/health \
           && curl -fsS --max-time 5 -o /dev/null http://127.0.0.1/api/pages; then
          echo "OK localhost (Express :4000 + nginx BFF)"
          exit 0
        fi
        echo "Local health attempt $attempt/30, waiting 2s..."
        sleep 2
      done
      echo "::error::Local health check failed on server"
      systemctl --no-pager -l status ckad-backend ckad-frontend || true
      journalctl -u ckad-backend -n 40 --no-pager || true
      exit 1
    '
    for path in \
      /api/pages \
      /api/pages/folders \
      /api/pages/partners \
      /api/pages/reviews \
      /api/pages/banners \
      /api/pages/site-settings
    do
      wait_curl "${PUBLIC_SITE_PUNYCODE}${path}"
    done
    wait_local_https
    wait_public_homepage
    ;;
  *)
    echo "::error::Unknown health check mode: $MODE"
    exit 1
    ;;
esac

