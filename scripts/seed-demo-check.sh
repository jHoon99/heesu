#!/bin/sh
# 시연 데이터(supabase/seed-demo.sql·seed-demo-clear.sql) 로컬 검사. 로컬 DB를 바꾸지 않는다(검사 SQL이 끝에서 rollback).
# 클라우드에 붙지 않게 로컬 Supabase의 DB_URL만 쓴다.
set -eu
cd "$(dirname "$0")/.."

DB_URL=$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL="\(.*\)"$/\1/p')
case "$DB_URL" in
  postgresql://postgres:postgres@127.0.0.1:*) ;;
  *)
    echo "로컬 Supabase에서만 돌려요. supabase start 뒤 다시 실행해 주세요." >&2
    exit 1
    ;;
esac

psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f scripts/seed-demo-check.sql
echo "seed-demo check: OK"
