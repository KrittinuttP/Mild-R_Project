#!/usr/bin/env bash
# Read-only check: why can't this repo fetch/push to GitHub over SSH?
#
#   bash scripts/check-github-ssh.sh
#
# Changes nothing (no ssh-add, no config edits, no git push).
# Prints only paths, key fingerprints and the GitHub greeting — never key contents.
# Exit 0 = PASS (GitHub accepts the key), 1 = FAIL.

set -u  # arrays use ${a[@]+"${a[@]}"} so empty ones work on macOS bash 3.2
cd "$(dirname "$0")/.." || exit 1

PASS=1
ok()   { printf '  ✅ %s\n' "$*"; }
bad()  { printf '  ❌ %s\n' "$*"; PASS=0; }
info() { printf '  · %s\n' "$*"; }

echo "== 1) Remote"
URL="$(git remote get-url origin 2>/dev/null || true)"
if [ -z "$URL" ]; then bad "no 'origin' remote"; echo "RESULT: FAIL"; exit 1; fi
info "origin = $URL"
case "$URL" in
  git@*:*) HOST="${URL#git@}"; HOST="${HOST%%:*}" ;;
  ssh://git@*) HOST="${URL#ssh://git@}"; HOST="${HOST%%/*}"; HOST="${HOST%%:*}" ;;
  https://*) info "remote is HTTPS, not SSH → this script does not apply"; echo "RESULT: SKIP"; exit 0 ;;
  *) bad "unrecognised remote format"; echo "RESULT: FAIL"; exit 1 ;;
esac
info "SSH host (alias) = $HOST"
SSHCMD="$(git config --get core.sshCommand || true)"
[ -n "$SSHCMD" ] && info "git core.sshCommand = $SSHCMD"

echo "== 2) What ~/.ssh/config resolves for '$HOST'"
RESOLVED="$(ssh -G "$HOST" 2>/dev/null)"
REAL_HOST="$(printf '%s\n' "$RESOLVED" | awk '$1=="hostname"{print $2; exit}')"
REAL_USER="$(printf '%s\n' "$RESOLVED" | awk '$1=="user"{print $2; exit}')"
ONLY="$(printf '%s\n' "$RESOLVED" | awk '$1=="identitiesonly"{print $2; exit}')"
info "hostname = $REAL_HOST · user = $REAL_USER · identitiesonly = $ONLY"
if [ "$REAL_HOST" = "$HOST" ] && [ "$HOST" != "github.com" ]; then
  bad "no 'Host $HOST' block in ~/.ssh/config (hostname did not change to github.com)"
elif [ "$REAL_HOST" = "github.com" ]; then
  ok "alias points to github.com"
fi

# Identity files ssh would try (expand ~).
IDS=()
while IFS= read -r f; do
  f="${f/#\~/$HOME}"
  IDS+=("$f")
done < <(printf '%s\n' "$RESOLVED" | awk '$1=="identityfile"{print $2}')

echo "== 3) Key files for this host"
FOUND_FP=()
FIRST_FILE=""
for f in ${IDS[@]+"${IDS[@]}"}; do
  if [ -f "$f" ]; then
    FP="$(ssh-keygen -lf "$f" 2>/dev/null | awk '{print $2}')"
    [ -z "$FP" ] && [ -f "$f.pub" ] && FP="$(ssh-keygen -lf "$f.pub" 2>/dev/null | awk '{print $2}')"
    ok "exists: $f  (fingerprint ${FP:-unknown})"
    [ -z "$FIRST_FILE" ] && FIRST_FILE="$f"
    [ -n "$FP" ] && FOUND_FP+=("$FP")
  else
    info "not found: $f"
  fi
done
[ ${#FOUND_FP[@]} -eq 0 ] && bad "none of the IdentityFile paths exist → create a key or fix IdentityFile"

echo "== 4) ssh-agent"
AGENT="$(ssh-add -l 2>&1)"; AGENT_RC=$?
if [ $AGENT_RC -eq 2 ]; then
  bad "cannot reach ssh-agent"
elif [ $AGENT_RC -eq 1 ]; then
  info "agent has no keys loaded"
else
  printf '%s\n' "$AGENT" | awk '{print "  · loaded: " $2 "  " $NF}'
fi
LOADED=0
for fp in ${FOUND_FP[@]+"${FOUND_FP[@]}"}; do
  printf '%s\n' "$AGENT" | grep -qF "$fp" && LOADED=1
done
if [ ${#FOUND_FP[@]} -gt 0 ]; then
  if [ $LOADED -eq 1 ]; then ok "this host's key is loaded in the agent"
  else info "this host's key is NOT in the agent (fine if it has no passphrase; otherwise run ssh-add, see below)"; fi
fi

echo "== 5) GitHub login test (ssh -T)"
OUT="$(ssh -T -o BatchMode=yes -o ConnectTimeout=10 "git@$HOST" 2>&1)"
printf '%s\n' "$OUT" | sed 's/^/  │ /'
if printf '%s\n' "$OUT" | grep -q "successfully authenticated"; then
  WHO="$(printf '%s\n' "$OUT" | sed -n 's/^Hi \([^!]*\)!.*/\1/p' | head -1)"
  ok "GitHub accepts the key as: $WHO"
  REPO_OWNER="$(printf '%s' "$URL" | sed -n 's#.*:\([^/]*\)/.*#\1#p')"
  if [ -n "$WHO" ] && [ -n "$REPO_OWNER" ] && [ "$WHO" != "$REPO_OWNER" ]; then
    info "repo owner is '$REPO_OWNER' but key belongs to '$WHO' → '$WHO' must be a collaborator with write access"
  fi
elif printf '%s\n' "$OUT" | grep -q "Permission denied"; then
  bad "GitHub rejected the key (Permission denied)"
elif printf '%s\n' "$OUT" | grep -qi "passphrase\|agent refused"; then
  bad "key needs its passphrase → load it into the agent first (see below)"
else
  bad "could not log in (network / host key / other — see lines above)"
fi

echo "== 6) Remote reachable with git"
if git ls-remote --heads origin >/dev/null 2>&1; then ok "git ls-remote origin works"
else bad "git ls-remote origin failed"; fi

echo
if [ $PASS -eq 1 ]; then
  echo "RESULT: PASS — run: git push origin main"
  echo "(If Sourcetree still fails: Settings → SSH Client → OpenSSH, so it uses ~/.ssh/config.)"
  exit 0
fi
echo "RESULT: FAIL"
echo "Next steps (run by hand — this script changes nothing):"
if [ -n "$FIRST_FILE" ]; then
  echo "  • load the key:   ssh-add --apple-use-keychain $FIRST_FILE"
else
  echo "  • no key file found → check the 'Host $HOST' block / IdentityFile in ~/.ssh/config"
fi
echo "  • then re-run:    bash scripts/check-github-ssh.sh"
echo "  • still denied →  add the .pub of that key on GitHub (account that can push to the repo): Settings → SSH and GPG keys"
exit 1
