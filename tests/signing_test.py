import datetime, importlib.util, plistlib, tempfile, unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('signing',Path(__file__).resolve().parents[1]/'scripts/prepare-signing.py')
signing=importlib.util.module_from_spec(spec)
spec.loader.exec_module(signing)

def profile(**changes):
    return {'UUID':'12345678-ABCD-1234-ABCD-123456789012','TeamIdentifier':['ABCDE12345'],'ExpirationDate':datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)+datetime.timedelta(days=1),'Entitlements':{'application-identifier':'ABCDE12345.com.meowledger.ios','get-task-allow':True},'ProvisionedDevices':['test-device'],**changes}

class SigningTests(unittest.TestCase):
    def run_profile(self,p,method='debugging',bundle='com.meowledger.ios'):
        with tempfile.TemporaryDirectory() as d:
            target=Path(d)
            signing.prepare(p,target,bundle,method)
            return plistlib.loads((target/'ExportOptions.plist').read_bytes())
    def test_development_export(self):
        output=self.run_profile(profile())
        self.assertEqual(output['method'],'debugging')
        self.assertEqual(output['provisioningProfiles']['com.meowledger.ios'],profile()['UUID'])
    def test_adhoc_export(self):
        p=profile();p['Entitlements']['get-task-allow']=False
        self.assertEqual(self.run_profile(p,'release-testing')['method'],'release-testing')
    def test_store_export(self):
        p=profile();p['Entitlements']['get-task-allow']=False;p.pop('ProvisionedDevices')
        self.assertEqual(self.run_profile(p,'app-store-connect')['method'],'app-store-connect')
    def test_expired_profile_rejected(self):
        with self.assertRaisesRegex(ValueError,'expired'):
            self.run_profile(profile(ExpirationDate=datetime.datetime(2000,1,1)))
    def test_wrong_bundle_rejected(self):
        with self.assertRaisesRegex(ValueError,'Bundle ID'):
            self.run_profile(profile(),bundle='com.someone.other')
    def test_wrong_distribution_rejected(self):
        for method in ['release-testing','app-store-connect']:
            with self.assertRaisesRegex(ValueError,'profile type'):
                self.run_profile(profile(),method)
    def test_identifier_path_injection_rejected(self):
        with self.assertRaisesRegex(ValueError,'identifiers'):
            self.run_profile(profile(UUID='../../bad'))
    def test_enterprise_not_accidentally_distributed(self):
        with self.assertRaisesRegex(ValueError,'Enterprise'):
            self.run_profile(profile(ProvisionsAllDevices=True))

if __name__=='__main__':unittest.main()
