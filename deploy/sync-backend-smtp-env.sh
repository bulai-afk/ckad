#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-/opt/ckad/shared/env/backend.env}"

if [ -z "${SMTP_PASS:-}" ]; then
  echo "[smtp] SMTP_PASS is not set — skip SMTP env sync"
  exit 0
fi

mkdir -p "$(dirname "${ENV_FILE}")"
touch "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

tmp="$(mktemp)"
if [ -s "${ENV_FILE}" ]; then
  grep -v -E '^(SMTP_|FEEDBACK_MAIL_TO=)' "${ENV_FILE}" >"${tmp}" || true
else
  : >"${tmp}"
fi

cat >>"${tmp}" <<EOF
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@центр-каталогизации.рф
SMTP_PASS="${SMTP_PASS}"
SMTP_FROM="ЦКиАД <info@центр-каталогизации.рф>"
FEEDBACK_MAIL_TO=info@центр-каталогизации.рф
EOF

mv "${tmp}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
echo "[smtp] SMTP variables synced in ${ENV_FILE}"
