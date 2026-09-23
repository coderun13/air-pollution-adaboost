# India Air Pollution Analysis (AIML 7th Semester Project)

## 1. Project Overview

This project analyzes an India air-pollution dataset covering records from **2017 to 2025**.

The current Jupyter Notebook performs the following overall workflow:

**Data Loading → Data Inspection → Missing-Value Analysis → Duplicate Removal → Date/Time Cleaning → Pollution-Value Validation → Exploratory Data Analysis → Visualization → Normalization → Categorical Encoding → Final Dataset Validation → Export**

The bundled raw dataset contains **50,000 rows and 100 columns**. It includes air-pollution measurements, AQI information, location details, weather/environmental variables, and several engineered features.

> **Important:** The current notebook is mainly a **data preprocessing + exploratory data analysis (EDA)** pipeline. It does **not** currently train or evaluate a machine-learning prediction/classification model.

---

## 2. Project Files

The ZIP contains:

```text
7thSemProjectAIML/
│
├── IndiaAirPollution_2017_25.csv
├── IndiaAirPollution_Preprocessed.csv
└── Project_AIML7th Sem.ipynb
```

### File descriptions

| File | Purpose |
|---|---|
| `IndiaAirPollution_2017_25.csv` | Raw input dataset |
| `IndiaAirPollution_Preprocessed.csv` | Preprocessed/normalized dataset included with the project |
| `Project_AIML7th Sem.ipynb` | Main Jupyter Notebook containing the complete workflow |

### Important file-format note

Although the two dataset files end with `.xls`, their contents are actually **CSV (comma-separated text)**.

The notebook uses:

```python
pd.read_csv(...)
```

Therefore, there are two easy ways to run the notebook:

**Option A — rename the files**

```text
IndiaAirPollution_2017_25.csv
IndiaAirPollution_Preprocessed.csv
```

**Option B — keep the `.xls` names and change the notebook path**

For example:

```python
file_path = "IndiaAirPollution_2017_25.csv"
df = pd.read_csv(file_path)
```

The extension itself does not determine how `pandas` reads the file; the actual file content does.

---

## 3. Dataset Summary

The raw dataset has:

- **50,000 rows**
- **100 columns**
- **29 cities**
- **29 stations**
- **29 states/locations represented**
- Datetime coverage from **2017-01-01 05:00:00 to 2025-11-26 23:00:00**
- **85 numeric columns**
- **14 object/categorical columns**

Important air-pollution variables include:

```text
PM2.5
PM10
NO
NO2
NOx
NH3
CO
SO2
O3
Benzene
Toluene
Xylene
AQI
```

The dataset also contains:

- City, state and station information
- Latitude and longitude
- Year, month, day, hour and weekday features
- Season and time-of-day categories
- Temperature and humidity
- Wind speed and direction
- Rainfall and precipitation
- Atmospheric pressure
- Solar radiation and cloud cover
- AQI categories
- Pollution ratios and other engineered features

---

# 4. Complete Process — Step by Step

## Step 1 — Import required libraries

The notebook starts by importing:

```python
import pandas as pd
import numpy as np

import matplotlib.pyplot as plt
import seaborn as sns
```

Later, Plotly is imported for interactive charts:

```python
import plotly.express as px
```

### Why?

- `pandas` → data loading, cleaning and manipulation
- `numpy` → numerical operations
- `matplotlib` → basic plots
- `seaborn` → statistical plots and heatmaps
- `plotly` → interactive visualizations

The notebook also changes pandas display settings so more rows/columns can be shown during inspection.

---

## Step 2 — Load the dataset

The notebook loads the raw data with:

```python
file_path = "IndiaAirPollution_2017_25.csv"
df = pd.read_csv(file_path)
```

Then it prints:

```python
df.shape
```

This confirms the size of the dataset.

### Purpose

This is the starting point of the entire analysis. All later cleaning and analysis operations are performed on the DataFrame `df`.

---

## Step 3 — Inspect the first and last records

The notebook uses:

```python
df.head()
df.tail()
```

### Purpose

This gives an initial understanding of:

- Column names
- Data values
- Data types as displayed
- General structure
- Whether the data appears to have loaded correctly

---

## Step 4 — Check dataset dimensions

The notebook prints:

```python
df.shape[0]
df.shape[1]
```

This separately confirms:

- Number of rows
- Number of columns

---

## Step 5 — Display all column names

The notebook loops through every column:

```python
for i, column in enumerate(df.columns, start=1):
    print(i, column)
```

### Purpose

This helps identify:

- Available features
- Pollution measurements
- Weather variables
- Categorical columns
- Engineered/derived columns

This is useful before selecting columns for preprocessing and analysis.

---

## Step 6 — Inspect data types and structure

The notebook uses:

```python
df.info()
```

### Purpose

`df.info()` shows:

- Column names
- Number of non-null values
- Data types
- Approximate memory usage

This is an important data-quality check before preprocessing.

---

## Step 7 — Generate statistical summaries

For numerical columns:

```python
df.describe()
```

For categorical/object columns:

```python
df.describe(include='object')
```

### What this provides

For numerical variables:

- Count
- Mean
- Standard deviation
- Minimum
- Quartiles
- Maximum

For categorical variables:

- Number of unique values
- Most frequent value
- Frequency of the most common value

### Why?

This helps identify possible:

- Outliers
- Unusual ranges
- Distribution differences
- Highly variable features
- Dominant categories

---

# 5. Missing-Value Analysis

## Step 8 — Count missing values

The notebook calculates:

```python
missing_values = df.isnull().sum()
```

This shows the number of missing records for every column.

---

## Step 9 — Show only columns with missing values

The notebook filters the result:

```python
missing = df.isnull().sum()
missing = missing[missing > 0]
```

This makes the output easier to read because only affected columns are displayed.

---

## Step 10 — Calculate missing-value percentages

The notebook calculates:

```python
missing_percentage = (df.isnull().sum() / len(df)) * 100
```

Then it builds a table containing:

- Missing count
- Missing percentage

### Why?

A count alone does not show the scale of a problem.

For example:

- 500 missing values may be small in a huge dataset
- 500 missing values could be significant in a small dataset

Percentage gives better context.

---

# 6. Duplicate-Record Handling

## Step 11 — Detect duplicates

The notebook checks:

```python
duplicate_count = df.duplicated().sum()
```

This identifies repeated complete rows.

---

## Step 12 — Remove duplicates

Duplicates are removed with:

```python
df = df.drop_duplicates()
```

Later, the notebook repeats the duplicate check and removal:

```python
df = df.drop_duplicates().reset_index(drop=True)
```

### Purpose

Removing duplicate rows prevents repeated observations from unnecessarily affecting:

- Summary statistics
- Correlations
- Visualizations
- Any later machine-learning model

---

# 7. Date/Time Cleaning

## Step 13 — Convert `Datetime`

The notebook converts the date column using:

```python
df['Datetime'] = pd.to_datetime(
    df['Datetime'],
    errors='coerce'
)
```

### Why `errors='coerce'`?

If an invalid date is encountered, pandas converts it to `NaT` instead of stopping execution with an error.

---

## Step 14 — Check invalid dates

The notebook counts invalid datetime values:

```python
invalid_dates = df['Datetime'].isnull().sum()
```

This verifies whether date conversion created any invalid entries.

---

## Step 15 — Sort the dataset chronologically

The notebook uses:

```python
df = df.sort_values('Datetime').reset_index(drop=True)
```

### Purpose

Sorting by time is especially important for time-series air-pollution analysis because it puts observations into chronological order.

---

# 8. Numerical and Categorical Feature Identification

## Step 16 — Find numerical columns

The notebook identifies numerical variables with:

```python
numeric_columns = df.select_dtypes(
    include=[np.number]
).columns
```

### Purpose

These columns can be processed with numerical operations such as:

- Median imputation
- Normalization
- Statistical analysis
- Correlation analysis

---

## Step 17 — Fill missing numerical values

For every numerical column:

```python
df[column] = df[column].fillna(df[column].median())
```

### Why median?

The median is less sensitive to extreme values than the mean.

This makes it a practical choice for many environmental measurements where outliers may occur.

---

## Step 18 — Find categorical columns

The notebook identifies object columns using:

```python
categorical_columns = df.select_dtypes(
    include=['object']
).columns
```

---

## Step 19 — Fill missing categorical values

For each categorical column containing missing values:

```python
df[column] = df[column].fillna(
    df[column].mode()[0]
)
```

### Why mode?

The mode is the most frequently occurring category.

It provides a simple way to replace missing categorical entries while keeping the value within the existing category set.

---

## Step 20 — Verify remaining missing values

The notebook checks:

```python
df.isnull().sum().sum()
```

The goal is to confirm that missing values have been handled.

---

# 9. Pollution-Specific Data Cleaning

## Step 21 — Select major pollution columns

The notebook defines:

```python
pollution_columns = [
    'PM2.5', 'PM10', 'NO', 'NO2', 'NOx',
    'NH3', 'CO', 'SO2', 'O3',
    'Benzene', 'Toluene', 'Xylene'
]
```

It then keeps only columns that actually exist in the DataFrame.

---

## Step 22 — Replace negative pollution values

The notebook treats negative pollutant concentrations as invalid:

```python
df.loc[df[column] < 0, column] = np.nan
```

### Why?

Pollution concentrations should not normally be negative.

Instead of keeping those invalid values, the code converts them to missing values.

---

## Step 23 — Replace the new missing values with medians

After negative values become `NaN`, the notebook uses median imputation again:

```python
df[column] = df[column].fillna(df[column].median())
```

### Result

The pollution columns are left with non-negative usable values.

---

# 10. Exploratory Data Analysis (EDA)

EDA is used to understand the dataset before any advanced modeling.

## Step 24 — PM2.5 distribution

The notebook creates a histogram of PM2.5:

```python
plt.hist(df['PM2.5'], bins=50)
```

### What it shows

The plot helps examine:

- Frequency distribution
- Concentration ranges
- Skewness
- Possible extreme observations

---

## Step 25 — Correlation heatmap

The notebook creates a correlation matrix for numerical features:

```python
numeric_data = df.select_dtypes(include=[np.number])

sns.heatmap(
    numeric_data.corr(),
    cmap='coolwarm',
    center=0
)
```

### What correlation means

Correlation measures how two numerical variables move together.

Values near:

- `+1` → strong positive relationship
- `0` → weak or no linear relationship
- `-1` → strong negative relationship

The heatmap makes these relationships easier to identify visually.

> Correlation does **not** by itself prove causation.

---

# 11. Interactive Time-Series Analysis

## Step 26 — PM2.5 over time

The notebook uses Plotly:

```python
fig = px.line(
    df,
    x='Datetime',
    y='PM2.5'
)
```

### Purpose

This shows how PM2.5 changes over time.

It can help reveal:

- Seasonal patterns
- Long-term variation
- High-pollution periods
- Sudden changes

---

## Step 27 — AQI over time

If the AQI column exists, the notebook creates:

```python
fig = px.line(
    df,
    x='Datetime',
    y='AQI'
)
```

### Purpose

This visualizes changes in Air Quality Index across the observation period.

---

# 12. City-Level AQI Analysis

## Step 28 — Calculate average AQI by city

The notebook groups the data:

```python
city_aqi = (
    df.groupby('City')['AQI']
      .mean()
      .sort_values(ascending=False)
      .reset_index()
)
```

This creates:

```text
City
Average_AQI
```

### Purpose

It summarizes average AQI for each city.

---

## Step 29 — Interactive city comparison

The notebook creates a Plotly bar chart:

```python
px.bar(
    city_aqi,
    x='City',
    y='Average_AQI'
)
```

This allows the average AQI values to be visually compared across cities.

---

# 13. Average Pollution Analysis

## Step 30 — Calculate average value of each pollutant

The notebook calculates:

```python
pollution_average = (
    df[pollution_columns]
    .mean()
    .sort_values(ascending=False)
)
```

### Purpose

This gives an overall average concentration for each selected pollutant.

---

## Step 31 — Create an interactive pollutant comparison chart

The averages are converted into a small DataFrame and visualized with Plotly.

The resulting chart compares the average values of:

```text
PM2.5
PM10
NO
NO2
NOx
NH3
CO
SO2
O3
Benzene
Toluene
Xylene
```

---

# 14. Data Normalization

## Step 32 — Create a normalized copy

The notebook first copies the cleaned DataFrame:

```python
df_normalized = df.copy()
```

This preserves the cleaned version while creating a separate processed dataset.

---

## Step 33 — Apply Min-Max normalization

For numerical columns, the notebook calculates:

```python
(df[column] - minimum) / (maximum - minimum)
```

This converts values to the approximate range:

```text
0 to 1
```

### Formula

```text
Normalized value =
(value - minimum) / (maximum - minimum)
```

### Why normalization?

Normalization can help machine-learning algorithms when numerical features have very different scales.

Example:

```text
AQI            → hundreds
Humidity       → 0–100
Wind Speed     → tens
Pressure       → around 1000+
```

After Min-Max scaling, each feature is represented on a comparable 0–1 scale.

### Constant columns

If:

```text
maximum == minimum
```

the notebook sets the entire column to:

```python
0
```

to avoid division by zero.

---

# 15. Categorical Encoding

## Step 34 — Convert categorical values to numeric codes

The notebook finds categorical columns again:

```python
categorical_columns = df_normalized.select_dtypes(
    include=['object']
).columns
```

Then converts each categorical column to category codes:

```python
df_normalized[column] = (
    df_normalized[column]
    .astype('category')
    .cat.codes
)
```

### Example

A category such as:

```text
Good
Satisfactory
Moderate
Poor
Very Poor
```

is converted into numeric codes such as:

```text
0
1
2
3
4
```

The exact numeric code depends on the categorical encoding order generated by pandas.

### Why encode?

Many machine-learning algorithms require numerical input rather than text.

> Note: category codes are numeric identifiers; they should not automatically be interpreted as a meaningful continuous scale unless the category itself is ordinal and the encoding is intentionally designed that way.

---

# 16. Final Preprocessing Validation

## Step 35 — Check final dataset

The notebook prints:

```python
df_normalized.shape
df_normalized.isnull().sum().sum()
df_normalized.duplicated().sum()
```

The final check reports:

- Number of rows
- Number of columns
- Remaining missing values
- Remaining duplicates

This is the final quality-control stage before export.

---

# 17. Save the Preprocessed Dataset

## Step 36 — Export

The notebook saves the processed dataset using:

```python
df_normalized.to_csv(
    "IndiaAirPollution_Preprocessed.csv",
    index=False
)
```

The output file is:

```text
IndiaAirPollution_Preprocessed.csv
```

### Contents of the exported file

The exported data contains:

- Cleaned numerical values
- Normalized numerical features
- Encoded categorical features
- Original feature set after preprocessing

---

# 18. Display Final Data

## Step 37 — Preview the processed dataset

The notebook ends by displaying:

```python
df_normalized.head()
```

This provides a quick visual confirmation that the final processed data is available.

---

# 19. Complete Workflow in One Diagram

```text
                ┌───────────────────────────────┐
                │  Raw Air Pollution Dataset    │
                │     2017–2025 / 50,000 rows  │
                └───────────────┬───────────────┘
                                │
                                ▼
                 ┌─────────────────────────┐
                 │ Load Dataset with Pandas│
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Initial Data Inspection │
                 │ head / tail / info /    │
                 │ describe / columns     │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Missing Value Analysis │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Remove Duplicate Rows  │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Convert Datetime + Sort │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Fill Missing Numerical │
                 │ Values with Median     │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Fill Missing Categorical│
                 │ Values with Mode       │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Handle Negative         │
                 │ Pollution Measurements  │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Exploratory Data        │
                 │ Analysis + Visualizing  │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Min-Max Normalization  │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Categorical Encoding   │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Final Validation        │
                 │ missing / duplicates    │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Export Preprocessed CSV│
                 └─────────────────────────┘
```

---

# 20. How to Run the Project

## Step 1 — Install Python

Use Python 3.9+ (or another version compatible with the installed packages).

## Step 2 — Install Jupyter

```bash
pip install notebook
```

## Step 3 — Install required libraries

```bash
pip install pandas numpy matplotlib seaborn plotly openpyxl
```

`openpyxl` is not required by the current `read_csv()` code, but it can be useful if the project is later converted to use real Excel files.

## Step 4 — Place the files in the same folder

Recommended structure:

```text
7thSemProjectAIML/
├── Project_AIML7th Sem.ipynb
├── IndiaAirPollution_2017_25.csv
└── IndiaAirPollution_Preprocessed.csv
```

## Step 5 — Open Jupyter Notebook

Run:

```bash
jupyter notebook
```

Then open:

```text
Project_AIML7th Sem.ipynb
```

## Step 6 — Run cells from top to bottom

Run the notebook sequentially because later steps depend on the cleaned DataFrame created earlier.

---

# 21. Expected Result

After the notebook is completed, you should have:

1. A cleaned air-pollution dataset.
2. Missing values handled.
3. Duplicate rows removed.
4. Datetime converted and sorted.
5. Invalid negative pollution values handled.
6. EDA plots and interactive visualizations.
7. City-wise AQI analysis.
8. Average pollutant analysis.
9. Numerical features normalized to approximately 0–1.
10. Categorical variables converted to numeric codes.
11. A final preprocessed CSV file.

---

# 22. Important Observations About the Current Notebook

### 1. The notebook filename and dataset filename need alignment

The notebook currently expects:

```python
IndiaAirPollution_2017_25.csv
```

but the ZIP contains:

```text
IndiaAirPollution_2017_25.xls
```

The file content is CSV text, so rename it to `.csv` or change the notebook path.

### 2. The output format is CSV

The notebook explicitly creates:

```text
IndiaAirPollution_Preprocessed.csv
```

The included `.xls` preprocessed file is also CSV-formatted text rather than a native Excel workbook.

### 3. Some preprocessing steps are repeated

The notebook handles duplicates and `Datetime` conversion more than once. These repeated checks do not fundamentally change the workflow, but they could be consolidated to make the notebook cleaner.

### 4. No train/test split is present

The current notebook does not contain:

```text
train_test_split
```

or a similar model-development split.

### 5. No ML model is trained in the current notebook

There is currently no model such as:

```text
Linear Regression
Decision Tree
Random Forest
XGBoost
SVM
KNN
Neural Network
```

The notebook stops after preprocessing and analysis.

Therefore, a future ML stage would need to be added if the academic project requires prediction or classification.

---

# 23. Suggested Next AIML Stage

If this project is intended to become a complete machine-learning project, the next stage can be:

```text
Preprocessed Dataset
        ↓
Select Target Variable
        ↓
Select Features
        ↓
Train / Validation / Test Split
        ↓
Choose ML Algorithm
        ↓
Train Model
        ↓
Make Predictions
        ↓
Evaluate Model
        ↓
Compare Models
        ↓
Save Best Model
        ↓
Prediction / Dashboard / Application
```

Possible targets include:

- **AQI prediction** → regression
- **AQI category prediction** → classification
- **Pollution level forecasting** → time-series forecasting

Appropriate evaluation metrics would depend on the chosen task.

---

# 24. Project Summary for Viva / Presentation

You can explain the project in simple steps:

> “First, we collected and loaded the India air-pollution dataset. Then we inspected its structure, columns, data types, missing values, and duplicate records. We cleaned the data by removing duplicates, converting the datetime column, sorting the observations chronologically, filling missing numerical values using the median and categorical values using the mode. We also handled invalid negative pollution measurements. After cleaning, we performed exploratory data analysis using distributions, correlation heatmaps, time-series plots, city-wise AQI analysis, and pollutant comparison charts. Finally, we normalized numerical features using Min-Max scaling, converted categorical features into numeric codes, checked the final dataset quality, and exported the preprocessed dataset for further machine-learning work.”

---

# 25. Technologies Used

```text
Python
Pandas
NumPy
Matplotlib
Seaborn
Plotly
Jupyter Notebook
```

---

# 26. Project Objective

The main objective of the current implementation is to build a clean and analysis-ready air-pollution dataset that can be used for:

- Air-quality analysis
- Pollution trend analysis
- City-level comparisons
- Environmental pattern analysis
- Further machine-learning modeling

---

## Conclusion

This project establishes the complete **data preparation and exploratory analysis pipeline** for Indian air-pollution data. The processed dataset is ready to be used as the input for a future predictive or classification-based AIML model.
