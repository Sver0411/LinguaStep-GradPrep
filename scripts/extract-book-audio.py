#!/usr/bin/env python3
"""Extract only word MP3s and text from an explicitly downloaded Anki book.

Does not import Anki scheduling or execute card HTML/scripts. Audio is stored
outside Git and deployed separately from the application bundle.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("book", choices=[f"{color}-n{n}" for color in ["red", "green"] for n in range(1, 6)])
parser.add_argument("archive", type=Path)
parser.add_argument("--work", type=Path, default=Path("work/book-import"))
args = parser.parse_args()
args.work.mkdir(parents=True, exist_ok=True)
audio_dir = args.work.parent / "book-audio"
audio_dir.mkdir(exist_ok=True)
with zipfile.ZipFile(args.archive) as archive:
    database_name = next(n for n in ["collection.anki21b", "collection.anki21", "collection.anki2"] if n in archive.namelist())
    database_data = archive.read(database_name)
    if not database_data.startswith(b"SQLite format 3"):
        database_data = subprocess.run(["zstd", "-dc"], input=database_data, check=True, capture_output=True).stdout
    database = args.work / f"{args.book}.anki2"
    database.write_bytes(database_data)
    media_data = archive.read("media")
    if not media_data.startswith(b"{"):
        media_data = subprocess.run(["zstd", "-dc"], input=media_data, check=True, capture_output=True).stdout
    media = json.loads(media_data)
    filenames = {filename: key for key, filename in media.items()}
    connection = sqlite3.connect(database)
    manifest = {}
    missing = 0
    for note_id, fields in connection.execute("SELECT id, flds FROM notes ORDER BY id"):
        references = re.findall(r"\[sound:([^\]]+)\]", fields)
        if not references:
            missing += 1
            continue
        filename = references[0]
        if filename not in filenames or not filename.lower().endswith(".mp3"):
            missing += 1
            continue
        data = archive.read(filenames[filename])
        if len(data) < 512 or not (data.startswith(b"ID3") or data[0] == 255):
            missing += 1
            continue
        digest = hashlib.sha256(data).hexdigest()[:32]
        destination = audio_dir / f"{digest}.mp3"
        if not destination.exists():
            destination.write_bytes(data)
        manifest[str(note_id)] = digest
    connection.close()
(args.work / f"{args.book}.audio.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n")
print(json.dumps({"book": args.book, "audio": len(manifest), "missing": missing, "database": str(database)}, ensure_ascii=False))
