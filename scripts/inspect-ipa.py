from pathlib import Path
from zipfile import ZipFile
import hashlib, json, plistlib, struct, sys

file=Path(sys.argv[1])
with ZipFile(file) as ipa:
    info=plistlib.loads(ipa.read('Payload/MeowLedger.app/Info.plist'))
    executable='Payload/MeowLedger.app/'+info['CFBundleExecutable']
    data=ipa.read(executable)
    magic,cpu=struct.unpack('<II',data[:8])
    assert magic==0xfeedfacf and cpu==0x0100000c, 'Expected compiled ARM64 Mach-O'
    assert 'iPhoneOS' in info.get('CFBundleSupportedPlatforms',[])
    assert ipa.getinfo(executable).external_attr>>16 & 0o111, 'Missing executable permissions'
    assert 'Payload/MeowLedger.app/Web/ios/index.html' in ipa.namelist()
    assert 'Payload/MeowLedger.app/Web/ios/bundle.js' in ipa.namelist()
    assert ipa.testzip() is None
    result={'file':str(file),'bundleIdentifier':info['CFBundleIdentifier'],'version':info['CFBundleShortVersionString'],'minimumOSVersion':info['MinimumOSVersion'],'architecture':'arm64','platform':info['CFBundleSupportedPlatforms'],'hasProvisioningProfile':'Payload/MeowLedger.app/embedded.mobileprovision' in ipa.namelist(),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size}
    print(json.dumps(result,ensure_ascii=False,indent=2))
