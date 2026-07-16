#!/usr/bin/env bash
set -Eeuo pipefail

archive="${RACECAR_ARCHIVE:-/tmp/racecar-lab-dist.tgz}"
nginx_config="${RACECAR_NGINX_CONFIG:-/tmp/racecar-lab.nginx.conf}"
site_root="/var/www/racecar-lab"
release_id="${RACECAR_RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
keep_releases="${RACECAR_KEEP_RELEASES:-5}"
release="$site_root/releases/$release_id"
staging="$release.staging.$$"
current="$site_root/current"
candidate_link="$site_root/.current.$release_id.$$"
nginx_target="/etc/nginx/conf.d/racecar-lab.conf"
nginx_backup="/etc/nginx/conf.d/.racecar-lab.conf.backup.$$"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
cleanup() { rm -rf -- "$staging"; rm -f -- "$candidate_link" "$nginx_backup" "$site_root/.healthcheck.$$"; }
trap cleanup EXIT

restore_nginx_config() {
  if [[ -f "$nginx_backup" ]]; then
    mv -f -- "$nginx_backup" "$nginx_target"
  else
    rm -f -- "$nginx_target"
  fi
}

reload_or_start_nginx() {
  if systemctl is-active --quiet nginx; then
    systemctl reload nginx
  else
    systemctl start nginx
  fi
}

healthcheck() {
  local response="$site_root/.healthcheck.$$" result=0
  curl --fail --silent --show-error --max-time 10 --output "$response" http://127.0.0.1/ || result=$?
  if (( result == 0 )); then cmp --silent "$response" "$release/index.html" || result=$?; fi
  rm -f -- "$response"
  return "$result"
}

rollback_activation() {
  if [[ -n "${previous_release:-}" && -d "$previous_release" ]]; then
    ln -s -- "$previous_release" "$candidate_link"
    mv -Tf -- "$candidate_link" "$current"
  else
    rm -f -- "$current"
  fi
  restore_nginx_config
  nginx -t && reload_or_start_nginx || true
  rm -rf -- "$release"
}

prune_old_releases() {
  local current_real previous_real candidate
  current_real="$(readlink -f "$current")"
  previous_real="${previous_release:-}"
  declare -A keep=()
  keep["$current_real"]=1
  if [[ -n "$previous_real" && "$previous_real" == "$site_root/releases/"* && -d "$previous_real" ]]; then
    keep["$previous_real"]=1
  fi

  while IFS= read -r candidate; do
    [[ -n "$candidate" ]] || continue
    [[ "$candidate" == "$site_root/releases/"* && "$(dirname "$candidate")" == "$site_root/releases" ]] || return 1
    if (( ${#keep[@]} < keep_releases )); then keep["$candidate"]=1; fi
  done < <(find "$site_root/releases" -mindepth 1 -maxdepth 1 -type d ! -name '*.staging.*' -printf '%T@ %p\n' | sort -nr | sed 's/^[^ ]* //')

  while IFS= read -r candidate; do
    [[ -n "$candidate" ]] || continue
    [[ "$candidate" == "$site_root/releases/"* && "$(dirname "$candidate")" == "$site_root/releases" ]] || return 1
    if [[ -z "${keep[$candidate]+present}" ]]; then rm -rf -- "$candidate"; fi
  done < <(find "$site_root/releases" -mindepth 1 -maxdepth 1 -type d ! -name '*.staging.*' -print)
}

[[ "$(id -u)" -eq 0 ]] || fail "This deployment must run as root."
[[ "$release_id" =~ ^[0-9A-Za-z._-]+$ ]] || fail "Invalid release identifier."
[[ "$keep_releases" =~ ^[0-9]+$ ]] && (( keep_releases >= 2 && keep_releases <= 20 )) || fail "RACECAR_KEEP_RELEASES must be an integer from 2 to 20."
[[ -s "$archive" ]] || fail "Missing release archive: $archive"
[[ -s "$nginx_config" ]] || fail "Missing Nginx configuration: $nginx_config"
[[ ! -e "$release" ]] || fail "Release already exists: $release"
command -v nginx >/dev/null || fail "Nginx is not installed."
command -v systemctl >/dev/null || fail "systemd is required."
command -v curl >/dev/null || fail "curl is required for the post-deployment health check."
command -v cmp >/dev/null || fail "cmp is required for the post-deployment health check."
systemctl enable nginx >/dev/null

while IFS= read -r entry; do
  [[ "$entry" != /* && ! "$entry" =~ (^|/)\.\.(/|$) ]] || fail "Unsafe archive path: $entry"
done < <(tar -tzf "$archive")
while IFS= read -r listing; do
  [[ "${listing:0:1}" == "-" || "${listing:0:1}" == "d" ]] || fail "Release archives may contain only regular files and directories: $listing"
done < <(LC_ALL=C tar -tvzf "$archive")

install -d -m 0755 "$site_root/releases" "$staging"
tar -xzf "$archive" -C "$staging" --no-same-owner --no-same-permissions
[[ -s "$staging/index.html" ]] || fail "Release archive does not contain index.html at its root."
[[ -z "$(find "$staging" ! -type d ! -type f -print -quit)" ]] || fail "Release archive contains a special file."
[[ -z "$(find "$staging" -type f -links +1 -print -quit)" ]] || fail "Release archive must not contain hard-linked files."
find "$staging" -type d -exec chmod 0755 {} +
find "$staging" -type f -exec chmod 0644 {} +
mv -- "$staging" "$release"

previous_release="$(readlink -f "$current" 2>/dev/null || true)"
if [[ -f "$nginx_target" ]]; then cp -a -- "$nginx_target" "$nginx_backup"; fi
install -m 0644 "$nginx_config" "$nginx_target"
if ! nginx -t; then
  restore_nginx_config
  rm -rf -- "$release"
  fail "Nginx configuration test failed; previous configuration restored."
fi

if ! ln -s -- "$release" "$candidate_link" || ! mv -Tf -- "$candidate_link" "$current"; then
  restore_nginx_config
  rm -rf -- "$release"
  fail "Could not switch the current release; previous configuration restored."
fi
if ! reload_or_start_nginx; then
  rollback_activation
  fail "Nginx activation failed; previous release and configuration restored."
fi
if ! healthcheck; then
  rollback_activation
  fail "Post-deployment health check failed; previous release and configuration restored."
fi

rm -f -- "$nginx_backup"
rm -f -- "$archive" "$nginx_config"
if ! prune_old_releases; then warn "The deployment succeeded, but old releases could not be pruned safely."; fi
printf 'DEPLOYED_RELEASE=%s\n' "$release"
printf 'PREVIOUS_RELEASE=%s\n' "${previous_release:-none}"
printf 'KEPT_RELEASES=%s\n' "$(find "$site_root/releases" -mindepth 1 -maxdepth 1 -type d ! -name '*.staging.*' | wc -l)"
printf 'NGINX_STATE=%s\n' "$(systemctl is-active nginx)"
printf 'ROOT_SIZE=%s\n' "$(du -sh "$site_root" | awk '{print $1}')"
