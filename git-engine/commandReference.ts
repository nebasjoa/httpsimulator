// Powers the "Command reference" panel - a browsable catalog of everything this
// simulator supports, independent of any scenario. Mirrors engine/statusCatalog.ts and
// engine/headerCatalog.ts's role for the HTTP simulator: real content, not filler.

export interface CommandInfo {
  command: string;
  summary: string;
  example: string;
  destructive?: boolean;
  category: 'setup' | 'snapshot' | 'branch' | 'history' | 'merge' | 'stash' | 'remote' | 'cleanup';
}

export const commandReference: CommandInfo[] = [
  { command: 'git init', category: 'setup', summary: 'Creates a new repository. HEAD points at an unborn "main" until the first commit.', example: 'git init' },
  { command: 'git status', category: 'snapshot', summary: 'Shows what\'s staged, unstaged, and untracked.', example: 'git status' },
  { command: 'git add', category: 'snapshot', summary: 'Copies working-directory content into the staging area (the index).', example: 'git add test.txt' },
  { command: 'git commit', category: 'snapshot', summary: 'Snapshots the staging area as a new commit with the given parent(s).', example: 'git commit -m "message"' },
  { command: 'git commit --amend', category: 'snapshot', summary: 'Replaces the tip commit with a new one carrying a different snapshot/message.', example: 'git commit --amend -m "new message"', destructive: true },
  { command: 'git rm', category: 'snapshot', summary: 'Removes a file from disk and stages the removal.', example: 'git rm test.txt', destructive: true },
  { command: 'git rm --cached', category: 'snapshot', summary: 'Stops tracking a file but leaves it on disk.', example: 'git rm --cached test.txt' },
  { command: 'git mv', category: 'snapshot', summary: 'Renames a tracked file, staging both the removal and the add.', example: 'git mv test.txt renamed.txt' },
  { command: 'git restore', category: 'snapshot', summary: 'Overwrites the working directory with the staged (or committed) version, discarding uncommitted edits.', example: 'git restore test.txt', destructive: true },
  { command: 'git restore --staged', category: 'snapshot', summary: 'Unstages a file without touching the working directory.', example: 'git restore --staged test.txt' },
  { command: 'git diff', category: 'snapshot', summary: 'Shows unstaged changes (working directory vs the index).', example: 'git diff' },
  { command: 'git diff --staged', category: 'snapshot', summary: 'Shows staged changes (the index vs HEAD).', example: 'git diff --staged' },
  { command: 'git show', category: 'snapshot', summary: 'Shows a commit\'s message and file content.', example: 'git show HEAD~1' },
  { command: 'git log', category: 'snapshot', summary: 'Lists commit history. --oneline, --graph, and --all are supported.', example: 'git log --oneline --graph --all' },

  { command: 'git branch', category: 'branch', summary: 'Lists branches, or creates one at HEAD (or a given start point).', example: 'git branch feature' },
  { command: 'git branch -d', category: 'branch', summary: 'Deletes a branch, but refuses if it has unmerged commits.', example: 'git branch -d feature' },
  { command: 'git branch -D', category: 'branch', summary: 'Force-deletes a branch even if unmerged. Its commits become dangling, not gone.', example: 'git branch -D feature', destructive: true },
  { command: 'git checkout', category: 'branch', summary: 'Switches HEAD to a branch, or to a commit/tag (detached HEAD).', example: 'git checkout feature' },
  { command: 'git checkout -b', category: 'branch', summary: 'Creates a branch at HEAD and switches to it in one step.', example: 'git checkout -b feature' },
  { command: 'git checkout <ref> -- <file>', category: 'branch', summary: 'Restores one file\'s content from another ref, without moving HEAD.', example: 'git checkout HEAD -- test.txt', destructive: true },
  { command: 'git switch', category: 'branch', summary: 'Switches to an existing branch (the modern alternative to checkout for branches).', example: 'git switch main' },
  { command: 'git switch -c', category: 'branch', summary: 'Creates a branch and switches to it.', example: 'git switch -c feature' },
  { command: 'git tag', category: 'branch', summary: 'Lists tags, or creates a lightweight or annotated (-a -m) tag at HEAD.', example: 'git tag -a v1.0 -m "First release"' },
  { command: 'git tag -d', category: 'branch', summary: 'Deletes a local tag.', example: 'git tag -d v1.0' },

  { command: 'git reset --soft', category: 'history', summary: 'Moves the branch pointer only; staged and working-dir content untouched.', example: 'git reset --soft HEAD~1' },
  { command: 'git reset --mixed', category: 'history', summary: 'Moves the branch pointer and unstages; working-dir content untouched. Default mode.', example: 'git reset HEAD~1' },
  { command: 'git reset --hard', category: 'history', summary: 'Moves the branch pointer AND overwrites the working directory, discarding uncommitted changes.', example: 'git reset --hard HEAD~1', destructive: true },
  { command: 'git revert', category: 'history', summary: 'Creates a new commit that undoes another commit\'s change. Safe on shared history.', example: 'git revert HEAD' },
  { command: 'git rebase', category: 'history', summary: 'Replays commits unique to your branch onto a new base, giving them new hashes.', example: 'git rebase main', destructive: true },
  { command: 'git cherry-pick', category: 'history', summary: 'Copies one commit\'s change onto the current branch as a new commit.', example: 'git cherry-pick feature' },
  { command: 'git reflog', category: 'history', summary: 'Lists every commit HEAD has pointed to locally - the safety net behind recovering from reset/rebase/branch -D.', example: 'git reflog' },

  { command: 'git merge', category: 'merge', summary: 'Merges another branch into the current one - fast-forward if possible, otherwise a merge commit or a conflict.', example: 'git merge feature' },
  { command: 'git merge --abort', category: 'merge', summary: 'Cancels an in-progress conflicted merge.', example: 'git merge --abort' },

  { command: 'git stash', category: 'stash', summary: 'Saves staged + working-dir changes off to the side and cleans the working tree.', example: 'git stash push -m "WIP"' },
  { command: 'git stash pop', category: 'stash', summary: 'Reapplies the most recent stash and removes it from the list.', example: 'git stash pop' },
  { command: 'git stash apply', category: 'stash', summary: 'Reapplies the most recent stash but keeps it in the list.', example: 'git stash apply' },
  { command: 'git stash list', category: 'stash', summary: 'Lists saved stashes.', example: 'git stash list' },
  { command: 'git stash drop', category: 'stash', summary: 'Permanently deletes a stash entry.', example: 'git stash drop', destructive: true },

  { command: 'git remote add', category: 'remote', summary: 'Registers a shorthand name for a remote repository URL.', example: 'git remote add origin <url>' },
  { command: 'git remote -v', category: 'remote', summary: 'Lists configured remotes.', example: 'git remote -v' },
  { command: 'git clone', category: 'remote', summary: 'Copies a remote\'s entire history locally and checks out its default branch.', example: 'git clone <url>' },
  { command: 'git fetch', category: 'remote', summary: 'Downloads new commits from a remote without touching your branches or working directory.', example: 'git fetch origin' },
  { command: 'git pull', category: 'remote', summary: 'Fetches, then merges the remote branch into your current branch.', example: 'git pull origin main' },
  { command: 'git push', category: 'remote', summary: 'Uploads your commits and moves the remote branch to match, if it\'s a fast-forward.', example: 'git push origin main' },
  { command: 'git push --force', category: 'remote', summary: 'Uploads and overwrites the remote branch even if it isn\'t a fast-forward.', example: 'git push --force origin main', destructive: true },

  { command: 'git clean -fd', category: 'cleanup', summary: 'Deletes untracked files/directories from disk. No git object is ever created for them - there is no undo.', example: 'git clean -fd', destructive: true },
];

export const outOfScopeNote =
  'Not covered by this simulator: submodules, worktrees, git bisect, hooks, and full interactive-rebase reordering (git rebase -i\'s pick/squash/drop editor). ' +
  'Everything above is simulated in-memory - no real git process runs.';
