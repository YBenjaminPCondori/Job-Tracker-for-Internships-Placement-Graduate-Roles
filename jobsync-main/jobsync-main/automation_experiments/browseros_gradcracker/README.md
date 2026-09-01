# BrowserOS Gradcracker Experiment

This directory is a separate, experimental data-processing module inside the
JobSync repository. BrowserOS performs authorised browser workflows outside
Python and exports a CSV file here. Python only validates and processes that
export; it does not launch a browser, scrape a site, or write to the JobSync
database.

There is no deep integration with the JobSync frontend or backend. The boundary
between this experiment and the main application is a clean CSV/JSON
import/export contract. JobSync includes a lightweight CSV upload importer on
the **My Jobs** page for `exports/job_tracker_import_ready.csv`; this module
still makes no API calls and has no application-side effects by itself.

All committed records use `example.com` and are dummy data. They do not contain
real Gradcracker data.

## Directory layout

```text
browseros_gradcracker/
├── input/                 # Approved dummy URLs and BrowserOS task configuration
├── browseros_output/      # Raw CSV files exported by BrowserOS
├── processed/             # Cleaned records and one-row metrics CSV files
├── exports/               # Provisional bridge file for the job tracker
├── logs/                  # One execution log per run
├── scripts/               # Validation, cleaning, metrics, and orchestration
├── future_import_format.csv
├── requirements.txt
└── README.md
```

`future_import_format.csv` is a provisional example of the cleaned file
contract. If JSON is used for a future integration, it should expose the same
field names and represent each CSV row as one JSON object.

## BrowserOS export schema

Every raw CSV must contain these columns:

```text
run_id,method,job_title,company,location,deadline,job_type,degree_required,key_skills,application_url,source_url,timestamp,notes
```

Extra columns are ignored so that processed output remains stable. Missing
required columns stop the run with a readable error.

## Setup

From the JobSync application root:

```powershell
python -m pip install -r automation_experiments/browseros_gradcracker/requirements.txt
```

This module uses only pandas and Python standard-library modules.

## Run the pipeline

Place the BrowserOS export in `browseros_output` using this naming convention:

```text
<run_id>_raw.csv
```

Then run:

```powershell
python automation_experiments/browseros_gradcracker/scripts/run_pipeline.py --run-id run_002
```

For `run_002`, the pipeline reads:

```text
automation_experiments/browseros_gradcracker/browseros_output/run_002_raw.csv
```

It creates or replaces:

```text
automation_experiments/browseros_gradcracker/processed/run_002_clean.csv
automation_experiments/browseros_gradcracker/processed/run_002_metrics.csv
automation_experiments/browseros_gradcracker/logs/run_002_log.txt
automation_experiments/browseros_gradcracker/exports/job_tracker_import_ready.csv
```

If `--run-id` is omitted, it defaults to `run_001`.

The file in `exports` is a lightweight bridge for JobSync import. It is
overwritten with the latest successfully processed run and contains:

```text
title,company,location,status,deadline,source,application_url,notes
```

`title` comes from `job_title`, `status` is always `Found`, and `source` is
always `Gradcracker / BrowserOS`. The notes field combines the degree
requirement, key skills, and original BrowserOS notes with readable labels.
This CSV is not pushed directly into the JobSync database by the Python
pipeline. To import it, sign in to JobSync, open **My Jobs**, click **Import**,
and upload:

```text
automation_experiments/browseros_gradcracker/exports/job_tracker_import_ready.csv
```

The JobSync importer creates normal draft job records, marks them as unapplied,
creates missing title/company/location/source lookup records as needed, stores
the combined notes, and skips duplicates using title, company, and application
URL. It does not run BrowserOS, scrape pages, or automate browser access from
Python.

## Processing rules

The pipeline:

1. Checks that the raw file exists and has all required columns.
2. Trims surrounding whitespace and collapses repeated whitespace.
3. Treats blank text, `N/A`, `NA`, `none`, `null`, and `nan` as empty.
4. Removes case-insensitive duplicates using `job_title`, `company`, and
   `application_url`, keeping the first record.
5. Counts missing values after deduplication.
6. Writes cleaned rows, metrics, and a run log.

The completeness score is the percentage of populated cells across these five
fields in the unique cleaned records:

```text
deadline, degree_required, key_skills, location, application_url
```

An empty result has a completeness score of `0.0`.

## Metrics

Each metrics CSV contains one row with:

```text
total_roles_found
unique_roles_found
duplicate_count
missing_deadlines
missing_degree_requirements
missing_skill_fields
missing_locations
missing_application_urls
completeness_score_percent
```

`total_roles_found` counts raw rows. All missing-field counts operate on the
unique cleaned rows.
