#!/usr/bin/env python3
"""Valida sintaxe YAML de workflows do GitHub Actions.

Entende blocos literais (| e >) e listas. Sem dependencias externas.
"""
import sys

def validate_yaml_workflow(path):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    stack = []  # (indent, key)
    errors = []
    prev_indent = 0
    in_block = False      # dentro de bloco literal | ou >
    block_indent = 0
    for i, raw in enumerate(lines, start=1):
        line = raw.rstrip("\n")
        if not line.strip():
            continue
        if line.strip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip(" "))
        if "\t" in line[:indent]:
            errors.append(f"{path}:{i}: tab na indentacao (invalido em YAML)")
        stripped = line.strip()
        # dentro de bloco literal: tudo e conteudo ate dedent para o nivel do bloco
        if in_block:
            if indent < block_indent:
                in_block = False
            else:
                prev_indent = indent
                continue
        if indent == 0:
            stack = [(0, stripped)]
            prev_indent = 0
        else:
            if not (stripped.startswith("- ") or ":" in stripped):
                errors.append(f"{path}:{i}: linha sem estrutura YAML valida: {stripped[:60]}")
                continue
            if indent > prev_indent:
                stack.append((indent, stripped[:60]))
            else:
                while stack and stack[-1][0] > indent:
                    stack.pop()
            prev_indent = indent
        # detecta inicio de bloco literal (chave: | ou chave: >)
        if stripped.endswith(": |") or stripped.endswith(": >") or stripped.endswith(":|") or stripped.endswith(":>"):
            in_block = True
            block_indent = indent + 1
    if errors:
        print("\n".join(errors))
        return False
    return True

ok = True
for path in sys.argv[1:]:
    result = validate_yaml_workflow(path)
    print(f"{'OK ' if result else 'ERRO'} {path}")
    ok = ok and result
sys.exit(0 if ok else 1)
