"""Static checks only; this does not compile Swift or sign an iOS app."""
from pathlib import Path
import json, plistlib, re
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
for name in ['Info.plist', 'PrivacyInfo.xcprivacy']:
    with (root / 'MeowLedger' / name).open('rb') as f:
        plistlib.load(f)
scheme = root / 'MeowLedger.xcodeproj/xcshareddata/xcschemes/MeowLedger.xcscheme'
ET.parse(scheme)
project = (root / 'MeowLedger.xcodeproj/project.pbxproj').read_text(encoding='utf-8')
defined = re.findall(r'^([A-F0-9]{24}) = \{', project, re.M)
assert len(defined) == len(set(defined)), 'Duplicate Xcode object IDs'
assert set(re.findall(r'\b[A-F0-9]{24}\b', project)) == set(defined), 'Unresolved Xcode object reference'
for name in ['AppDelegate.swift', 'LedgerViewController.swift', 'Info.plist', 'PrivacyInfo.xcprivacy', 'Web/ios/index.html', 'Web/ios/bundle.js']:
    assert (root / 'MeowLedger' / name).is_file(), name
icons = root / 'MeowLedger/Assets.xcassets/AppIcon.appiconset'
for item in json.loads((icons / 'Contents.json').read_text())['images']:
    assert (icons / item['filename']).is_file(), item['filename']
for asset in (root / 'MeowLedger/Web').rglob('*.html'):
    if asset.name != 'index.html' or asset.parent.name != 'ios':
        continue
    html = asset.read_text(encoding='utf-8')
    for relative in re.findall(r'(?:src|href)="([^"]+)"', html):
        assert (asset.parent / relative).is_file(), relative
print('PASS plists, scheme XML, Xcode references, app icons, offline entry resources')
