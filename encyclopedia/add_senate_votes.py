"""Merge Senate confirmation votes from ../senate into the encyclopedia CSV.

Reads SOURCE_CSV, drops DROP_COLUMNS, and writes OUTPUT_CSV (the file the page
loads), adding (or refreshes) these columns, one entry per Senate action on the person's
nomination(s), oldest first, joined with "; ":

  Senate Result    Confirmed / Rejected / Withdrawn / ...
  Senate Vote      "53-47", "Voice vote", or "No vote"
  Senate Vote Date "Apr 7, 2022"
  Senate Yea %     share of yea votes among yea + nay (blank unless a roll call)

Re-run after either source CSV changes:  python3 add_senate_votes.py
"""

import csv
import re
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
SOURCE_CSV = HERE / "08032026.csv"
OUTPUT_CSV = HERE / "10192026.csv"
DROP_COLUMNS = {"Religion"}
SENATE_CSV = HERE.parent / "senate" / "scotus_nominations_cleaned.csv"

NEW_COLUMNS = ["Senate Result", "Senate Vote", "Senate Vote Date", "Senate Yea %"]

RESULTS = {
    "C": "Confirmed",
    "CNA": "Confirmed",
    "D": "Confirmed, declined",
    "R": "Rejected",
    "W": "Withdrawn",
    "N": "No action",
    "P": "Postponed",
}


def name_parts(name):
    name = name.replace("*", "").strip()
    if "," not in name:  # "Stanley Matthews"
        first, _, last = name.rpartition(" ")
        name = f"{last}, {first}"
    last, _, rest = name.partition(",")
    last = last.strip()
    # "Devanter, Willis Van" -> "Van Devanter"
    if rest.strip().endswith(" Van"):
        last = "Van " + last
        rest = rest.strip()[:-4]
    tokens = [t.lower() for t in re.findall(r"[A-Za-z]+", rest) if len(t) > 1]
    return last.lower(), tokens


def parse_date(s, year_hint=""):
    """Parse "Apr 7, 2022" or "7-Apr-22"; two-digit years take the century
    closest to year_hint (the Senate file's Vote Year)."""
    s = s.strip()
    try:
        return datetime.strptime(s, "%b %d, %Y")
    except ValueError:
        pass
    try:
        d = datetime.strptime(s, "%d-%b-%y")
    except ValueError:
        return None
    if year_hint.isdigit():
        hint = int(year_hint)
        year = min(
            (c + d.year % 100 for c in range(hint // 100 * 100 - 100, hint + 101, 100)),
            key=lambda y: abs(y - hint),
        )
        d = d.replace(year=year)
    return d


def fmt_date(d):
    return f"{d:%b} {d.day}, {d.year}" if d else ""


def match(nom, people):
    last, tokens = name_parts(nom["Nominee"])
    cands = [p for p in people if p["_last"] == last]
    if len(cands) > 1:
        # Prefer a first-name match ("Wheeler" vs "Rufus Wheeler" Peckham),
        # then any shared name ("Frank" vs "Francis (Frank)" Murphy)
        cands = (
            [p for p in cands if p["_tokens"][:1] == tokens[:1]]
            or [p for p in cands if set(p["_tokens"]) & set(tokens)]
            or cands
        )
    if len(cands) > 1:
        pres_last = nom["President"].split(",")[0].strip().lower()
        cands = [p for p in cands if pres_last in p["Appointing President"].lower()] or cands
    return cands[0] if len(cands) == 1 else None


def main():
    with open(SOURCE_CSV, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = [c for c in reader.fieldnames if c not in NEW_COLUMNS and c.strip() not in DROP_COLUMNS]
        people = list(reader)

    for p in people:
        p["_last"], p["_tokens"] = name_parts(p["Full Name"])
        p["_noms"] = []

    with open(SENATE_CSV, encoding="utf-8", newline="") as f:
        noms = list(csv.DictReader(f))

    unmatched = []
    for nom in noms:
        person = match(nom, people)
        if person is None:
            unmatched.append(nom["Nominee"])
            continue

        yea, nay = nom["Yea"].strip(), nom["Nay"].strip()
        if yea and nay:
            vote = f"{yea}-{nay}"
            total = int(yea) + int(nay)
            pct = str(round(100 * int(yea) / total)) if total else ""
        elif nom["Voice"].strip().upper() == "TRUE":
            vote, pct = "Voice vote", ""
        else:
            vote, pct = "No vote", ""

        vote_date = parse_date(nom["Date"], nom["Vote Year"])
        date = vote_date or parse_date(nom["Nominated*"], nom["Vote Year"])
        person["_noms"].append({
            "sort": date or datetime.min,
            "Senate Result": RESULTS.get(nom["Results"].strip().upper(), nom["Results"]),
            "Senate Vote": vote,
            "Senate Vote Date": fmt_date(vote_date),
            "Senate Yea %": pct,
        })

    for p in people:
        p["_noms"].sort(key=lambda n: n["sort"])
        for col in NEW_COLUMNS:
            p[col] = "; ".join(n[col] for n in p["_noms"]) if p["_noms"] else ""

    with open(OUTPUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames + NEW_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(people)

    missing = [p["Full Name"] for p in people if not p["_noms"]]
    print(f"Matched {len(noms) - len(unmatched)} of {len(noms)} nominations")
    if unmatched:
        print("Unmatched nominations:", unmatched)
    if missing:
        print("Encyclopedia rows with no Senate record:", missing)


if __name__ == "__main__":
    main()
