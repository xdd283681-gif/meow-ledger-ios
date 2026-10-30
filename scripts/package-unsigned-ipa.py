"""Wrap a genuinely compiled iPhone .app ZIP into an UNSIGNED IPA for later signing."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib, plistlib, sys

def package(source, output):
    with ZipFile(source) as app:
        entries=[e for e in app.infolist() if e.filename.startswith('MeowLedger.app/')]
        info=plistlib.loads(app.read('MeowLedger.app/Info.plist'))
        if 'iPhoneOS' not in info.get('CFBundleSupportedPlatforms',[]):
            raise ValueError('Expected an iPhone device build, not simulator output')
        executable='MeowLedger.app/'+info['CFBundleExecutable']
        if len(app.read(executable))<4096:
            raise ValueError('Missing compiled app executable')
        if any(e.filename.endswith('embedded.mobileprovision') for e in entries):
            raise ValueError('Input unexpectedly has a provisioning profile; use signed export instead')
        with ZipFile(output,'w',ZIP_DEFLATED) as ipa:
            for entry in entries:
                name=entry.filename
                if '..' in Path(name).parts:
                    raise ValueError('Invalid archive entry')
                target=ZipInfo('Payload/'+name,entry.date_time)
                target.external_attr=entry.external_attr
                target.create_system=entry.create_system
                target.compress_type=ZIP_DEFLATED
                ipa.writestr(target,app.read(entry))
    with ZipFile(output) as ipa:
        if ipa.testzip() is not None:
            raise ValueError('IPA ZIP verification failed')
    digest=hashlib.sha256(Path(output).read_bytes()).hexdigest()
    Path(str(output)+'.sha256').write_text(digest+'  '+Path(output).name+'\n')
    print('Created UNSIGNED IPA; personal signing is still required: '+str(output))

if __name__=='__main__':
    package(Path(sys.argv[1]),Path(sys.argv[2]))
