# syntax=docker/dockerfile:1
#
# NTU DeepSpeed Recruitment Hackathon 26/27 - Track 1 (RoboRacer)
#
# ROS 2 Jazzy on Ubuntu 24.04 (Python 3.12), the JAX-based f1tenth_gym, and the
# judging environment. Everything is vendored in this repository (see
# external/, added as git submodules), so the build clones nothing.
#
# The build context is the REPOSITORY ROOT, not this directory:
#     docker build -f docker/Dockerfile -t roboracer_track1 .
# or just use the setup script for your platform, e.g. install/linux/setup.sh
#
# Portions derived from f1tenth_gym_ros (MIT, Copyright (c) 2020 Hongrui Zheng).

ARG ROS_DISTRO=jazzy
FROM ros:${ROS_DISTRO}

SHELL ["/bin/bash", "-c"]

ENV DEBIAN_FRONTEND=noninteractive \
    ROS_DISTRO=jazzy \
    SIM_WS=/sim_ws \
    RACE_WS=/hackathon/race_ws \
    PYTHONUNBUFFERED=1 \
    PIP_BREAK_SYSTEM_PACKAGES=1 \
    JAX_PLATFORMS=cpu

# PIP_BREAK_SYSTEM_PACKAGES: Ubuntu 24.04 marks the system Python externally
#   managed (PEP 668). The container is the isolation layer, so install into it
#   directly - colcon entry points run /usr/bin/python3 and would not see a venv.
# JAX_PLATFORMS: keep the simulator on the CPU. It is small enough that the GPU
#   buys nothing, and CPU execution keeps a judged run reproducible.

# ---------------------------------------------------------------------------
# 1. System dependencies
#
# Listed explicitly rather than left to rosdep, so a failure names the package
# that is missing instead of dying inside a resolver.
# ---------------------------------------------------------------------------
RUN set -euxo pipefail; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends \
        build-essential \
        git \
        libeigen3-dev \
        nano \
        python3-dev \
        python3-pip \
        tmux \
        vim \
        ros-${ROS_DISTRO}-ackermann-msgs \
        ros-${ROS_DISTRO}-foxglove-bridge \
        ros-${ROS_DISTRO}-joint-state-publisher \
        ros-${ROS_DISTRO}-nav2-lifecycle-manager \
        ros-${ROS_DISTRO}-nav2-map-server \
        ros-${ROS_DISTRO}-robot-state-publisher \
        ros-${ROS_DISTRO}-rviz2 \
        ros-${ROS_DISTRO}-teleop-twist-keyboard \
        ros-${ROS_DISTRO}-xacro \
        libxcb-cursor0 libxcb-icccm4 libxcb-keysyms1 libxcb-shape0 \
        libxcb-randr0 libxcb-render-util0 libxcb-xinerama0 libxkbcommon-x11-0 \
        libgl1 libegl1 libopengl0 libgl1-mesa-dri xvfb; \
    rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# 2. f1tenth_gym (vendored submodule -> editable install)
#
# Editable because the gym writes downloaded tracks back into its own package
# directory. Installed outside /sim_ws/src and /hackathon so that neither the
# workspace build nor the bind mount can shadow it.
# ---------------------------------------------------------------------------
RUN pip3 install --no-cache-dir --ignore-installed pip

COPY external/f1tenth_gym /opt/f1tenth_gym
RUN set -euxo pipefail; \
    test -f /opt/f1tenth_gym/pyproject.toml \
      || { echo "ERROR: external/f1tenth_gym is empty. Run: git submodule update --init --recursive" >&2; exit 1; }; \
    pip3 install --no-cache-dir --ignore-installed -e /opt/f1tenth_gym; \
    python3 -c "import f1tenth_gym; print('f1tenth_gym import OK')"

# ---------------------------------------------------------------------------
# 3. The ROS bridge
#
# This branch publishes /ego_racecar/collision, and /clock when
# use_sim_time_bridge is set. Those are exactly the hooks judging needs, so
# unlike the old Foxy setup this repository patches nothing - the greps below
# turn "upstream dropped a hook" into a failed build rather than a silent
# mis-scored race.
# ---------------------------------------------------------------------------
COPY external/f1tenth_gym_ros ${SIM_WS}/src/f1tenth_gym_ros
RUN set -euxo pipefail; \
    bridge=${SIM_WS}/src/f1tenth_gym_ros/f1tenth_gym_ros/gym_bridge.py; \
    test -f ${SIM_WS}/src/f1tenth_gym_ros/package.xml \
      || { echo "ERROR: external/f1tenth_gym_ros is empty. Run: git submodule update --init --recursive" >&2; exit 1; }; \
    grep -q "collision_pub" "${bridge}" \
      || { echo "ERROR: this bridge does not publish collisions; judging needs it." >&2; exit 1; }; \
    grep -q "use_sim_time_bridge" "${bridge}" \
      || { echo "ERROR: this bridge does not publish /clock; judging needs it." >&2; exit 1; }; \
    echo "Judging hooks verified."

# ---------------------------------------------------------------------------
# 4. The circuit
# ---------------------------------------------------------------------------
COPY maps ${SIM_WS}/src/f1tenth_gym_ros/maps/hackathon
RUN set -euxo pipefail; \
    test -f ${SIM_WS}/src/f1tenth_gym_ros/maps/hackathon/icra26.pgm; \
    test -f ${SIM_WS}/src/f1tenth_gym_ros/maps/hackathon/tracks.yaml; \
    echo "Hackathon circuit installed."

# ---------------------------------------------------------------------------
# 5. Build the simulator workspace
# ---------------------------------------------------------------------------
RUN set -euxo pipefail; \
    source /opt/ros/${ROS_DISTRO}/setup.bash; \
    cd ${SIM_WS}; \
    colcon build --symlink-install; \
    test -f ${SIM_WS}/install/local_setup.bash

# ---------------------------------------------------------------------------
# 6. Shell environment
# ---------------------------------------------------------------------------
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN set -euxo pipefail; \
    chmod +x /usr/local/bin/entrypoint.sh; \
    printf '%s\n' \
      '# --- roboracer hackathon ---' \
      'source /opt/ros/jazzy/setup.bash' \
      '[ -f /sim_ws/install/local_setup.bash ] && source /sim_ws/install/local_setup.bash' \
      '[ -f /hackathon/race_ws/install/local_setup.bash ] && source /hackathon/race_ws/install/local_setup.bash' \
      'export ROS_DOMAIN_ID=${ROS_DOMAIN_ID:-0}' \
      'cd /hackathon 2>/dev/null || true' \
      >> /root/.bashrc

# ---------------------------------------------------------------------------
# 7. Team-declared dependencies
#
# Extra packages are allowed as long as they are declared (rule 32). These two
# files are the declaration, and this step is what makes them real.
#
# Deliberately LAST: editing either file rebuilds one small layer rather than
# the whole image, so judges can rebuild per submission in seconds.
# ---------------------------------------------------------------------------
COPY race_ws/src/team_driver/apt-packages.txt \
     race_ws/src/team_driver/requirements.txt \
     /opt/team-deps/
RUN set -euxo pipefail; \
    apt_list="$(grep -vE '^[[:space:]]*(#|$)' /opt/team-deps/apt-packages.txt || true)"; \
    if [ -n "${apt_list}" ]; then \
        echo "Installing team-declared apt packages: ${apt_list}"; \
        apt-get update -qq; \
        apt-get install -y --no-install-recommends ${apt_list}; \
        rm -rf /var/lib/apt/lists/*; \
    else \
        echo "No team apt packages declared."; \
    fi; \
    if grep -qvE '^[[:space:]]*(#|$)' /opt/team-deps/requirements.txt; then \
        echo "Installing team-declared pip packages:"; \
        grep -vE '^[[:space:]]*(#|$)' /opt/team-deps/requirements.txt; \
        pip3 install --no-cache-dir -r /opt/team-deps/requirements.txt; \
    else \
        echo "No team pip packages declared."; \
    fi; \
    python3 -c "import f1tenth_gym" \
      || { echo "ERROR: a declared package broke the simulator's Python environment." >&2; exit 1; }

WORKDIR /hackathon
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]
