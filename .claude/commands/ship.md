Look at all staged and unstaged changes in the current git repository. Then:

1. **Commit**: Stage all relevant changed files and create a well-structured commit with a clear, descriptive message that explains *why* the changes were made (not just what). Follow conventional commit style if applicable.

2. **Create PR**: Create a GitHub pull request using `gh pr create` with:
   - A concise title (under 70 characters)
   - A body summarizing: what changed, why, and a brief test plan

3. **Merge**: Once the PR is created, merge it into master/main using `gh pr merge --merge` (or `--squash` if there are many small commits). Then pull the latest master locally.

Return the PR URL when done.
