#!/usr/bin/env bash
#
# Check that the judging environment is untouched.
#
# Rule 28 says not to modify the judging environment. This makes that checkable
# rather than a matter of trust: it hashes every file the judges rely on and
# compares against a manifest, and looks for files added into those directories.
#
#   ./scripts/verify_judging_env.sh           # check (what the judges run)
#   ./scripts/verify_judging_env.sh --update  # regenerate the manifest (organisers)
#
# Teams: run this before you submit. A clean report means your entry will be
# judged; a modified referee or Dockerfile will not be.
#
set -euo pipefail
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../install" && pwd)/common.sh"

MANIFEST="${REPO_ROOT}/scripts/judging_manifest.sha256"

# Everything a scored run depends on. team_driver and the docs are absent on
# purpose: those are yours to change.
#
# Note what is NOT here: maps/ as a directory. Only maps/tracks.yaml is
# protected, because the rest of that folder is where you put a racing line or
# an occupancy grid of your own, and those are yours. On Track 2 the map is not
# part of judging at all - the simulator is - so there is nothing to protect.
#
# external/autodrive_devkit IS here. Rule 29 of the AutoDRIVE competition
# forbids modifying the devkit, and the hackathon keeps that rule, so the
# vendored copy is hashed like anything else in the judging environment.
PROTECTED_PATHS=(
    "race_ws/src/roboracer_referee"
    "external/autodrive_devkit"
    "docker/Dockerfile"
    "docker/entrypoint.sh"
    "docker/devkit-requirements.txt"
    "docker/docker-compose.yml"
    "docker/docker-compose.gpu.yml"
    "maps/tracks.yaml"
    "scripts/evaluate.sh"
    "scripts/fetch_simulator.sh"
    "scripts/run_simulator.sh"
    "scripts/leaderboard.py"
    "scripts/track_tool.py"
    "scripts/detect_submission.sh"
    "scripts/template_manifest.sha256"
    ".github/workflows"
    "install/common.sh"
    "install/linux"
    "install/macos"
    "install/windows"
)

UPDATE=0
for arg in "$@"; do
    case "${arg}" in
        --update) UPDATE=1 ;;
        -h|--help) print_header_usage "$0"; exit 0 ;;
        *) die "Unknown argument: ${arg}" ;;
    esac
done

command -v sha256sum >/dev/null 2>&1 || die "sha256sum is not available on this system."

list_protected_files() {
    local path
    for path in "${PROTECTED_PATHS[@]}"; do
        if [ -d "${REPO_ROOT}/${path}" ]; then
            find "${REPO_ROOT}/${path}" -type f \
                ! -name '*.pyc' ! -path '*/__pycache__/*' -print
        elif [ -f "${REPO_ROOT}/${path}" ]; then
            printf '%s\n' "${REPO_ROOT}/${path}"
        fi
    done | sed "s|^${REPO_ROOT}/||" | LC_ALL=C sort
}

generate_manifest() {
    ( cd "${REPO_ROOT}" && list_protected_files | tr '\n' '\0' | xargs -0 sha256sum )
}

if [ "${UPDATE}" = "1" ]; then
    info "Regenerating the judging manifest."
    generate_manifest > "${MANIFEST}"
    ok "Wrote $(wc -l < "${MANIFEST}") file hashes to ${MANIFEST}"
    exit 0
fi

[ -f "${MANIFEST}" ] || die "No manifest at ${MANIFEST}. An organiser must run --update first."

failures=0
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

info "Checking protected files against the manifest."
if ( cd "${REPO_ROOT}" && sha256sum --check "${MANIFEST}" ) > "${work}/check" 2>&1; then
    ok "All $(wc -l < "${MANIFEST}") protected files match."
else
    failures=1
    printf '%s\n' "${_C_RED}The following judging files have been modified or removed:${_C_OFF}" >&2
    grep -v ': OK$' "${work}/check" | grep -v '^sha256sum: WARNING' | sed 's/^/  /' >&2
fi

# Files added into a protected directory would pass the hash check by simply
# not being in the manifest, so look for those separately.
info "Checking for files added to protected directories."
extra="$(comm -13 <(cut -d' ' -f3- "${MANIFEST}" | LC_ALL=C sort) \
                  <(cd "${REPO_ROOT}" && list_protected_files) || true)"
if [ -n "${extra}" ]; then
    failures=1
    printf '%s\n' "${_C_RED}Unexpected files inside the judging environment:${_C_OFF}" >&2
    printf '%s\n' "${extra}" | sed 's/^/  /' >&2
else
    ok "No unexpected files."
fi

echo
if [ "${failures}" = "0" ]; then
    ok "Judging environment is intact."
    exit 0
fi

cat >&2 <<'MSG'
The judging environment does not match the official one.

If you changed these files by accident, restore them:
    git checkout -- race_ws/src/roboracer_referee external/autodrive_devkit \
                    docker maps/tracks.yaml scripts install

If you changed them on purpose, move your work into race_ws/src/team_driver
before submitting. Entries that modify the judging environment are not scored.
MSG
exit 1
