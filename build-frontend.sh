#!/usr/bin/env bash
set -e
set -u

source env.sh

cd frontend/

docker build --pull -t scratchpad-frontend .
docker run --rm \
    -v ${PWD}/dist/:/app/dist/ \
    -e VITE_GIT_HEAD_HASH="$(git rev-parse --short HEAD)" \
    scratchpad-frontend

echo "change ownership of DIST from root to ${USER} ..."
sudo chown -R $USERGROUP dist
