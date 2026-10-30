from pathlib import Path
from zipfile import ZipFile

root=Path(__file__).resolve().parents[1]
output=root.parent/'downloads/apple-build/cloud-results'
with ZipFile(output/'meow-ledger-ios-cloud-build.zip') as archive:
    for name in archive.namelist():
        basename=Path(name).name
        if basename in {'MeowLedger-unsigned-app.zip','build-xcode.log','READ-ME.txt'}:
            (output/basename).write_bytes(archive.read(name))
print('Extracted compiled app archive and build log into '+str(output))
