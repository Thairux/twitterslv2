// verify-release.js — release consistency gate (rule 12-release-apk-version).
// Usage: node .agents/verify-release.js   (also: npm run release:verify)
// Checks that package.json version, android/app/build.gradle versionName,
// and releases/<version>/ (notes + APK artifact) all agree.
// Exit 0 = consistent. Exit 1 = mismatch, with the exact fix printed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const failures = [];

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const pkgVersion = String(pkg.version || '').trim();
if (!pkgVersion) failures.push('package.json has no version.');

const gradle = fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
const vn = gradle.match(/versionName\s+"([^"]+)"/);
const vc = gradle.match(/versionCode\s+(\d+)/);
const gradleVersion = vn ? vn[1] : '';
if (!gradleVersion) {
  failures.push('android/app/build.gradle has no versionName.');
} else if (pkgVersion && gradleVersion !== pkgVersion) {
  failures.push(
    `version drift: package.json=${pkgVersion} but android versionName=${gradleVersion}. ` +
      `Bump both to the same version.`,
  );
}

if (pkgVersion) {
  const dir = path.join(root, 'releases', pkgVersion);
  if (!fs.existsSync(dir)) {
    failures.push(`releases/${pkgVersion}/ is missing. Create it with release notes + APK.`);
  } else {
    const files = fs.readdirSync(dir);
    const hasNotes = files.some((f) => /notes?\.md$/i.test(f));
    const hasApk = files.some((f) => f.endsWith('.apk'));
    if (!hasNotes) failures.push(`releases/${pkgVersion}/ has no release notes (*notes.md).`);
    if (!hasApk) {
      failures.push(
        `releases/${pkgVersion}/ has no APK artifact. Build release APK and copy it here.`,
      );
    } else {
      const apk = files.find((f) => f.endsWith('.apk'));
      if (apk && !apk.includes(pkgVersion)) {
        failures.push(
          `releases/${pkgVersion}/${apk} does not contain the version number. ` +
            `Rename it to include ${pkgVersion}.`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error('release verification FAILED:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    version: pkgVersion,
    versionCode: vc ? Number(vc[1]) : null,
    message: `release ${pkgVersion} is consistent (package.json, gradle, releases/).`,
  }),
);
