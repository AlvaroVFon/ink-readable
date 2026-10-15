#!/usr/bin/env python3
"""Builds the updater manifest (latest.json) for a desktop release.

    scripts/updater-manifest.py <assets-dir> <repo> <tag> <version> <notes>

Reads the updater signatures (`<bundle>.sig`) downloaded from the release (the
bundles themselves are not needed) and prints the manifest the Tauri updater fetches from
`releases/latest/download/latest.json`.

The release workflow runs this once, after every matrix job has uploaded its
bundles. Letting each job merge its own platform into latest.json (the
tauri-action default) races: the last job to finish overwrites the others.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Bundle filename suffix -> updater platform keys. The plain `<os>-<arch>` key is
# the fallback the updater uses when it cannot tell how the app was installed.
PLATFORMS = [
    ("_aarch64.app.tar.gz", ["darwin-aarch64", "darwin-aarch64-app"]),
    ("_x64.app.tar.gz", ["darwin-x86_64", "darwin-x86_64-app"]),
    ("_amd64.AppImage", ["linux-x86_64", "linux-x86_64-appimage"]),
    ("_amd64.deb", ["linux-x86_64-deb"]),
    (".x86_64.rpm", ["linux-x86_64-rpm"]),
    ("_x64-setup.exe", ["windows-x86_64", "windows-x86_64-nsis"]),
    ("_x64_en-US.msi", ["windows-x86_64-msi"]),
]


def main() -> None:
    assets_dir, repo, tag, version, notes = sys.argv[1:6]
    assets = Path(assets_dir)
    platforms = {}

    for suffix, keys in PLATFORMS:
        matches = [p for p in assets.glob("*.sig") if p.name.endswith(suffix + ".sig")]
        if len(matches) != 1:
            sys.exit(f"expected one signature for *{suffix}, found {len(matches)}")
        signature = matches[0]
        bundle = signature.name.removesuffix(".sig")

        entry = {
            "signature": signature.read_text().strip(),
            "url": f"https://github.com/{repo}/releases/download/{tag}/{bundle}",
        }
        for key in keys:
            platforms[key] = entry

    manifest = {
        "version": version,
        "notes": notes,
        "pub_date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "platforms": platforms,
    }
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
