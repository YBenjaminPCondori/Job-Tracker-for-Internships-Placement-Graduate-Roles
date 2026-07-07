"""Convert cleaned BrowserOS rows into a simple job-tracker import format."""

import pandas as pd


JOB_TRACKER_COLUMNS = [
    "title",
    "company",
    "location",
    "status",
    "deadline",
    "source",
    "application_url",
    "notes",
]


def _combine_notes(row: pd.Series) -> object:
    """Combine useful BrowserOS detail fields into one readable notes value."""
    note_parts = []

    if pd.notna(row["degree_required"]):
        note_parts.append(f"Degree required: {row['degree_required']}")
    if pd.notna(row["key_skills"]):
        note_parts.append(f"Key skills: {row['key_skills']}")
    if pd.notna(row["notes"]):
        note_parts.append(f"Notes: {row['notes']}")

    return " | ".join(note_parts) if note_parts else pd.NA


def build_job_tracker_import(cleaned_dataframe: pd.DataFrame) -> pd.DataFrame:
    """Map cleaned BrowserOS data to the provisional job-tracker schema."""
    export = pd.DataFrame(index=cleaned_dataframe.index)
    export["title"] = cleaned_dataframe["job_title"]
    export["company"] = cleaned_dataframe["company"]
    export["location"] = cleaned_dataframe["location"]
    export["status"] = "Found"
    export["deadline"] = cleaned_dataframe["deadline"]
    export["source"] = "Gradcracker / BrowserOS"
    export["application_url"] = cleaned_dataframe["application_url"]
    export["notes"] = [
        _combine_notes(row) for _, row in cleaned_dataframe.iterrows()
    ]

    return export.loc[:, JOB_TRACKER_COLUMNS].reset_index(drop=True)
