"""
Convert all .py files in a directory tree to .ipynb notebooks.
One cell per top-level class/function/def, plus a markdown header cell.
"""
import json
import os
import re
from pathlib import Path

NB_TEMPLATE = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12.0"},
    },
    "cells": [],
}


def split_into_cells(source: str) -> list[dict]:
    """Split Python source into notebook cells by top-level definitions."""
    lines = source.splitlines(keepends=True)
    cells = []
    cell_lines = []
    in_multiline = False
    multiline_char = None

    for line in lines:
        stripped = line.lstrip()
        indent = len(line) - len(stripped)
        is_top = indent == 0

        # Track triple-quote multiline strings
        if is_top and not in_multiline:
            if stripped.startswith('"""') or stripped.startswith("'''"):
                mc = stripped[:3]
                in_multiline = True
                multiline_char = mc
                cell_lines.append(line)
                if stripped.count(mc) >= 2:
                    in_multiline = False
                    multiline_char = None
                continue

        if in_multiline and multiline_char:
            cell_lines.append(line)
            if multiline_char in stripped:
                in_multiline = False
                multiline_char = None
            continue

        if is_top and (stripped.startswith("def ") or
                       stripped.startswith("class ") or
                       stripped.startswith("@") or
                       stripped.startswith("#!")):
            # Flush previous cell
            if cell_lines:
                cells.append(_make_cell("".join(cell_lines).rstrip() + "\n"))
                cell_lines = []
            cell_lines.append(line)
        else:
            cell_lines.append(line)

    if cell_lines:
        cells.append(_make_cell("".join(cell_lines).rstrip() + "\n"))

    return cells


def _ensure_str(source) -> str:
    """Normalise cell source to a single string (not a list)."""
    if isinstance(source, list):
        return "".join(source)
    return str(source)


def _make_cell(source: str, cell_type: str = "code") -> dict:
    return {
        "cell_type": cell_type,
        "metadata": {},
        "source": _ensure_str(source),
        "outputs": [],
        "execution_count": None,
    }


def add_header_cell(cells: list, filename: str) -> list:
    title = Path(filename).stem.replace("_", " ").replace("-", " ").title()
    header = _make_cell(f"# {title}\n", cell_type="markdown")
    cells.insert(0, header)
    return cells


def py_to_ipynb(py_path: Path, out_dir: Path) -> Path:
    source = py_path.read_text()
    cells = split_into_cells(source)
    cells = add_header_cell(cells, str(py_path))

    nb = dict(NB_TEMPLATE)
    nb["cells"] = cells

    out_path = out_dir / f"{py_path.stem}.ipynb"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(nb, indent=2, ensure_ascii=False))
    return out_path


def main(root: str):
    root_path = Path(root).resolve()
    py_files = sorted(root_path.rglob("*.py"))
    # Exclude this very script and anything in node_modules
    py_files = [
        f for f in py_files
        if f.name != "py_to_nb.py" and "node_modules" not in f.parts
    ]

    print(f"Found {len(py_files)} .py files to convert")
    for py_file in py_files:
        rel = py_file.parent.relative_to(root_path.parent)
        out_dir = root_path.parent / rel
        out_path = py_to_ipynb(py_file, out_dir)
        print(f"  {py_file}  ->  {out_path}")

    print(f"\nDone — {len(py_files)} notebooks written.")


if __name__ == "__main__":
    import sys
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
