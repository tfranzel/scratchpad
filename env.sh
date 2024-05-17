#!/usr/bin/env bash
set -u

if [[ $OSTYPE =~ "darwin" ]]; then
    export USERGROUP=$USER:staff
else
    export USERGROUP=$USER:$USER
fi

export COMPOSE_FILE=docker/docker-compose.yml
export COMPOSE_PROJECT_NAME=scratchpad
