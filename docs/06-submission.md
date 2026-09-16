# 6. Submission

**Deadline: 18 October 2026, 23:59 (SGT).**

---

## 6.1 What to submit

A git repository containing this repository plus your work, with:

1. Your driver in `race_ws/src/team_driver/`, runnable as
   `ros2 run team_driver driver`.
2. Any extra packages declared in
   `race_ws/src/team_driver/requirements.txt` (pip) and
   `race_ws/src/team_driver/apt-packages.txt` (apt). Declared packages get
   installed into the image; undeclared ones will not exist during judging.
3. Anything you built offline — an occupancy grid, a racing line, trained
   weights — committed alongside, plus the code that produced it (rule 36).
4. A `SUBMISSION.md` at the repository root (template in §6.3).
5. Nothing else changed in the judging environment or the AutoDRIVE Devkit —
   verify with `./scripts/verify_judging_env.sh`.

Do **not** commit `results/`, `simulator/`, `race_ws/build/`,
`race_ws/install/` or `race_ws/log/`. The `.gitignore` already handles this.
The simulator in particular is 140 MB of binary that everyone fetches with
`./scripts/fetch_simulator.sh`; committing it will make your repository
unusable rather than helpful.

### Model weights

If your entry is a learned policy, the weights have to be in the repository —
there is no network access during a judged run. Keep them to something
reasonable; if they are large enough that Git LFS is the only sane answer, say
so in `SUBMISSION.md` and check the judges can clone it.

---

## 6.2 How to submit

1. Fork this repository, or push a branch to the repository the organisers gave
   your team.
2. Push everything before the deadline.
3. Send the organisers your repository URL and the branch name.

### Test from a clean clone first

This is the single most common way to lose points. Your machine has state your
submission does not.

```sh
cd /tmp
git clone <your repo url> submission_test
cd submission_test
./scripts/fetch_simulator.sh
./install/linux/setup.sh --no-cache   # picks up your declared packages
./install/linux/run.sh
# inside the container
cd /hackathon/race_ws && colcon build --symlink-install && source install/local_setup.bash
exit
./scripts/evaluate.sh --team clean_clone_test --runs 1
```

`--no-cache` matters if you declared any packages: it proves they install from
scratch and that they did not break the devkit's websocket stack. The build
fails loudly if they did — and read rule 37 before you pin anything named
`socketio`, `engineio` or `gevent`.

If that produces a `COMPLETE` result, your entry will run on judging day.

Pushing runs the same thing on GitHub Actions and writes the result to the
workflow summary — see
[§4.6](04-evaluation.md#46-automated-judging-on-every-push). Check it is green
before you tell us you are done.

---

## 6.3 `SUBMISSION.md` template

```markdown
# Team <name>

## Members
| Name | Matric number | Email |
| --- | --- | --- |
| ... | ... | ... |

## Approach
Two or three paragraphs: what your driver does, why you chose it, what you
tried that did not work.

## How it uses the inputs
- LiDAR: ...
- Pose: ... (say whether you used the simulator's ground truth or your own
  localisation)
- Camera / IMU / encoders: ... (or "not used")

## Speed control
How you turn a desired speed into a throttle command, and how well it holds.
"We used the shipped SpeedController unchanged" is a perfectly good answer —
just say so.

## Results on our own machine
| Best lap | 10-lap total | Collisions | Runs attempted |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

## Anything precomputed
A map, a racing line, trained weights. What is computed offline, which script
produces it, and how to regenerate it from scratch. For trained weights, say
how they were trained as well — environment or dataset, reward or loss, roughly
how long, and how you decided the result was good. That description is what we
discuss at the interview, not the weights themselves.

## Dependencies we added
Everything in `requirements.txt` / `apt-packages.txt`, with one line each on
what it is for. Write "none" if you added nothing.

| Package | pip or apt | What we use it for |
| --- | --- | --- |
| ... | ... | ... |

## Third-party code and references
Papers, repositories, blog posts you took ideas or code from.

## AI assistance
Which tools you used and for what. This is permitted — we ask so the interview
can focus on the parts you wrote yourself.

## Known issues
Where it breaks, and what you would do next with more time.
```

---

## 6.4 The interview

Every team is interviewed after the race. Expect roughly 30 minutes.

**What we ask about:**

- Walk us through your driver, in your own words.
- Why that approach and not the others?
- What does this parameter do, and what happens if we double it?
- Show us a change you made that did not work, and how you knew.
- If any of it is learned: how did you train it, why that way, and how do you
  know it works?
- How does your throttle become a speed? What happens when it is wrong?
- How would you handle a track twice as fast? An obstacle mid-corner?
- You have never seen this circuit. What in your design made that survivable?

That last one is the question this track exists to ask. The compete circuit was
unseen by everyone, so an entry that generalises is worth more than one tuned
to death against something else.

**Any member may be asked about any part of the code.** Splitting the work is
fine; not knowing what your teammates built is not.

**Bonus marks** are available for replacing the algorithm outright (RL, MPC,
imitation learning), mapping the circuit yourself, your own localisation,
runtime racing-line generation, a real speed controller, and clear
engineering — see [rule 45](05-rules.md#59-interview-and-bonus-marks). These
affect the recruitment decision, not the leaderboard.

---

## 6.5 Submission checklist

- [ ] 3 to 5 members, all named in `SUBMISSION.md`
- [ ] `ros2 run team_driver driver` works from a clean clone
- [ ] Any extra packages declared in `requirements.txt` / `apt-packages.txt`
      **and** listed in `SUBMISSION.md`
- [ ] Nothing pinned that clashes with the devkit's websocket stack (rule 37)
- [ ] `./install/<os>/setup.sh --no-cache` succeeds from clean if you declared any
- [ ] `./scripts/verify_judging_env.sh` reports the environment intact
- [ ] `./scripts/evaluate.sh --team <team> --runs 1` gives `COMPLETE`
- [ ] The **Judge** workflow is green on your submitted branch
- [ ] No build artefacts, result files or the simulator committed
- [ ] Anything precomputed is committed, with the code that generated it
- [ ] `SUBMISSION.md` filled in, including AI usage and attributions
- [ ] Pushed, and the URL sent to the organisers, before 18 Oct 2026 23:59 SGT

---

Next: **[7. ROS 2 primer](07-workshop.md)**
