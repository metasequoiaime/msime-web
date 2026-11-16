import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('gate', Path(__file__).with_name('enable-manifest-automerge.py'))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ManifestGate(unittest.TestCase):
    def setUp(self):
        repo = {'full_name': 'metasequoiaime/MSIME-Web'}
        self.pr = dict(state='open', draft=False, base=dict(ref='main', repo=repo),
                       head=dict(ref=gate.BRANCH, repo=repo, sha='a' * 40))
        self.rules = [dict(type='pull_request'), dict(type='required_status_checks',
            parameters=dict(required_status_checks=[dict(context=c, integration_id=15368) for c in gate.REQUIRED]))]

    def test_valid_protected_manifest(self):
        gate.validate(self.pr, ['apps/web/public/update.json'], self.rules, 'a' * 40)

    def test_rejects_unprotected_main_and_spoofed_checks(self):
        for rules in [[], self.rules[:1], self.rules[1:]]:
            with self.assertRaises(ValueError):
                gate.validate(self.pr, ['apps/web/public/update.json'], rules, 'a' * 40)
        rules = copy.deepcopy(self.rules)
        rules[1]['parameters']['required_status_checks'][0]['integration_id'] = 1
        with self.assertRaises(ValueError):
            gate.validate(self.pr, ['apps/web/public/update.json'], rules, 'a' * 40)

    def test_each_branch_may_only_change_its_own_manifests(self):
        for branch, allowed in gate.ALLOWED.items():
            pr = copy.deepcopy(self.pr)
            pr['head']['ref'] = branch
            # 自己的文件，单独一个或者一起来，都放行
            gate.validate(pr, sorted(allowed), self.rules, 'a' * 40)
            for owned in allowed:
                gate.validate(pr, [owned], self.rules, 'a' * 40)
            # 换成另一条自动化分支的文件就不行：分支和文件是绑死的
            for other in set().union(*gate.ALLOWED.values()) - allowed:
                with self.assertRaises(ValueError):
                    gate.validate(pr, [other], self.rules, 'a' * 40)
                with self.assertRaises(ValueError):
                    gate.validate(pr, sorted(allowed) + [other], self.rules, 'a' * 40)

    def test_rejects_a_repeated_filename(self):
        # 同一个文件报两遍不该顶掉 changed_files 的计数：那正是被截断的文件列表看起来的样子
        with self.assertRaises(ValueError):
            gate.validate(self.pr, ['apps/web/public/update.json', 'apps/web/public/update.json'], self.rules, 'a' * 40)

    def test_rejects_an_unknown_automation_branch(self):
        pr = copy.deepcopy(self.pr)
        pr['head']['ref'] = 'automation/something-else'
        with self.assertRaises(ValueError):
            gate.validate(pr, ['apps/web/public/update.json'], self.rules, 'a' * 40)

    def test_rejects_a_closed_or_draft_pr(self):
        for field, value in [('state', 'closed'), ('draft', True), ('state', 'merged')]:
            pr = copy.deepcopy(self.pr)
            pr[field] = value
            with self.assertRaises(ValueError):
                gate.validate(pr, ['apps/web/public/update.json'], self.rules, 'a' * 40)

    def test_rejects_a_base_other_than_main(self):
        pr = copy.deepcopy(self.pr)
        pr['base']['ref'] = 'release'
        with self.assertRaises(ValueError):
            gate.validate(pr, ['apps/web/public/update.json'], self.rules, 'a' * 40)

    def test_rejects_fork_moved_head_and_other_files(self):
        for files in [[], ['apps/web/public/update.json', '.github/workflows/ci.yml']]:
            with self.assertRaises(ValueError):
                gate.validate(self.pr, files, self.rules, 'a' * 40)
        for field, value in [('sha', 'b' * 40), ('ref', 'unexpected'),
                             ('repo', {'full_name': 'fork/MSIME-Web'})]:
            pr = copy.deepcopy(self.pr)
            pr['head'][field] = value
            with self.assertRaises(ValueError):
                gate.validate(pr, ['apps/web/public/update.json'], self.rules, 'a' * 40)


if __name__ == '__main__':
    unittest.main()
