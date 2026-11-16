"""Package reviewable source, excluding real environment files and installed dependencies."""
import os
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {".git", "node_modules", ".venv", "__pycache__", ".pytest_cache",
        "build", ".emergent", "memory", "test_reports"}
TARGET = ROOT.parent / "Grimoorio-melhorado.zip"


def files():
    for parent, dirs, names in os.walk(ROOT):
        dirs[:] = [name for name in dirs if name not in SKIP]
        for name in names:
            if name.startswith(".env") and not name.endswith(".example"):
                continue
            yield Path(parent) / name


if __name__ == "__main__":
    paths = list(files())
    baseline = ROOT.parent.parent / "Grimoorio-main (1).zip"
    if baseline.exists():
        with zipfile.ZipFile(baseline) as source:
            original = {}
            for name in source.namelist():
                if name.endswith("/") or "/" not in name:
                    continue
                relative = name.split("/", 1)[1]
                if set(Path(relative).parts) & SKIP:
                    continue
                if Path(relative).name.startswith(".env") and not relative.endswith(".example"):
                    continue
                original[relative] = source.read(name)
        current = {path.relative_to(ROOT).as_posix(): path.read_bytes()
                   for path in paths if "artifacts" not in path.relative_to(ROOT).parts}
        changed = [("A" if name not in original else "D" if name not in current else "M") + " " + name
                   for name in sorted(set(original) | set(current)) if original.get(name) != current.get(name)]
        output = ROOT / "artifacts/arquivos-alterados.txt"
        output.parent.mkdir(exist_ok=True)
        output.write_text("\n".join(changed) + "\n", encoding="utf-8")
    with zipfile.ZipFile(TARGET, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files():
            archive.write(path, "Grimoorio-melhorado/" + path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(TARGET) as archive:
        assert archive.testzip() is None
        assert not any("/node_modules/" in name or "/.venv/" in name for name in archive.namelist())
        assert not any(Path(name).name.startswith(".env") and not name.endswith(".example") for name in archive.namelist())
    print("ZIP atualizado e verificado:", TARGET)
    print("Bytes:", TARGET.stat().st_size)
