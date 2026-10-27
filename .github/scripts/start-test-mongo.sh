#!/usr/bin/env bash
set -euo pipefail
trap 'docker logs tadaruj-test-mongo 2>&1 || true' ERR

# The same loopback address and port are reachable inside and outside the container.
# This container is ephemeral and is never given production credentials or volumes.
docker run --detach --name tadaruj-test-mongo \
  --publish 127.0.0.1:27028:27028 \
  mongo:8.0 --port 27028 --replSet codex-test --bind_ip_all

for attempt in $(seq 1 30); do
  if docker exec tadaruj-test-mongo mongosh --quiet --port 27028 --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec tadaruj-test-mongo mongosh --quiet --port 27028 --eval \
  'rs.initiate({_id:"codex-test",members:[{_id:0,host:"127.0.0.1:27028"}]})'
for attempt in $(seq 1 30); do
  if docker exec tadaruj-test-mongo mongosh --quiet --port 27028 --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then exit 0; fi
  sleep 1
done
docker logs tadaruj-test-mongo
exit 1
