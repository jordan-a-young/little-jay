#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
version=1.7.12
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) platform=linux_amd64; checksum=8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 ;;
  Linux-aarch64) platform=linux_arm64; checksum=325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6 ;;
  Darwin-x86_64) platform=darwin_amd64; checksum=5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644 ;;
  Darwin-arm64) platform=darwin_arm64; checksum=aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f ;;
  *) echo "Unsupported platform for pinned actionlint $version." >&2; exit 1 ;;
esac
mkdir -p .tools
temporary_directory=$(mktemp -d .tools/actionlint-install.XXXXXX)
trap 'rm -f "$temporary_directory/archive.tar.gz" "$temporary_directory/actionlint"; rmdir "$temporary_directory"' EXIT HUP INT TERM
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "https://github.com/rhysd/actionlint/releases/download/v$version/actionlint_${version}_${platform}.tar.gz" \
  --output "$temporary_directory/archive.tar.gz"
if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum=$(sha256sum "$temporary_directory/archive.tar.gz" | cut -d ' ' -f 1)
else
  actual_checksum=$(shasum -a 256 "$temporary_directory/archive.tar.gz" | cut -d ' ' -f 1)
fi
if [ "$actual_checksum" != "$checksum" ]; then
  echo "actionlint checksum verification failed." >&2
  exit 1
fi
tar -xzf "$temporary_directory/archive.tar.gz" -C "$temporary_directory" actionlint
chmod 755 "$temporary_directory/actionlint"
mv "$temporary_directory/actionlint" .tools/actionlint
.tools/actionlint -version
