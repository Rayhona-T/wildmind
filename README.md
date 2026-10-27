# WildMind: The Forgotten Species

An educational pixel-art wildlife investigation that classifies animals with a real scikit-learn decision tree trained on the [UCI Zoo dataset](https://archive.ics.uci.edu/dataset/111/zoo).

Tagline: *Seven families. Countless characteristics. Can you identify the unknown?*

## What you can do

- Investigate 16 traits in the Specimen Lab and send them to the saved model.
- Compare predictions with known dataset labels.
- Browse 101 archive records.
- Edit traits in the Experiment Chamber and rerun the real model.
- Unlock sanctuary habitats as you visit families.
- Read held-out test metrics, a confusion matrix, and tree feature importance in the Observatory.

Predictions come from `zoo_model.joblib`. The interface never invents a class or a confidence score.

## Model

The original artifact was a `DecisionTreeClassifier(max_depth=6, random_state=1)` pickled with scikit-learn 1.6.1. A backup is stored as `zoo_model.original.joblib`.

The served file `zoo_model.joblib` is retrained with the **same hyperparameters** on a documented stratified hold-out so Observatory numbers match the model that answers `/api/predict`:

- `StratifiedShuffleSplit(test_size=0.25, random_state=1)`
- 75 training rows, 26 test rows
- Training accuracy is reported separately and is **not** test accuracy

The dataset is small and imbalanced. Amphibians and reptiles have very few examples, so per-class scores can move a lot with a different split.

To regenerate the model and `ml/model_metadata.json`:

```text
python ml/train_model.py
python ml/evaluate_model.py
```

## Features and classes

Predictive features (animal name is **not** a feature): hair, feathers, eggs, milk, airborne, aquatic, predator, toothed, backbone, breathes, venomous, fins, legs, tail, domestic, catsize.

`legs` is one of `{0, 2, 4, 5, 6, 8}`. Other features are binary.

Dataset classes:

1. Mammals  
2. Birds  
3. Reptiles  
4. Fish  
5. Amphibians  
6. Insects  
7. Other invertebrates  

These seven families are the Zoo dataset scheme, not a complete modern taxonomy.

## Run locally

Python 3.10+ (developed against 3.14).

```text
python -m venv .venv
```

Windows:

```text
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

macOS / Linux:

```text
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000

Optional dataset refresh (already stored in `data/zoo.csv`):

https://archive.ics.uci.edu/ml/machine-learning-databases/zoo/zoo.data

## Tests

```text
python -m pytest tests/test_prediction.py tests/test_routes.py -q
node tests/test_progression.js
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Model and dataset status |
| GET | `/api/metadata` | Feature order, categories, capabilities |
| GET | `/api/records` | Dataset animals |
| POST | `/api/predict` | Classify 16 features |
| POST | `/api/evaluate-record` | Predict plus known label |
| GET | `/api/evaluate-model` | Stored hold-out metrics |

POST `/api/predict` body: `{ "features": { ...16 keys } }`.

## Limitations

- The model can misclassify, especially rare classes.
- `predict_proba` values are tree vote shares, not calibrated probabilities.
- Hypothetical trait mixes are not real animals.
- Progress is stored in `localStorage` only.
