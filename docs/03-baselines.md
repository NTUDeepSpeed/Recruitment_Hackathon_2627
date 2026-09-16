# 3. Baseline algorithms

Three working drivers ship in
[`race_ws/src/roboracer_baselines/`](../race_ws/src/roboracer_baselines/). They
are there to be read, raced and beaten. Get a baseline time first — then you
know whether your own ideas are actually helping.

```sh
ros2 run roboracer_baselines gap_follower
ros2 run roboracer_baselines wall_follower
ros2 run roboracer_baselines pure_pursuit    # needs a map; see §3.4
```

Tunable defaults live in
[`config/baselines.yaml`](../race_ws/src/roboracer_baselines/config/baselines.yaml).

---

## 3.0 First, the thing that is not an algorithm

Every one of these has a component Track 1 did not need, and it is in
[`control.py`](../race_ws/src/roboracer_baselines/roboracer_baselines/control.py)
rather than in any of them: a **speed controller**.

AutoDRIVE takes a normalised throttle, not a speed
([§2.4](02-simulator.md#24-the-control-interface-is-not-a-speed-request)). So
"slow to 2 m/s for this corner" is not something you can ask for. What the
baselines do is decide a *target* speed, and then:

```python
throttle = self.speed_controller.update(target_speed, measured_speed, dt)
self.vehicle.send(steering_rad, throttle)
```

`SpeedController` is feed-forward plus PI: the feed-forward carries most of the
load, because the throttle needed to hold a speed is roughly proportional to
it, and the PI trims what that model gets wrong. Two details in it are
deliberate and worth arguing with:

- **The integral is clamped.** One slow corner is otherwise enough to wind it
  up to the point where it holds the throttle open halfway down the next
  straight.
- **Small overspeeds lift rather than brake.** A scaled car with no ABS answers
  a negative throttle by locking its wheels, and a locked wheel steers nowhere
  at all. Braking hard is available — `max_brake` is not zero — it is just not
  the first response to being slightly fast.

It is basic on purpose. A better one is worth real lap time, and it is the
cheapest improvement on this list.

---

## 3.1 What they actually do on this circuit

Two full 10-lap runs on the compete circuit, with the defaults as shipped:

| | Run A | Run B |
| --- | ---: | ---: |
| Status | `COMPLETE` | `COMPLETE` |
| Fastest lap as driven | 21.235 s | **20.924 s** |
| Best lap as scored | 41.433 s | **50.924 s** |
| Collisions | 40 | 47 |
| Race time, before penalties | 221.1 s | 227.6 s |
| **Adjusted race time** | **621.1 s** | **697.6 s** |

Read the last two rows properly, because they are the whole lesson of this
track:

**the gap follower spends nearly twice as long in penalties as it does
driving.** About 225 seconds of racing and 400 to 470 seconds of collisions.
Halving its lap time would save 110 seconds. Stopping it touching anything
would save 430.

Notice also how different the two runs are: the same code, the same settings,
40 collisions one time and 47 the next, and a "best lap" nine seconds apart
because the penalties landed on different laps. The simulator is not
deterministic. That is why the judges take the best of three (rule 23), and why
a single run is not evidence that a change helped.

The wall follower and pure pursuit are not in that table on purpose:

| | |
| --- | --- |
| **Wall follower** (reactive, two LiDAR beams) | Drives, not competitive — §3.3 |
| **Pure pursuit** (follows a path) | Cannot run: there is no map yet — §3.4 |

So the first job is not speed. It is contact.

Score a baseline exactly as the judges would:

```sh
./scripts/evaluate.sh --team baseline_gap \
    --driver-pkg roboracer_baselines --driver-exec gap_follower
```

> These are our numbers on our machine, and they are a floor, not a target. We
> tuned eight configurations over a few hours; you have weeks.

---

## 3.2 Follow-the-gap with disparity extension

[`gap_follower.py`](../race_ws/src/roboracer_baselines/roboracer_baselines/gap_follower.py)

The strongest purely reactive approach, and the only baseline that needs
nothing but the LiDAR — which on this track, with no published map, makes it
the one that works today. Three ideas stacked up:

1. **Safety bubble.** Find the closest LiDAR return and blank out an arc around
   it. The car can then never aim at a point it would clip on the way to.
2. **Disparity extension.** Where the scan jumps from near to far, there is
   something the LiDAR can see past but the car cannot fit past. Pull the far
   side of the jump in by half a car width. **This matters more here than it
   did on Track 1**, because the boundary is a row of separate 33 cm air ducts
   rather than a wall: the scan is full of near/far jumps that look like
   openings and are not. Without this step the car drives between two ducts.
3. **Aim at the widest gap.** Not the single deepest beam — that makes the car
   twitch between two nearly identical directions — but the middle of the
   widest run of near-maximal readings.

Target speed scales down with steering angle and with how short the gap ahead
is, and then the speed controller turns that into throttle.

### The defaults are much tighter than they look, and that was measured

`car_half_width` is 0.30 m and `bubble_radius` is 0.30 m. Those look timid for
a 0.27 m car until you notice the corridor is only about 0.90 m wide.

We tried widening them, on the reasonable theory that more margin means fewer
collisions. It is worse on both counts. A `car_half_width` of 0.45 m claims an
envelope as wide as the entire track, after which disparity extension closes
off every gap the car might have driven through, the car has nowhere to aim,
and it crawls into things more slowly. Going the other way is worse too: at
0.22 m it clips ducts constantly.

Eight configurations, 2-lap runs:

| `car_half_width` / `bubble_radius` | Lap time | Collisions per lap |
| --- | ---: | ---: |
| 0.22 / 0.22 | 25.9 s | 8.5 |
| **0.30 / 0.30 (shipped)** | **21.4 s** | **2.5** |
| 0.45 / 0.55 | 32.2 s | 2.0 |
| 0.50 / 0.50 | 25.6 s | 4.7 |

There is a real optimum in there and we have probably not found it. That table
is also a fair picture of what tuning this feels like: the sensible-sounding
direction was wrong, and the only way to know was to run it.

One more thing it shows, and it is a trap worth naming: **two laps is not
enough to measure a collision rate.** The shipped configuration averages 2.5
collisions a lap over two laps and 4.0 over ten (§3.1). Short runs are for
iterating; judge a change on a full-length one before you believe it.

**Where it breaks:** it has no memory and no plan. It brakes for a corner only
once it can see it, and it can only see 10 m. On a 30 m circuit that means it
is always late on the brakes and early off the throttle.

Worth tuning: `car_half_width` and `bubble_radius` first — that is where the
collisions are — then `field_of_view`, then `disparity_threshold`, then the
speed limits.

---

## 3.3 Wall follower

[`wall_follower.py`](../race_ws/src/roboracer_baselines/roboracer_baselines/wall_follower.py)

Hold a constant distance from one wall using a PID controller. Two LiDAR beams
— one straight out to the side, one angled forwards — give both the distance to
the wall and its angle. The controller steers on a point projected ahead of the
car rather than on the current error, which is the difference between tracking
the wall and oscillating about it.

**Good for:** proving your setup works. It is about 40 lines of real logic, and
if it gets the car moving then the bridge, the QoS, your commands and the
workspace are all correct.

**Do not expect it to be competitive.** The algorithm assumes a continuous
surface to follow and this track does not have one: the boundary is spaced
ducts, so a beam aimed at "the wall" regularly passes between two of them and
reports something metres away. The controller then steers hard at a wall that
was never there. That is the algorithm, not the tuning.

It is shipped because watching it fail is the clearest possible argument for
disparity extension.

Tune `target_distance`, `kp`/`kd`, and `projection_distance`. If it wobbles,
raise `projection_distance` before you touch the gains.

---

## 3.4 Pure pursuit along a racing line

[`pure_pursuit.py`](../race_ws/src/roboracer_baselines/roboracer_baselines/pure_pursuit.py)

**This is the one to study, and right now it will not start.**

It loads a path, finds the point on it a lookahead distance ahead of the car,
and steers along the arc that reaches it:

```
curvature = 2 · y_local / L²
steering  = atan(wheelbase · curvature)
```

That needs a path, and a path needs a map, and **the compete circuit does not
ship with one** — the simulator carries the track as Unity geometry, not as an
occupancy grid. So the node refuses to start and tells you so. See
[maps/README.md](../maps/README.md) and
[§2.9](02-simulator.md#29-the-map-that-is-not-here).

That is not a gap in the environment; it is the interesting part of this track.
Getting pure pursuit running means first getting a map, and there are two
honest routes:

1. **Wait for the organisers' grid**, then trace a centreline:
   ```sh
   ./scripts/track_tool.py centerline
   ```
2. **Build your own.** Drive a lap with the gap follower, record the LiDAR and
   the pose, and run SLAM over the bag. Worth bonus marks at the interview.

Once you have a line, point the node at it:

```sh
ros2 run roboracer_baselines pure_pursuit --ros-args \
    -p raceline_csv:=/hackathon/maps/my_line.csv
```

**It drives the whole lap at one target speed, and that is deliberate.** Knowing
the path means you know the curvature ahead of the car, so you can work out how
fast each part of it can be taken and start braking *before* a corner rather
than in it. That is most of the lap time and it is not written for you. A flat
`cruise_speed` has to be slow enough for the tightest corner, which makes it far
too slow everywhere else.

Worth doing, roughly in order of payoff:

1. **Give it a speed per point.** Compute the curvature of the path, cap
   cornering speed by the grip you can hold, then propagate the braking and
   acceleration limits around the loop so it slows down in time. Remember the
   result is still a *target* — the speed controller has to be good enough to
   follow it.
2. **Move the line.** A centreline is not a racing line: wide in, apex, wide
   out, which is both shorter and faster.
3. **Tune the lookahead.** Too short and it saws at the wheel; too long and it
   cuts every apex.

If your CSV carries a speed column in the `s; x; y; psi; kappa; vx; ax` layout,
those speeds are used.

**Where it breaks:** it follows its line and nothing else — put an obstacle on
that line and it drives into it. On a circuit the organisers describe as
possibly carrying "bifurcations and obstacles", that is not hypothetical.

---

## 3.5 Where to go from here

Roughly in order of lap time gained per hour spent:

1. **Stop hitting things.** Worth 10 s a time — about half a lap — against a
   21 s lap. Nothing else on this list comes close. Most contact is corner
   entry speed, not steering:
   decide speed from the distance to what is ahead, not just from the steering
   angle you are already holding.

2. **Close the speed loop properly.** The shipped controller is feed-forward
   plus PI with no model of the corner you are entering. Anything better is
   free lap time on every straight.

3. **Use your position.** You know exactly where you are. A reactive planner
   throws that away. Even a coarse "which section of the track am I in" lets
   you pick different behaviour for a straight and a chicane — and on a circuit
   you can only see 10 m of, memory is worth more than it was on Track 1.

4. **Build a map, then a racing line.** This is the big one and it is two
   projects: SLAM the circuit from a recorded lap, then solve for the fast way
   round it. Both are worth bonus marks and both are defensible in an
   interview.

5. **Combine reactive and planned.** Follow a line when the track is clear,
   fall back to gap following when the LiDAR says the line is blocked. On a
   circuit that may contain obstacles, this is the robust answer.

6. **Write your own localisation.** Not required — the simulator gives you
   ground truth and the rules allow it ([§2.3](02-simulator.md#23-the-restricted-topics-and-what-this-hackathon-does-about-them))
   — but worth bonus marks if you can explain it. Harder here than on Track 1,
   because you need a map before you can localise against one.

Before any of it: measure. Run `./scripts/evaluate.sh` after each change. An
idea that sounds better and is not shows up in the times immediately — as our
own tuning table in §3.2 demonstrates.

---

## 3.6 Or throw all of this away

Nothing obliges you to start from these baselines. **Replacing the approach
outright is encouraged, and earns bonus marks at the interview if you can
explain what you built and why.**

The environment supports it: ROS 2 Humble on Python 3.10, a GPU on the judging
machine, and any package you declare (rule 37). Some directions that fit:

- **Reinforcement learning.** The AutoDRIVE bridge is a normal ROS interface,
  so you can wrap it as a Gymnasium environment and train against the simulator
  directly. Expect the hard parts to be reward shaping, wall-clock training
  time — the simulator runs in real time, unlike a stepped gym — and keeping
  inference inside the control loop's budget. Training on the *practice* build
  and racing on *compete* is also exactly the generalisation problem ICRA set.
- **Model predictive control.** Optimise throttle and steering over a short
  horizon against the vehicle model every cycle. The vehicle parameters are all
  published in [§2.10](02-simulator.md#210-vehicle-and-sensor-specifications),
  so the model is available to you. Principled, fast, and the tuning is honest
  work.
- **Imitation learning.** Drive well by some other means, record it, and train
  a policy to copy it. Cheap to get working, and it inherits whatever your
  teacher does badly.
- **Something else entirely.** Graph search over a grid you built,
  sampling-based planners, a hand-rolled optimiser. If you can explain it, it
  counts.

Two warnings worth taking seriously. A learned policy that cannot say *why* it
did something is hard to defend in an interview, and this is a recruitment
hackathon — rule 42 applies to a neural network exactly as it applies to an
`if` statement. And ambition is not scored: ten clean laps from a well-tuned
gap follower beats a half-trained policy that crashes out on lap three,
especially at +10 s a collision. Get something finishing first, then get clever.

Whatever you build, put it behind `ros2 run team_driver driver` (rule 38) and
declare its dependencies (rule 37).

---

Next: **[4. Evaluation](04-evaluation.md)**
