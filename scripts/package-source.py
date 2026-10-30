from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parents[1]
output = root.parent / 'downloads/apple-build/source/meow-ledger-ios-1.0.4-cloud.zip'
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file() and file.suffix not in {'.p12', '.p8', '.mobileprovision', '.pem', '.key'} and file.name != '.env' and not any(part in {'node_modules', '.git', 'build', 'xcuserdata', '__pycache__'} for part in file.relative_to(root).parts):
            archive.write(file, Path(root.name) / file.relative_to(root))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    names = set(archive.namelist())
    for name in ['MeowLedger.xcodeproj/project.pbxproj', 'MeowLedger/AppDelegate.swift', 'MeowLedger/Web/ios/index.html', 'MeowLedger/Web/ios/bundle.js', '.github/workflows/ios-build.yml', '.github/workflows/ios-signed.yml', 'CLOUD-BUILD.md', 'README.md']:
        assert root.name + '/' + name in names
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(digest + '  ' + output.name + '\n')
print(str(output))
print('SHA256: ' + digest)
print('Bytes: ' + str(output.stat().st_size))
