import pandas as pd
import re

# =========================
# FILE PATHS
# =========================
INPUT_FILE = "scotus data prep - nomination.csv"      # change to your CSV filename
OUTPUT_FILE = "scotus_nominations_cleaned.csv"

# =========================
# FOOTNOTES
# =========================
FOOTNOTES = {
    "1": "Nominated to chief justice.",
    "2": "Sitting justice elevated to chief justice.",
    "3": "Nominated to chief justice.",
    "4": "Sitting justice nominated to chief justice; nomination filibustered and withdrawn.",
    "5": "Nominated to chief justice.",
    "6": "Nominated to chief justice.",
    "7": "Sitting justice elevated to chief justice.",
    "8": "Nominated to chief justice.",
    "9": "Nominated to chief justice.",
    "10": "Sitting justice elevated to chief justice.",
    "11": "Nominated to chief justice.",
    "12": "Nominated to chief justice.",
    "13": "Unsuccessful nominee for chief justice.",
    "14": "Unsuccessful nominee for chief justice.",
    "15": "Confirmed, but died before he took office.",
    "16": "Nominated to chief justice.",
    "17": "On motion to proceed to consider the nomination, an objection was made.",
    "18": "Nominated to chief justice.",
    "19": "Nominated to chief justice.",
    "20": "Nominated to chief justice.",
    "21": "Nominated to chief justice.",
    "22": "Sitting justice nominated to chief justice, but declined and continued to serve as an associate justice.",
    "23": "Offered his services as a replacement for the soon-to-retire John Jay in June 1795, so President Washington offered him a temporary commission (Senate was in recess). The Senate convened in December and voted on the nomination, making Rutledge the first rejected Supreme Court nominee and the only \"recess appointed\" justice not to be subsequently confirmed by the Senate.",
    "24": "Nominated to chief justice.",
    "25": "7 nominees (see D in Result Key) were confirmed, but declined to serve.",
}

# =========================
# LOAD CSV
# =========================
df = pd.read_csv(INPUT_FILE, dtype=str).fillna("")

current_president = ""
cleaned_rows = []

# =========================
# PROCESS ROWS
# =========================
for _, row in df.iterrows():
    values = [str(v).strip() for v in row.tolist()]

    first_col = values[0]
    other_cols_blank = all(v == "" for v in values[1:])

    # Detect president divider rows
    if first_col.startswith("President ") and other_cols_blank:
        current_president = first_col.replace("President ", "", 1).strip()
        continue

    # Skip completely blank rows
    if not any(values):
        continue

    # Add president as new first column
    cleaned_rows.append([current_president] + values)

# =========================
# CREATE CLEAN DATAFRAME
# =========================
clean_df = pd.DataFrame(
    cleaned_rows,
    columns=["President"] + list(df.columns)
)

# =========================
# REMOVE EMPTY / UNNAMED COLUMNS
# =========================

# Remove blank or unnamed headers
valid_columns = [
    col for col in clean_df.columns
    if str(col).strip() != "" and not str(col).startswith("Unnamed")
]

clean_df = clean_df[valid_columns]

# Remove columns where every value is blank
clean_df = clean_df.loc[:, (clean_df != "").any(axis=0)]

# =========================
# MOVE FOOTNOTE NUMBERS INTO NOTES COLUMN
# =========================
clean_df["notes"] = ""

nominee_col = "Nominee"

if nominee_col in clean_df.columns:

    def extract_note_from_nominee(nominee):
        nominee = str(nominee).strip()

        # Match trailing number
        match = re.search(r"\s*(\d{1,2})$", nominee)

        if match:
            note_num = match.group(1)

            if note_num in FOOTNOTES:
                cleaned_nominee = re.sub(r"\s*\d{1,2}$", "", nominee).strip()
                return pd.Series([cleaned_nominee, FOOTNOTES[note_num]])

        return pd.Series([nominee, ""])

    clean_df[[nominee_col, "notes"]] = clean_df[nominee_col].apply(
        extract_note_from_nominee
    )

# =========================
# SPLIT VOTE COLUMN
# =========================

vote_col = "Vote**"

# Create new columns
clean_df["Yea"] = ""
clean_df["Nay"] = ""
clean_df["Vote No."] = ""
clean_df["Voice"] = False

if vote_col in clean_df.columns:

    def parse_vote(vote):
        vote = str(vote).strip()

        # Voice vote
        if vote == "V":
            return pd.Series(["", "", "", True])

        # Example:
        # 53-47 No. 134
        match = re.match(r"(\d+)-(\d+)\s+No\.\s*(\d+)", vote)

        if match:
            yea = match.group(1)
            nay = match.group(2)
            vote_no = match.group(3)

            return pd.Series([yea, nay, vote_no, False])

        # Example:
        # 32-41
        match = re.match(r"^(\d+)-(\d+)$", vote)

        if match:
            yea = match.group(1)
            nay = match.group(2)

            return pd.Series([yea, nay, "", False])

        return pd.Series(["", "", "", False])

    clean_df[["Yea", "Nay", "Vote No.", "Voice"]] = clean_df[vote_col].apply(parse_vote)
# =========================
# EXTRACT VOTE YEAR
# =========================

date_col = "Date"

# fallback if column name changed during import
if date_col not in clean_df.columns:
    possible_date_cols = [c for c in clean_df.columns if "Date" in str(c)]
    if possible_date_cols:
        date_col = possible_date_cols[0]

clean_df["Vote Year"] = ""

if date_col in clean_df.columns:

    def extract_year(date_value):
        date_value = str(date_value).strip()

        # Match 4-digit year at end of string
        match = re.search(r"(\d{4})$", date_value)

        if match:
            return match.group(1)

        return ""

    clean_df["Vote Year"] = clean_df[date_col].apply(extract_year)
# =========================
# SAVE CLEANED CSV
# =========================
clean_df.to_csv(OUTPUT_FILE, index=False)

print(f"Saved cleaned file to: {OUTPUT_FILE}")