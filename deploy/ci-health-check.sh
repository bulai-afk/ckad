#!/usr/bin/env bash
# Health checks for GitHub Actions deploy workflows.
# Usage: ci-health-check.sh <frontend|backend> <ssh-user> <ssh-host> [site-url]
set -euo pipefail

MODE="${1:?mode (frontend|backend)}"
DEPLOY_USER="${2:?ssh user}"
DEPLOY_HOST="${3:?ssh host}"
SITE_URL="${4:-}"

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
    wait_curl "http://${DEPLOY_HOST}/"
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
      wait_curl "http://${DEPLOY_HOST}${path}"
    done
    ;;
  *)
    echo "::error::Unknown health check mode: $MODE"
    exit 1
    ;;
esac

if [ -n "$SITE_URL" ]; then
  BASE="${SITE_URL%/}"
  if curl -fsS --max-time 10 -o /dev/null -w '' "${BASE}/"; then
    echo "OK ${BASE}/ (DEPLOY_SITE_URL)"
  else
    echo "::warning::DEPLOY_SITE_URL is unreachable from GitHub Actions (${BASE}/). Deploy verified via http://${DEPLOY_HOST}; check DNS, TLS, or firewall for the public domain."
  fi
fi
