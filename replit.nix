{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm
    pkgs.nodePackages.typescript
    pkgs.openssl
    pkgs.python3
    pkgs.gcc
    pkgs.make
    pkgs.pkg-config
  ];
}