#!/usr/bin/env python3
"""Valida sintaxe YAML dos workflows GitHub (e reprota o conteúdo do 'on').
Uso: python3 scripts/validate_workflow_yaml.py [arquivo...]
Default: .github/workflows/build-release.yml
"""
import sys
import yaml


def main(paths):
    ok = True
    for p in paths:
        try:
            with open(p, "r", encoding="utf-8") as f:
                doc = yaml.safe_load(f)
        except Exception as e:  # noqa: BLE001
            print(f"[FALHOU] {p}: erro ao parsear YAML -> {e}")
            ok = False
            continue
        print(f"[OK] {p}: documento YAML válido, top-level keys = {list(doc.keys())}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    paths = sys.argv[1:] or [".github/workflows/build-release.yml"]
    main(paths)