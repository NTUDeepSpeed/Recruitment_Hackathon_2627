# 3. Baseline algorithms

Three working drivers ship in
[`race_ws/src/roboracer_baselines/`](../race_ws/src/roboracer_baselines/). They are
there to be read, raced and beaten. Get a baseline time first — then you know
whether your own ideas are actually helping.

```sh
ros2 run roboracer_baselines wall_follower
ros2 run roboracer_baselines gap_follower
ros2 run roboracer_baselines pure_pursuit
```

Score any of them exactly as the judges would:

```sh
./scripts/evaluate.sh --team baseline_gap \
    --driver-pkg roboracer_baselines --driver-exec gap_follower
```

Tunable defaults live in
[`config/baselines.yaml`](../race_ws/src/roboracer_baselines/config/baselines.yaml).

---

## 3.1 Wall follower

[`wall_follower.py`](../race_ws/src/roboracer_baselines/roboracer_baselines/wall_follower.py)

Hold a constant distance from one wall using a PID controller. Two LiDAR beams
— one straight out to the side, one angled forwards — give both the distance to
the wall and its angle. The controller steers on a point projected ahead of the
car rather than on the current error, which is the difference between tracking
the wall and oscillating about it.

**Good for:** proving your setup works. It is about 40 lines of real logic.

**Where it breaks:** it only knows about one wall. A hairpin, a gap in the
barrier, or a corner in the other direction and it drives straight on.

Tune `target_distance`, `kp`/`kd`, and `projection_distance`. If it wobbles,
raise `projection_distance` before you touch the gains.

---

## 3.2 Follow-the-gap with disparity extension

[`gap_follower.py`](../race_ws/src/roboracer_baselines/roboracer_baselines/gap_follower.py)

The strongest purely reactive approach, and a genuinely hard baseline to beat
on a tight circuit. Three ideas stacked up:

1. **Safety bubble.** Find the closest LiDAR return and blank out an arc around
   it. The car can then never aim at a point it would clip on the way to.
2. **Disparity extension.** Where the scan jumps from near to far, there is a
   corner the LiDAR can see past but the car cannot fit past. Pull the far side
   of the jump in by half a car width. This is the part that stops it clipping
   doorframes and apexes, and it is what separates a good gap follower from a
   naive one.
3. **Aim at the widest gap.** Not the single deepest beam — that makes the car
   twitch between two nearly identical directions — but the middle of the
   widest run of near-maximal readings.

Speed scales down with steering angle and with how short the gap ahead is.

**Where it breaks:** it has no memory and no plan. It brakes for a corner only
once it can see it, so it is always later on the brakes and earlier off the
throttle than it needs to be. On a fast, flowing circuit that costs a lot.

Worth tuning: `bubble_radius` (too small and it clips, too large and it refuses
gaps it would fit through), `disparity_threshold`, `car_half_width` — your real
safety margin — and the speed limits.

---

## 3.3 Pure pursuit along a racing line

[`pure_pursuit.py`](../race_ws/src/roboracer_baselines/roboracer_baselines/pure_pursuit.py)

**This is the one to study.** It is the shape of a competitive entry.

It loads a path, finds the point on it a lookahead distance ahead of the car,
and steers along the arc that reaches it:

```
curvature = 2 · y_local / L²
steering  = atan(wheelbase · curvature)
```

By default it follows
[`maps/icra26_centerline.csv`](../maps/icra26_centerline.csv), traced from the
map by `./scripts/track_tool.py centerline`.

**It drives the whole lap at one speed, and that is deliberate.** Knowing the
path means you know the curvature ahead of the car, so you can work out how
fast each part of it can be taken and start braking *before* a corner rather
than in it. That is most of the lap time and it is not written for you. A flat
`cruise_speed` has to be slow enough for the hairpins, which makes it far too
slow everywhere else — watch it crawl down the main straight and you will see
exactly what there is to win.

It uses `/ego_racecar/odom`, which the rules allow. That is not cheating; it is
the recommended starting point — see [§2.4](02-simulator.md#24-ground-truth-odometry--use-it).

**Where it breaks:** it follows its line and nothing else — put an obstacle
on that line and it drives into it. The line is the *centre* of the track,
which is not the fast way round: a racing line runs wide into a corner, clips
the apex and runs wide again, and is both shorter and faster. And the constant
speed means it is slow on every straight.

Worth doing, roughly in order of payoff:

1. **Give it a speed per point.** Compute the curvature of the path, cap
   cornering speed by the grip you can hold, then propagate the braking and
   acceleration limits around the loop so it slows down in time.
2. **Move the line.** Wide in, apex, wide out.
3. **Tune the lookahead.** Too short and it saws at the wheel; too long and it
   cuts every apex. `lookahead_gain` scales it with speed, which matters more
   once the speeds vary.

Feed it a line of your own with
`-p raceline_csv:=/hackathon/maps/my_line.csv`. If that CSV carries a speed
column in the `s; x; y; psi; kappa; vx; ax` layout, those speeds are used.

---

## 3.4 Where to go from here

Roughly in order of lap time gained per hour spent:

1. **Brake properly.** Most crashes are corner entry speed, not steering. Decide
   speed from the distance to what is ahead, not just from the current steering
   angle.

2. **Use your position.** You know exactly where you are. A reactive planner
   throws that away. Even a coarse "which section of the track am I in" lets you
   pick different behaviour for a straight and a hairpin.

3. **Build a real racing line.** The shipped centreline is the middle of the
   track; the fast line is not. Shift it wide on corner entry, tight at the
   apex, wide again on exit, and solve for the speed profile that goes with it.
   `scripts/track_tool.py` shows one way to pull a loop out of the map — from
   there it is an optimisation problem, and it is where the lap time is.

4. **Combine reactive and planned.** Follow a line when the track is clear,
   fall back to gap following when the LiDAR says the line is blocked.

5. **Write your own localisation.** Not required and genuinely hard, but worth
   bonus marks at the interview if you can explain it. A particle filter against
   `/map` using the LiDAR is the standard approach.

Before any of it: measure. Run `./scripts/evaluate.sh` after each change. An
idea that sounds better and is not shows up in the lap times immediately.

---

## 3.5 Or throw all of this away

Nothing obliges you to start from these baselines. **Replacing the approach
outright is encouraged, and earns bonus marks at the interview if you can
explain what you built and why.**

The environment supports it: ROS 2 Jazzy on Python 3.12, a GPU on the judging
machine, and any package you declare (rule 33). Some directions that fit:

- **Reinforcement learning.** The simulator is a Gymnasium environment, so you
  can train a policy directly against it, outside ROS, and then ship the
  weights and a thin inference node. Expect the hard parts to be reward
  shaping, the sim-to-judging gap, and keeping inference inside the control
  loop's budget.
- **Model predictive control.** Optimise steering and speed over a short
  horizon against the vehicle model every cycle. Principled, fast, and the
  tuning is honest work.
- **Imitation learning.** Drive well by some other means, record it, and train
  a policy to copy it. Cheap to get working, and it inherits whatever your
  teacher does badly.
- **Something else entirely.** Graph search over the occupancy grid,
  sampling-based planners, a hand-rolled optimiser. If you can explain it, it
  counts.

Two warnings worth taking seriously. A learned policy that cannot say *why* it
did something is hard to defend in an interview, and this is a recruitment
hackathon — rule 38 applies to a neural network exactly as it applies to an
`if` statement. And ambition is not scored: ten clean laps from a well-tuned
gap follower beats a half-trained policy that crashes out on lap three. Get
something finishing first, then get clever.

Whatever you build, put it behind `ros2 run team_driver driver` (rule 34) and
declare its dependencies (rule 33).

---

Next: **[4. Evaluation](04-evaluation.md)**
