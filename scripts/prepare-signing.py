"""Validate an Apple provisioning profile and create manual export options."""
from pathlib import Path
import datetime, fnmatch, os, plistlib, re, sys

def prepare(profile, output, bundle, method):
    if method not in {'debugging','release-testing','app-store-connect'}:
        raise ValueError('Unsupported export method')
    uuid=profile.get('UUID','')
    teams=profile.get('TeamIdentifier',[])
    if not re.fullmatch(r'[A-Za-z0-9-]+',uuid) or not teams or not re.fullmatch(r'[A-Z0-9]{10}',teams[0]):
        raise ValueError('Invalid provisioning profile identifiers')
    team=teams[0]
    expiry=profile['ExpirationDate']
    now=datetime.datetime.now(expiry.tzinfo) if expiry.tzinfo else datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    if expiry <= now:
        raise ValueError('Apple provisioning profile has expired')
    entitlements=profile.get('Entitlements',{})
    app_id=entitlements.get('application-identifier','')
    _,sep,pattern=app_id.partition('.')
    if not sep or not fnmatch.fnmatchcase(bundle,pattern):
        raise ValueError('Provisioning profile does not match the selected Bundle ID')
    if profile.get('ProvisionsAllDevices'):
        raise ValueError('Enterprise profiles are not supported by these workflows')
    devices=profile.get('ProvisionedDevices',[])
    development=bool(entitlements.get('get-task-allow'))
    if (method=='debugging' and (not development or not devices)) or (method=='release-testing' and (development or not devices)) or (method=='app-store-connect' and (development or devices)):
        raise ValueError('Export method does not match the Apple provisioning profile type')
    output.mkdir(parents=True,exist_ok=True)
    (output/'uuid.txt').write_text(uuid)
    (output/'team.txt').write_text(team)
    options={'method':method,'signingStyle':'manual','teamID':team,'provisioningProfiles':{bundle:uuid},'manageAppVersionAndBuildNumber':False,'stripSwiftSymbols':True}
    with (output/'ExportOptions.plist').open('wb') as f:
        plistlib.dump(options,f)

if __name__=='__main__':
    with Path(sys.argv[1]).open('rb') as f:
        profile=plistlib.load(f)
    prepare(profile,Path(sys.argv[2]),os.environ['IOS_BUNDLE_ID'],os.environ['IOS_EXPORT_METHOD'])
