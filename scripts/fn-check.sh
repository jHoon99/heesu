#!/bin/sh
# Edge Function 정적 검사·단위 테스트(edge-runtime 없이 Deno만). deno.lock이 바뀌면 --frozen이 실패한다.
set -eu
cd "$(dirname "$0")/../supabase/functions"

for fn in submit-consultation create-student reset-student-password; do
  echo "== $fn"
  (cd "$fn" && deno check --frozen *.ts && deno lint && deno test --frozen)
done

echo "== _shared"
(cd create-student && deno lint ../_shared)
