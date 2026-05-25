#!/usr/bin/env bash
# @author alnosila — https://github.com/alnosila
# env.enc (JSON) + ./vault → .env

set -euo pipefail
npx tsx scripts/env-crypto.ts decrypt
