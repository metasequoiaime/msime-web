"""Enable auto-merge only for the generated manifest PR behind real required checks."""
import argparse
import json
import subprocess

REQUIRED = {'Build', 'Workflow validation', 'Dependency review'}

# Each automation branch may touch only the manifests it owns. Binding branch and files together is tighter than allowing any manifest from any branch: a branch that somehow produced someone else's manifest is refused rather than merged.
#
# The downloads branch owns two files because both of them carry the Windows version and the build asserts the two agree. A pull request that moved only one of them would be a pull request that cannot pass its own checks, so they are proposed together. Changing just one is still allowed here: a macOS or Linux release moves platforms.json on its own, and that says nothing about update.json.
ALLOWED = {
    'automation/downloads': frozenset({'public/update.json', 'public/platforms.json'}),
    'automation/community-snapshot': frozenset({'public/community.json'}),
    'automation/testflight-stats': frozenset({'public/testflight-stats.json'}),
}
BRANCH = 'automation/downloads'


def validate(pr, files, rules, sha):
    branch = pr['head']['ref']
    if (pr['state'] != 'open' or pr['draft'] or pr['base']['ref'] != 'main'
            or branch not in ALLOWED or pr['head']['sha'] != sha
            or pr['head']['repo']['full_name'] != pr['base']['repo']['full_name']):
        raise ValueError('Unexpected manifest PR source, target, state or commit')
    # A duplicated name would let one allowed path stand in for a file count it did not earn.
    if not files or len(set(files)) != len(files) or not set(files) <= ALLOWED[branch]:
        raise ValueError(f'{branch} may only change {", ".join(sorted(ALLOWED[branch]))}')
    checks = {c['context'] for rule in rules if rule['type'] == 'required_status_checks'
              for c in rule['parameters']['required_status_checks']
              if c.get('integration_id') == 15368}
    if not REQUIRED <= checks or not any(r['type'] == 'pull_request' for r in rules):
        raise ValueError('Main must require a PR and the GitHub Actions build/quality checks')


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--pr', type=int, required=True)
    parser.add_argument('--sha', required=True)
    args = parser.parse_args()
    prefix = f'repos/{args.repo}'
    pr = api(f'{prefix}/pulls/{args.pr}')
    files = [f['filename'] for f in api(f'{prefix}/pulls/{args.pr}/files')]
    # Fail closed instead of accepting a truncated file list: the listing is paginated, so a pull request carrying more files than the first page holds would otherwise be validated against a prefix of itself.
    if pr['changed_files'] != len(files):
        raise ValueError(f"Read {len(files)} of {pr['changed_files']} changed files")
    validate(pr, files, api(f'{prefix}/rules/branches/main'), args.sha)
    subprocess.run(['gh', 'pr', 'merge', str(args.pr), '--repo', args.repo,
                    '--auto', '--squash', '--match-head-commit', args.sha], check=True)


if __name__ == '__main__':
    main()
