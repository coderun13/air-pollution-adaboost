# ML Problem Definition — AIRWATCH AI

## 1. Problem Statement
Air pollution poses a significant environmental and public-health challenge. The goal of this project is to develop a machine-learning classification system capable of classifying air-quality conditions using measured pollutant concentrations.

## 2. Research Question
Can an AdaBoost ensemble learning model effectively classify air-quality conditions using multiple pollutant measurements, and how does its performance improve over a single Decision Tree baseline?

## 3. Machine Learning Type
Supervised Learning — Multi-class Classification.

## 4. Primary Algorithm
AdaBoost Classifier with a Decision Tree base learner.

## 5. Dataset
Primary candidate: `station_day.csv`, containing historical daily station-level measurements from 2015–2024 (`36,530` records)[cite: 1]. Dataset quality and AQI target validity are verified prior to training, with `city_day.csv` retained for secondary/city-level analysis[cite: 1].

## 6. Input Features (X)
Candidate pollutant measurements (standardized):
- `PM2_5` (from `PM2.5`)
- `PM10`
- `NO2`
- `SO2`
- `CO`
- `O3`
- `NH3`

Features are selected based on data availability, validity, units, and consistency. Raw `AQI` and `AQI_Bucket` are excluded from `X` to prevent target leakage.

## 7. Target Variable (y)
`aqi_category` — a six-class air-quality category derived from verified CPCB AQI calculation rules and pollutant measurements. The original `AQI_Bucket` field is not used as ground truth because initial data investigation found inconsistencies between numeric `AQI` values and category labels.

## 8. Target Classes
`Good`, `Satisfactory`, `Moderate`, `Poor`, `Very Poor`, `Severe`.

## 9. Preprocessing
- Data cleaning
- Type conversion
- Duplicate removal
- Missing-value handling
- Invalid measurement investigation
- Feature selection and unit alignment (including `CO` scale normalization across sources)
- Verified AQI target generation
- Class imbalance analysis

## 10. Models for Comparison
- AdaBoost Classifier (primary model)
- Decision Tree Classifier (baseline)

## 11. Evaluation Metrics
- Accuracy
- Precision
- Recall
- F1-score
- Confusion Matrix

For multi-class evaluation, macro-F1 and weighted-F1 are reported alongside accuracy.

## 12. Validation Strategy
The dataset is split chronologically into training and testing subsets (`2015-01-01 -> 2022-12-31` train and `2023-01-01 -> 2024-12-31` test) so future observations do not leak into training and temporal dependencies are respected.

## 13. Expected Outcome
A validated air-quality classification pipeline that uses pollution parameters to predict air-quality categories, compares AdaBoost against a Decision Tree baseline, and provides measurable evaluation results and saved model artifacts for AIRWATCH AI.

## 14. Limitations
- Historical dataset quality and station coverage may vary by city and station.
- Severe class imbalance across CPCB categories (e.g., very few `Good` or `Satisfactory` observations) affects rare-class evaluation.
- Original `AQI_Bucket` category labels are unreliable.
- Missing pollutant measurements or unit/scale differences (`µg/m³` vs. `mg/m³`) may reduce usable samples or affect cross-dataset inference.
- Performance on historical data or single-snapshot live feeds may not generalize to every city or current condition, and a model prediction is not equivalent to an official CPCB AQI bulletin.