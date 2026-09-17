# NTU DeepSpeed Recruitment Hackathon 26/27

**Drive fast. Don't crash.**

Write the software that drives a 1/10-scale racing car around a circuit it has
never seen, as fast as it can, without hitting anything. Two tracks, two
simulators, one problem.

> **Documentation: <https://ntudeepspeed.github.io/Recruitment_Hackathon_2627/>**
>
> **Register your team: <https://forms.cloud.microsoft/r/70KfZ1by9b>** —
> registration closes **24 September 2026, 23:59 (SGT)**
>
> **Submission deadline: 18 October 2026, 23:59 (SGT)**

This branch is the front door. It holds the landing page and the generator that
builds it — **no hackathon code lives here.** Pick a track below and check out
its branch.

---

## Pick a track

| | **Track 1** | **Track 2** |
| --- | --- | --- |
| Branch | [`track1`](../../tree/track1) | [`track2`](../../tree/track2) |
| Guide | [Track 1 docs](https://ntudeepspeed.github.io/Recruitment_Hackathon_2627/track1/) | [Track 2 docs](https://ntudeepspeed.github.io/Recruitment_Hackathon_2627/track2/) |
| Simulator | `f1tenth_gym` + ROS 2 bridge | AutoDRIVE — a Unity binary you download |
| Control | `AckermannDriveStamped` — ask for a speed | `Float32` throttle in [−1, 1] — ask for torque |
| LiDAR | 819 beams, 270°, 25 m | 1080 beams, 270°, 10 m, 40 Hz, plus IMU, encoders and a camera |
| Circuit | `icra26`, 17 × 18 m, 78 m a lap | ICRA 2026 compete circuit, 6.3 × 18.2 m, 54 m a lap |
| Lap timing | Our referee, against a finish line | The simulator's own clock |
| Install | `git clone --recurse-submodules` | Plain clone, then `./scripts/fetch_simulator.sh` |

Track 2 runs the **compete** phase of the
[RoboRacer Sim Racing League @ ICRA 2026](https://autodrive-ecosystem.github.io/competitions/roboracer-sim-racing-icra-2026/)
— the same vehicle, sensors, circuit and devkit the ICRA teams raced. The big
difference from Track 1 is the control interface: there is no speed controller
between your node and the motor, so closing that loop is your problem.

```sh
git clone https://github.com/NTUDeepSpeed/Recruitment_Hackathon_2627.git
cd Recruitment_Hackathon_2627

git checkout track1   # or track2
```

Then follow chapter 1 of that track's guide.

---

## The same for both

The full rules are in chapter 6 of your track's guide and they are what counts.
The short version:

- **Teams of 3 to 5.** One team per person. The roster is fixed at submission.
- **Register by 24 September 2026, 23:59 SGT** —
  [one form per team](https://forms.cloud.microsoft/r/70KfZ1by9b). You can
  start reading, and building, before you send it.
- **Deadline: 18 October 2026, 23:59 SGT.** Late entries are not scored.
- **Score out of 100** — 50 for your fastest single lap, 50 for your 10-lap
  total, both relative to the fastest team.
- **+10 s on the lap per collision.** More than 10 collisions is a
  disqualification.
- **Ground-truth pose is allowed and recommended.** Replacing it with your own
  localisation earns bonus marks at the interview.
- **AI assistants are allowed.** You will be asked to explain your code, so do
  not submit anything you cannot defend.
- **Every push races on GitHub Actions** and writes the result to the workflow
  summary.

Judging runs on one machine — i9-14900HX, 32 GB, RTX 5060 Laptop — and times
come from the simulator's clock, so your own hardware does not affect your
score.

---

## The documentation site

`docs-site/` renders `README.md` and `docs/*.md` from **both** track branches
into one static site and publishes it to the `gh-pages` branch, which GitHub
Pages serves.

The prose stays plain Markdown on the track branches, so it reads correctly on
GitHub too. The site is a build artefact and is never committed to a source
branch.

```
docs-site/
├── build.py           The generator
├── check_links.py     Fails CI on a broken cross-chapter link or anchor
├── site.json          Landing-page copy — tracks, stats, chapter notes
├── requirements.txt   markdown + Pygments
├── templates/         Page shells with {{SLOT}} placeholders
├── theme/
│   ├── tokens.css     DeepSpeed design system, vendored verbatim
│   ├── docs.css       Docs components, built on those tokens
│   └── app.js         Theme toggle, drawer, copy buttons, scrollspy
└── static/            Favicon and anything else copied as-is
```

### The platform switch

The site carries a Linux / macOS / Windows switch, and every documented command
follows it. Two things drive it, both detected from the prose — **no special
Markdown syntax, and nothing to maintain by hand**:

- Any `install/<platform>/…` path in a command becomes all three variants, and
  CSS shows the one for the reader's platform. Copy buttons give the right
  command because `innerText` skips what is hidden.
- A run of consecutive per-platform `###` headings (as under *1.2 Install
  Docker*) becomes one switchable group, and the contents list follows it.
- A heading that names its platforms in brackets — *1.6 Running the simulator
  on your host (macOS, Windows)* — gets a note telling everyone else they can
  skip it. The section stays visible, because the prose cross-references these
  by number.

Nothing is rewritten at run time: every variant ships in the HTML, so the page
is correct before the JavaScript loads. The choice is remembered per reader,
and defaults to the OS they appear to be on. The switch sits in the header at
every width, and again in the sidebar, in the landing hero and beside the
per-platform sections.

The stylesheet and the script are published under a content hash
(`docs.<hash>.css`). GitHub Pages serves everything with `max-age=600`, so
without that a returning reader could hold a ten-minute-stale stylesheet
against fresh HTML — which is exactly how a CSS-driven feature looks broken.

Keep writing the Markdown for a GitHub reader, who has no switch. A line like
`./install/linux/setup.sh  # or install/macos, …` is right there and the site
hides the redundant half.

### Build it locally

```sh
git worktree add ../t1 track1
git worktree add ../t2 track2

python3 -m venv .venv && . .venv/bin/activate
pip install -r docs-site/requirements.txt

python docs-site/build.py --out _site --src track1=../t1 --src track2=../t2
python docs-site/check_links.py _site
python -m http.server -d _site 8000
```

### How it publishes

[`.github/workflows/docs.yml`](.github/workflows/docs.yml) rebuilds and
publishes on every push to `main`, `track1` or `track2` that touches
`README.md`, `docs/`, `docs-site/` or the workflow itself. The same file exists
on all three branches because GitHub runs the copy on the branch you pushed to
— **keep the three copies in step.**

The job is guarded by `if: github.repository == 'NTUDeepSpeed/…'`, so teams who
fork this repository to compete never spend their Actions minutes rebuilding
our documentation. (`judge.yml` is deliberately *not* guarded — racing your
entry on every push is the point of a fork.)

### Design

The site uses the **DeepSpeed design system**: monochrome foundation, race-red
`#E2342B` as the only accent, Anton for headlines, Space Grotesk for body,
JetBrains Mono for telemetry and labels. Dark is the default theme.

`theme/tokens.css` is vendored verbatim from that system — re-export over it to
update. Everything in `theme/docs.css` reads those custom properties and
contains no raw brand values, so re-skinning is a one-file swap.

`static/favicon.png` is the team's own favicon, copied byte for byte from
[NTUDeepSpeed.github.io](https://github.com/NTUDeepSpeed/NTUDeepSpeed.github.io)
(`public/favicon.png`) and declared the same way. Do not regenerate it — if the
team changes theirs, copy the new file over. The mascot appears nowhere else:
the design system's rule is that the lion is a logo, not a UI icon, and the
favicon is one of the two places it is allowed below 64px.

---

## Getting help

- Read the troubleshooting section at the end of chapter 1 for your track
  first — most problems are there.
- Bring the exact error text and what you ran to the team channel.
- Email `ntu-deepspeed@e.ntu.edu.sg` if troubleshooting has not got you there.

Good luck. Go fast.
