# maps/

**Nothing in this directory is used to score a run.** The AutoDRIVE Simulator
owns the circuit, the start/finish line, the lap counter and the collision
detection, and publishes all of it over the devkit bridge. The referee reads
that telemetry. See [docs/04-evaluation.md](../docs/04-evaluation.md).

What is here is for *your* planning.

| File | What it is |
| --- | --- |
| `tracks.yaml` | Track metadata: the name in your result file, and where the map lives once it exists |
| `icra26_compete.pgm` + `.yaml` | Occupancy grid of the compete circuit — **published separately by the organisers** |
| `icra26_compete_centerline.csv` | Traced from the grid by `scripts/track_tool.py centerline` |

## The map is not in the simulator download

The AutoDRIVE Simulator ships the circuit as Unity geometry, not as an
occupancy grid. If you want to plan against a grid — a racing line, a particle
filter, a graph search — you need one, and there are two ways to get it:

1. **Wait for ours.** The organisers publish `icra26_compete.pgm` and its
   `.yaml` here and announce it in the team channel. Pull and it appears.
2. **Build your own.** Drive the circuit, record `/autodrive/roboracer_1/lidar`
   and `/autodrive/roboracer_1/ips`, and run SLAM over the bag. That is real
   work and it is worth bonus marks at the interview if you can explain it —
   see [rule 45](../docs/05-rules.md).

Until a grid exists here, `./scripts/track_tool.py validate` reports the map as
not yet published and exits cleanly, and `pure_pursuit` refuses to start with a
message saying the same. Neither is a broken environment; a scored run does not
touch this directory.

## Adding your own

Drop any `<name>.pgm` + `<name>.yaml` pair in here and point a tool at it.
`pure_pursuit` takes a path CSV directly:

```sh
ros2 run roboracer_baselines pure_pursuit --ros-args \
    -p raceline_csv:=/hackathon/maps/my_line.csv
```

Files you add here are yours and are not checked by
`./scripts/verify_judging_env.sh` — unlike `tracks.yaml`, which is.
