# Results

Referee output lands here, one JSON file per run:

```
results/<team>__<run_id>.json
```

The files are ignored by git so practice runs do not end up in your commits.

```sh
# What your last few runs did
./scripts/leaderboard.py summarise results/

# The leaderboard across every team
./scripts/leaderboard.py rank results/ --csv leaderboard.csv
```

The format is documented in [docs/04-evaluation.md](../docs/04-evaluation.md).
