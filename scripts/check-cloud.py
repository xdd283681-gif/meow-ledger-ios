from pathlib import Path
import yaml

root=Path(__file__).resolve().parents[1]
for name in ['ios-build.yml','ios-signed.yml']:
    workflow=yaml.load((root/'.github/workflows'/name).read_text(),Loader=yaml.BaseLoader)
    assert 'workflow_dispatch' in workflow['on']
    assert workflow['permissions']['contents']=='read'
    for job in workflow['jobs'].values():
        assert job['runs-on']=='macos-15'
        assert any(step.get('uses','').startswith('actions/upload-artifact@') for step in job['steps'])
print('PASS GitHub workflow YAML and build triggers')
