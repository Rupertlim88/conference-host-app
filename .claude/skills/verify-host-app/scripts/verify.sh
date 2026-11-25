#!/usr/bin/env bash
# Launches, checks, or stops one host app and the local conference API. Usage is in ../SKILL.md.
set -euo pipefail

USAGE="usage: verify.sh <launch|doctor|stop> ams"
ACTION=${1:?$USAGE}
SOCIETY=${2:?$USAGE}
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
field() { node "$HERE/lib.mjs" "$SOCIETY" "$1"; }

APP_DIR="$ROOT/$(field dir)"
PORT=$(field port)
NAME=$(field name)
RUN="$ROOT/.verify/run"
EVIDENCE="$ROOT/.verify/evidence/$SOCIETY"
APP_PID="$RUN/app-$SOCIETY.pid"
API_PID="$RUN/conference-api.pid"
API_PORT=8787
KEY_FILE="$RUN/$SOCIETY-conference-api.key"
mkdir -p "$RUN" "$EVIDENCE"

fail() { echo "FAIL: $*"; exit 1; }
ok() { echo "ok: $*"; }

load_env() {
  [ -f "$APP_DIR/.env.local" ] || fail "$(field dir)/.env.local is missing. Its settings are listed in $(field dir)/README.md."
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/.env.local"
  set +a
}

# A pid file names the process group this script started; alive means that group still runs.
alive() { [ -f "$1" ] && kill -0 "-$(cat "$1")" 2>/dev/null; }
listener() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; }
owned() { local pid; pid=$(listener "$2"); [ -n "$pid" ] && alive "$1" && [ "$(ps -o pgid= -p "$pid" | tr -d ' ')" = "$(cat "$1")" ]; }
http_code() { curl -s -o /dev/null -w '%{http_code}' "$@" || true; }

# Starts a command in its own process group, so stop can end it and its children together.
start_group() {
  local pidfile=$1 log=$2 dir=$3
  shift 3
  set -m
  (cd "$dir" && exec nohup "$@") >"$log" 2>&1 </dev/null &
  echo $! >"$pidfile"
  set +m
}

wait_for() {
  local url=$1 want=$2
  for _ in $(seq 1 120); do
    [ "$(http_code "$url")" = "$want" ] && return 0
    sleep 0.5
  done
  return 1
}

api_wanted() { [[ "$CONFERENCE_API_URL" =~ ^http://(127\.0\.0\.1|localhost):$API_PORT/?$ ]]; }

# The local conference API's settings. Its databases live on API_DATABASE_URL's server (it needs pgcrypto), or on the host database's server when that is unset, as in CI.
api_env() {
  local base="${API_DATABASE_URL:-$HOST_DATABASE_URL}"
  export CONFERENCE_ADMIN_URL="$base" CONFERENCE_DATABASE_URL="$base"
  export CONTROL_DATABASE_URL="${base%/*}/host_app_api_control"
}
# The conference API lives in its own repository; set CONFERENCE_API_REPO, or keep a checkout beside this one.
api_repo() {
  local repo="${CONFERENCE_API_REPO:-$ROOT/../Conference-Matching-API}"
  [ -d "$repo/conference-api/data" ] || fail "no conference API checkout at $repo; set CONFERENCE_API_REPO, then run npm ci there"
  (cd "$repo" && pwd)
}
api_cli() { (cd "$(api_repo)" && npm run -s cli --workspace=@repo/conference-data -- "$@"); }

# Every setup command upserts, so a rerun changes nothing. The society's key is new on each launch and lasts a day;
# the old ones are cancelled first, since a partner may hold at most two live keys for a conference.
prepare_api() {
  api_env
  (cd "$ROOT" && node --input-type=module -e "
    import postgres from 'postgres';
    const sql = postgres(process.env.CONFERENCE_ADMIN_URL, { max: 1, onnotice: () => {} });
    const [row] = await sql\`select 1 from pg_database where datname = 'host_app_api_control'\`;
    if (!row) await sql.unsafe('create database host_app_api_control');
    await sql.end();") || fail "cannot create the conference API's control database"
  api_cli migrate-control >/dev/null
  api_cli add-partner host-demo Host app demo >/dev/null
  local conference key_id
  conference="$(field conference)"
  api_cli create-conference "$conference" host-demo >/dev/null
  for key_id in $(api_cli list-keys | awk -v c="$conference" '$2 == "host-demo" && $3 == c && $NF == "live" { print $1 }'); do
    api_cli cancel-key "$key_id" >/dev/null
  done
  (umask 077 && api_cli issue-key host-demo "$conference" 1 >"$KEY_FILE")
}

api_key() { [ -f "$KEY_FILE" ] && cat "$KEY_FILE" || echo "$CONFERENCE_API_KEY"; }

api_answers() {
  [ "$(http_code -X POST "$CONFERENCE_API_URL/v1/conferences/$(field conference)/matches:search" \
    -H "authorization: Bearer $(api_key)" -H 'content-type: application/json' \
    -d "{\"likeTalks\":[\"$(field sampleTalk)\"]}")" = "200" ]
}

launch() {
  load_env
  rm -f "$RUN/$SOCIETY-state.json"
  if [ -n "$(listener "$PORT")" ] && ! owned "$APP_PID" "$PORT"; then
    fail "port $PORT is in use by pid $(listener "$PORT"), which this skill did not start. Stop it first."
  fi
  alive "$APP_PID" && fail "$SOCIETY is already running from this skill. Run: verify.sh stop $SOCIETY"

  echo "loading the $SOCIETY programme (migrates first; safe to rerun)"
  (cd "$ROOT" && npm run load --silent --workspace=@repo/host-store -- "$SOCIETY") >"$RUN/load-$SOCIETY.log" 2>&1 ||
    { tail -20 "$RUN/load-$SOCIETY.log"; fail "load failed; is Postgres up at HOST_DATABASE_URL?"; }

  if api_wanted; then
    echo "preparing the local conference API (control database, partner, conferences, a key)"
    prepare_api
    if [ -z "$(listener "$API_PORT")" ]; then
      echo "starting the conference API on port $API_PORT"
      PORT="$API_PORT" MATCHING_ENGINE=placeholder APP_MODE=test \
        start_group "$API_PID" "$RUN/conference-api.log" "$(api_repo)" npm run start --workspace=@repo/conference-api-backend
      for _ in $(seq 1 60); do [ "$(http_code "http://127.0.0.1:$API_PORT/")" != "000" ] && break; sleep 0.5; done
      [ "$(http_code "http://127.0.0.1:$API_PORT/")" != "000" ] || { tail -20 "$RUN/conference-api.log"; fail "the conference API did not start"; }
    fi
  fi
  export CONFERENCE_API_KEY="$(api_key)"

  echo "sending the programme to the conference API"
  (cd "$ROOT" && npm run sync --silent --workspace=@repo/host-backend) | tail -1
  api_wanted && api_cli seed-matches "$(field conference)" placeholder >/dev/null

  echo "building $SOCIETY"
  (cd "$ROOT" && npm run build --workspace="$SOCIETY") >"$RUN/build-$SOCIETY.log" 2>&1 ||
    { tail -30 "$RUN/build-$SOCIETY.log"; fail "build failed"; }

  start_group "$APP_PID" "$RUN/app-$SOCIETY.log" "$APP_DIR" "$ROOT/node_modules/.bin/next" start --port "$PORT"
  wait_for "http://localhost:$PORT/sign-in" 200 || { tail -20 "$RUN/app-$SOCIETY.log"; fail "$SOCIETY did not answer on port $PORT"; }
  echo "READY $SOCIETY http://localhost:$PORT (process group $(cat "$APP_PID"))"
}

doctor() {
  load_env
  owned "$APP_PID" "$PORT" && ok "$SOCIETY listens on $PORT, started by this skill" ||
    fail "nothing this skill started listens on $PORT. Run: verify.sh launch $SOCIETY"
  curl -s "http://localhost:$PORT/sign-in" | grep -q "$NAME" && ok "the sign-in page names $NAME" ||
    fail "http://localhost:$PORT/sign-in does not name $NAME; another app may hold the port"
  local talks
  talks=$(cd "$ROOT" && node --input-type=module -e "
    import postgres from 'postgres';
    const sql = postgres(process.env.HOST_DATABASE_URL, { max: 1, onnotice: () => {} });
    const [row] = await sql\`select count(*)::int as n from \${sql('$(field schema)')}.talks\`;
    console.log(row.n); await sql.end();" 2>/dev/null) || fail "cannot read $(field schema).talks at HOST_DATABASE_URL"
  [ "$talks" -gt 0 ] && ok "the store holds $talks $SOCIETY talks" || fail "the store holds no $SOCIETY talks"
  api_answers && ok "the conference API at $CONFERENCE_API_URL answers for $(field conference) with this run's key" ||
    fail "the conference API at $CONFERENCE_API_URL does not answer matches:search for $(field sampleTalk)"
  if api_wanted && ! owned "$API_PID" "$API_PORT"; then
    echo "note: the conference API on $API_PORT was not started by this skill"
  fi
}

stop() {
  if alive "$APP_PID"; then kill -TERM "-$(cat "$APP_PID")" && echo "stopped $SOCIETY"; fi
  rm -f "$APP_PID" "$RUN/$SOCIETY-state.json"
  local other
  for other in "$RUN"/app-*.pid; do alive "$other" && { echo "kept the conference API: $(basename "$other" .pid) still runs"; return; }; done
  if alive "$API_PID"; then kill -TERM "-$(cat "$API_PID")" && echo "stopped the conference API"; fi
  rm -f "$API_PID" "$KEY_FILE"
  echo "evidence kept in .verify/evidence/$SOCIETY"
}

case "$ACTION" in
  launch) launch ;;
  doctor) doctor ;;
  stop) stop ;;
  *) fail "$USAGE" ;;
esac
