![pwa-192x192.png](frontend/public/pwa-192x192.png)

# scratchpad

## Overview

A minimalistic service providing a secure file and text share between two parties.
This is a small personal project to help me securely overcome corporate information silos,
where desperate people would otherwise send sensitive information via chat or mail.

* **Elliptic-curve Diffie–Hellman (ECDH)** as key agreement protocol.
* Data is encrypted symmetrically with **AES-GCM** (256 bit).
* No "roll your own". All crypto is browser-native through the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto).
* Instant updates via **WebSocket**.
* Installable [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps).
* Zero-trust server that merely acts as a forwarder for client-side encrypted payloads.

To mitigate MITM attacks, the security of the connection can be verified by
confirming both parties have the same key fingerprint in the form of a word list 
([bip-0039](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)).

File sizes are somewhat limited (in the browser) due to the KISS approach.

### Potential future features

* Offline editing and subsequent 3-way merge of the divergence
* Manual onboarding of 3rd party with the key encoded as a 26 word list

## Demo

https://github.com/user-attachments/assets/d55b2cf4-4bed-4d1a-843f-6e960b9ad7df

## Installation

### Development

```bash
# frontend
cd frontend
npm install
npm run dev

# backend
poetry shell
poetry install
DEV=1 SCRATCHPAD_ADMIN_BEARER=somesecret uvicorn app:app --reload
```

### Deployment

`docker-compose` containers managed by a `systemd` service. The stack can be deployed with `ansible`.
Frontend is build locally with [Dockerfile](frontend/Dockerfile) and then rsynced to server.
Docker exposes port 8003 for internal redirection, TLS termination will be left up to you. 

```bash
# remote
# Bearer for SwaggerUI at https://yourserver.com/api/docs
echo "SCRATCHPAD_ADMIN_BEARER=somesecret" > /var/www/scratchpad/docker/.env

# local
ansible-playbook deploy.yml -i "yourserver.com," --tags "BE,FE"
```

## Technology

Frontend: Vue, Vite, Vite PWA, Boostrap, Boostrap Icons, Dropzone.js

Backend: Nginx, FastAPI, Uvicorn, JSON on disk
