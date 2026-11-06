#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
version=8.30.1
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) platform=linux_x64; checksum=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb ;;
  Linux-aarch64) platform=linux_arm64; checksum=e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080 ;;
  Darwin-x86_64) platform=darwin_x64; checksum=dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709 ;;
  Darwin-arm64) platform=darwin_arm64; checksum=b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5 ;;
  *) echo "Unsupported platform: install Gitleaks $version manually and set GITLEAKS_BIN." >&2; exit 1 ;;
esac
mkdir -p .tools
temporary_directory=$(mktemp -d .tools/gitleaks-install.XXXXXX)
trap 'rm -f "$temporary_directory/archive.tar.gz" "$temporary_directory/gitleaks"; rmdir "$temporary_directory"' EXIT HUP INT TERM
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "https://github.com/gitleaks/gitleaks/releases/download/v$version/gitleaks_${version}_${platform}.tar.gz" \
  --output "$temporary_directory/archive.tar.gz"
if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum=$(sha256sum "$temporary_directory/archive.tar.gz" | cut -d ' ' -f 1)
else
  actual_checksum=$(shasum -a 256 "$temporary_directory/archive.tar.gz" | cut -d ' ' -f 1)
fi
if [ "$actual_checksum" != "$checksum" ]; then
  echo "Gitleaks checksum verification failed." >&2
  exit 1
fi
tar -xzf "$temporary_directory/archive.tar.gz" -C "$temporary_directory" gitleaks
chmod 755 "$temporary_directory/gitleaks"
mv "$temporary_directory/gitleaks" .tools/gitleaks
.tools/gitleaks version
