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
3. A `SUBMISSION.md` at the repository root (template in §6.3).
4. Nothing else changed in the judging environment — verify with
   `./scripts/verify_judging_env.sh`.

Do **not** commit `results/`, `race_ws/build/`, `race_ws/install/` or
`race_ws/log/`. The `.gitignore` already handles this.

---

## 6.2 How to submit

1. Fork this repository, or push a branch to the repository the organisers gave
   your team.
2. Keep the submodules intact — do not delete `external/` or commit its
   contents directly. A fresh
   `git clone --recurse-submodules` of your entry must give the judges a working
   repository.
3. Push everything before the deadline.
4. Send the organisers your repository URL and the branch name.

### Test from a clean clone first

This is the single most common way to lose points. Your machine has state your
submission does not.

```sh
cd /tmp
git clone --recurse-submodules <your repo url> submission_test
cd submission_test
./install/linux/setup.sh --no-cache   # picks up your declared packages
./install/linux/run.sh
# inside the container
cd /hackathon/race_ws && colcon build --symlink-install && source install/local_setup.bash
exit
./scripts/evaluate.sh --team clean_clone_test --runs 1 --headless
```

`--no-cache` matters if you declared any packages: it proves they install from
scratch and that they did not break the simulator. The build fails loudly if
they did.

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
- Odometry: ... (say whether you used ground truth or your own localisation)
- Map: ...

## Results on our own machine
| Best lap | 10-lap total | Collisions | Runs attempted |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

## Anything precomputed
What is computed offline, which script produces it, and how to regenerate it.

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
- How would you handle a track twice as fast? An obstacle mid-corner?

**Any member may be asked about any part of the code.** Splitting the work is
fine; not knowing what your teammates built is not.

**Bonus marks** are available for replacing the algorithm outright (RL, MPC,
imitation learning — anything beyond tuning the baselines), your own
localisation, runtime racing-line generation, and clear engineering — see
[rule 41](05-rules.md#59-interview-and-bonus-marks). These affect the
recruitment decision, not the leaderboard.

---

## 6.5 Submission checklist

- [ ] 3 to 5 members, all named in `SUBMISSION.md`
- [ ] `ros2 run team_driver driver` works from a clean clone
- [ ] Any extra packages declared in `requirements.txt` / `apt-packages.txt`
      **and** listed in `SUBMISSION.md`
- [ ] `./install/<os>/setup.sh --no-cache` succeeds from clean if you declared any
- [ ] `./scripts/verify_judging_env.sh` reports the environment intact
- [ ] `./scripts/evaluate.sh --team <team> --runs 1` gives `COMPLETE`
- [ ] The **Judge** workflow is green on your submitted branch
- [ ] No build artefacts or result files committed
- [ ] `SUBMISSION.md` filled in, including AI usage and attributions
- [ ] Pushed, and the URL sent to the organisers, before 18 Oct 2026 23:59 SGT

---

Next: **[7. ROS 2 primer](07-workshop.md)**
