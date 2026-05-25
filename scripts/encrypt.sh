#!/usr/bin/env bash
# @author alnosila — https://github.com/alnosila
# .env + ./vault → env.enc (JSON: iv + data)

set -euo pipefail
npx tsx scripts/env-crypto.ts encrypt
