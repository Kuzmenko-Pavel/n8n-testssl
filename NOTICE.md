# Notice

This package bundles parts of upstream `testssl.sh`, which is licensed under GPL-2.0.

- Upstream project: https://github.com/testssl/testssl.sh
- Bundled upstream version: v3.2.3
- Bundled runtime assets:
  - `vendor/testssl/testssl.sh`
  - `vendor/testssl/etc/**`
  - `vendor/testssl/bin/openssl.Linux.x86_64`
  - `vendor/testssl/bin/OPENSSL-LICENSE.txt`
  - `vendor/testssl/LICENSE`

Because this package distributes GPL-licensed upstream components, the repository and published package are licensed under `GPL-2.0-only`.

This package is intended for defensive security testing and self-hosted automation workflows. Operators must ensure they are authorized to scan the targets they send to `testssl.sh`.
