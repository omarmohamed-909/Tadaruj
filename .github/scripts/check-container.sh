#!/usr/bin/env bash
set -euo pipefail
trap 'docker logs tadaruj-api-smoke 2>&1 || true; docker stop --time 15 tadaruj-api-smoke >/dev/null 2>&1 || true' EXIT

docker build --tag tadaruj-api:ci .
# This test container uses the job's disposable replica set, never platform data.
test_db="tadaruj_test_$(openssl rand -hex 12)"
docker run --detach --name tadaruj-api-smoke --network host \
  --env NODE_ENV=test --env PORT=8096 --env SERVER_HOST=127.0.0.1 \
  --env "MONGO_URI=mongodb://127.0.0.1:27028/${test_db}?replicaSet=codex-test" \
  --env EMAIL_DELIVERY_ENABLED=false tadaruj-api:ci

ready=false
for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 3 http://127.0.0.1:8096/health/ready; then ready=true; break; fi
  sleep 1
done
test "$ready" = true
docker exec tadaruj-api-smoke node scripts/healthcheck.js
test "$(docker exec tadaruj-api-smoke id -u)" != 0
test "$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:8096/api/v1/user/profile)" = 401
