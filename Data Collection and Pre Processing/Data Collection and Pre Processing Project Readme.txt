# 🌍 Air Pollution Detection Using AdaBoost Ensemble Learning

## 📌 Project Overview

Air pollution is a major environmental and public-health challenge. The concentration of pollutants such as PM2.5, PM10, NO2, CO, SO2, O3 and other gases can vary significantly across locations and time.

This project focuses on **India Air Pollution Analysis and Air Pollution Detection using AdaBoost Ensemble Learning**.

The project follows an end-to-end workflow:

```text
Data Collection
      ↓
Data Understanding
      ↓
Data Cleaning
      ↓
Data Preprocessing
      ↓
Exploratory Data Analysis
      ↓
Feature Preparation
      ↓
AdaBoost Ensemble Learning
      ↓
Prediction / Detection
      ↓
Model Evaluation
```

---

## 🖼️ Project Workflow

![Air Pollution AdaBoost Workflow](assets/air-pollution-adaboost-workflow.png)

---

## 🎯 Objectives

The major objectives of this project are:

- Collect and understand India air-pollution data.
- Clean and preprocess the dataset.
- Handle missing values and invalid observations.
- Analyze pollution trends and relationships between features.
- Prepare suitable features for machine learning.
- Apply **AdaBoost Ensemble Learning** for air-pollution detection/prediction.
- Evaluate the performance of the trained model.
- Create a clean and reproducible workflow for future air-quality analysis.

---

## 📂 Project Structure

```text
air-pollution-adaboost/
│
├── Finalised_dataset/
│   └── final_dataset.csv
│
├── research/
│   └── research_material/
│
├── Data Collection and Pre Processing/
│   ├── data_collection
│   ├── preprocessing
│   └── notebooks/
│
├── assets/
│   └── air-pollution-adaboost-workflow.png
│
├── README.md
│
└── requirements.txt
```

> File names inside the folders can be changed according to the actual files present in the repository.

---

# 📊 Dataset

The project works with an India air-pollution dataset containing environmental and air-quality observations.

Important pollution-related features include:

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

The dataset may also contain:

```text
City
State
Station
Latitude
Longitude
Datetime
Temperature
Humidity
Wind Speed
Wind Direction
Rainfall
Pressure
Solar Radiation
Cloud Cover
AQI Category
```

The exact columns used by the final model depend on the final preprocessing and feature-selection stage.

---

# 🗂️ 1. Data Collection

The first stage of the project is collecting the air-pollution dataset.

The collected data contains observations related to:

- Air pollutants
- Air Quality Index (AQI)
- Geographic information
- Weather/environmental conditions
- Date and time information

The raw data is stored separately so that the original dataset can be preserved before preprocessing.

---

# 🧹 2. Data Pre Processing

The raw dataset is cleaned and transformed before being used for machine learning.

## 2.1 Data Inspection

The dataset is initially inspected using:

```python
df.head()
df.tail()
df.shape
df.info()
df.describe()
```

This helps understand:

- Number of records
- Number of features
- Data types
- Statistical distribution
- Missing values
- Possible invalid observations

---

## 2.2 Missing Value Handling

Missing values are identified using:

```python
df.isnull().sum()
```

For numerical features, missing values can be handled using median imputation:

```python
df[column] = df[column].fillna(df[column].median())
```

For categorical features, missing values can be handled using the most frequent category:

```python
df[column] = df[column].fillna(df[column].mode()[0])
```

---

## 2.3 Duplicate Removal

Duplicate records are checked using:

```python
df.duplicated().sum()
```

Duplicates are removed using:

```python
df = df.drop_duplicates()
```

This helps avoid repeated records affecting the analysis or model.

---

## 2.4 Datetime Processing

The datetime column is converted into a proper datetime format:

```python
df['Datetime'] = pd.to_datetime(
    df['Datetime'],
    errors='coerce'
)
```

The data can then be sorted chronologically:

```python
df = df.sort_values('Datetime').reset_index(drop=True)
```

This is useful for time-based air-pollution analysis.

---

## 2.5 Invalid Pollution Values

Pollution concentrations are checked for invalid negative values.

Example:

```python
df.loc[df[column] < 0, column] = np.nan
```

The resulting missing values can then be handled using a suitable imputation method.

---

# 📈 3. Exploratory Data Analysis

Exploratory Data Analysis is performed to understand the characteristics of the dataset before model training.

## PM2.5 Distribution

The distribution of PM2.5 is analyzed using histograms.

## Correlation Analysis

A correlation matrix can be used to understand relationships between numerical variables.

```python
numeric_data = df.select_dtypes(include=[np.number])
corr = numeric_data.corr()
```

A heatmap can then be created using Seaborn.

## Time-Series Analysis

Pollution and AQI values can be visualized against time to identify:

- Seasonal patterns
- Pollution peaks
- Long-term changes
- Sudden changes in air quality

## City-Wise Analysis

Average AQI can be calculated for different cities:

```python
city_aqi = (
    df.groupby('City')['AQI']
      .mean()
      .sort_values(ascending=False)
      .reset_index()
)
```

---

# ⚙️ 4. Feature Preparation

Before applying machine learning, the dataset must be converted into a suitable numerical format.

## Numerical Feature Scaling

Min-Max normalization can be applied:

```text
Normalized Value =
(Value - Minimum) / (Maximum - Minimum)
```

This transforms numerical features to an approximately common scale.

Example:

```python
df[column] = (
    df[column] - df[column].min()
) / (
    df[column].max() - df[column].min()
)
```

---

## Categorical Encoding

Categorical variables are converted into numerical values before model training.

Example:

```python
df[column] = (
    df[column]
    .astype('category')
    .cat.codes
)
```

The exact encoding method should be selected according to the meaning of each categorical variable.

---

# 🤖 5. AdaBoost Ensemble Learning

## What is AdaBoost?

**AdaBoost (Adaptive Boosting)** is an ensemble machine-learning technique that combines multiple weak learners to create a stronger predictive model.

The basic idea is:

```text
Training Data
     ↓
Weak Learner
     ↓
Identify Difficult / Incorrectly Classified Samples
     ↓
Increase Their Importance
     ↓
Train Next Weak Learner
     ↓
Repeat
     ↓
Combine Weak Learners
     ↓
Final Strong Model
```

AdaBoost focuses progressively on observations that are harder for previous learners to predict correctly.

---

# 🧠 6. AdaBoost Model Workflow

The machine-learning stage follows this process:

```text
Preprocessed Dataset
        ↓
Select Features
        ↓
Select Target
        ↓
Train/Test Split
        ↓
Initialize Base Estimator
        ↓
Train AdaBoost
        ↓
Generate Predictions
        ↓
Evaluate Model
```

A typical implementation can look like:

```python
from sklearn.ensemble import AdaBoostClassifier
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

model = AdaBoostClassifier(
    random_state=42
)

model.fit(X_train, y_train)

y_pred = model.predict(X_test)
```

> Use `AdaBoostRegressor` instead when the target variable is continuous, such as predicting a numerical AQI value.

---

# 📊 7. Model Evaluation

The evaluation method depends on the machine-learning task.

## Classification

For AQI-category or pollution-category detection, common metrics include:

```text
Accuracy
Precision
Recall
F1-Score
Confusion Matrix
```

Example:

```python
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)

print("Accuracy:", accuracy_score(y_test, y_pred))
print("Precision:", precision_score(
    y_test, y_pred, average='weighted'
))
print("Recall:", recall_score(
    y_test, y_pred, average='weighted'
))
print("F1 Score:", f1_score(
    y_test, y_pred, average='weighted'
))
```

## Regression

When predicting numerical AQI or pollutant values, suitable metrics include:

```text
MAE
MSE
RMSE
R² Score
```

---

# 🧪 8. Train-Test Split

The dataset should be divided into training and testing subsets.

Example:

```python
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)
```

The training data is used to learn patterns, while the testing data is used to evaluate how the model performs on unseen records.

---

# 📌 9. Final Dataset

The cleaned and processed dataset is stored inside:

```text
Finalised_dataset/
```

This directory is intended to contain the final dataset used for further machine-learning experiments.

---

# 🔬 10. Research

The `research/` directory contains supporting research material related to:

- Air pollution
- Air Quality Index
- Machine learning
- Ensemble learning
- AdaBoost
- Related studies and references

---

# 📁 11. Data Collection and Pre Processing

The `Data Collection and Pre Processing/` directory contains the work related to:

```text
Data Collection
Data Cleaning
Data Exploration
Feature Engineering
Data Transformation
Data Preparation
```

This separates the raw-data preparation stage from the final model stage.

---

# 🛠️ Technologies Used

```text
Python
Pandas
NumPy
Matplotlib
Seaborn
Plotly
Scikit-learn
Jupyter Notebook
```

---

# 📦 Installation

Clone the repository:

```bash
git clone https://github.com/<your-username>/air-pollution-adaboost.git
```

Move into the project directory:

```bash
cd air-pollution-adaboost
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

If `requirements.txt` is not available, the main libraries can be installed using:

```bash
pip install pandas numpy matplotlib seaborn plotly scikit-learn jupyter
```

---

# ▶️ How to Run

Start Jupyter Notebook:

```bash
jupyter notebook
```

Then open the required notebook from:

```text
Data Collection and Pre Processing/
```

Run the cells sequentially from data loading through preprocessing and model training.

---

# 🔄 Complete Project Pipeline

```text
                    INDIA AIR POLLUTION DATA
                              │
                              ▼
                    ┌───────────────────┐
                    │  Data Collection  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Data Understanding│
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  Data Cleaning    │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Missing Values    │
                    │ & Duplicates      │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Datetime &        │
                    │ Pollution Checks  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Exploratory Data  │
                    │ Analysis          │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Feature Preparation│
                    │ & Encoding        │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Train/Test Split  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ AdaBoost Ensemble │
                    │ Learning          │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Predictions       │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Model Evaluation  │
                    └───────────────────┘
```

---

# 📊 Results

Add your actual model results here after running the final model.

Example:

```text
Model: AdaBoost

Accuracy: XX.XX%
Precision: XX.XX%
Recall: XX.XX%
F1 Score: XX.XX%
```

For a regression model, use:

```text
MAE: XX.XX
MSE: XX.XX
RMSE: XX.XX
R²: XX.XX
```

> Replace the `XX.XX` values with the actual results from your project. Do not use placeholder values as final results.

---

# 🌱 Future Scope

Possible future improvements include:

- Hyperparameter tuning
- Comparison with Random Forest, Gradient Boosting and XGBoost
- Feature selection and importance analysis
- Time-series forecasting
- Real-time air-quality prediction
- Web-based visualization dashboard
- Deployment as a machine-learning application
- Integration with live air-quality APIs
- Explainable AI techniques for model interpretation

---

# ✅ Conclusion

This project presents an end-to-end approach for **India Air Pollution Analysis and detection/prediction using AdaBoost Ensemble Learning**.

The workflow starts with data collection and preprocessing, followed by exploratory analysis and feature preparation. The processed data is then used for ensemble learning with AdaBoost, followed by prediction and model evaluation.

The project provides a structured foundation for applying machine learning to air-quality and environmental data.

---

## 👨‍💻 Project Information

```text
Project Name:
Air Pollution Detection Using AdaBoost Ensemble Learning

Domain:
Artificial Intelligence and Machine Learning

Application Area:
Air Quality / Environmental Data Analysis

Main Algorithm:
AdaBoost Ensemble Learning
```

---

## ⭐ Acknowledgement

This project was developed as part of an **AIML 7th Semester Academic Project** focused on air-pollution analysis and machine-learning-based detection/prediction.
