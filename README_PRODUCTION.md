# Diabetic Retinopathy Predictor

Minimal production-ready diabetic retinopathy detection system.

## Files
- `dr_predictor.py` - Main predictor class
- `dr_model_optimized.pkl` - Trained model (96.23% accuracy)
- `requirements_minimal.txt` - Production dependencies
- `colored_images/` - Dataset (for testing)

## Quick Start
```bash
pip install -r requirements_minimal.txt
python dr_predictor.py
```

## Usage
```python
from dr_predictor import DRPredictor

predictor = DRPredictor()
result = predictor.predict("image.jpg")
print(result['class'])  # Mild, Moderate, No_DR, Proliferate_DR, Severe
```

## Model Performance
- **Accuracy**: 96.23%
- **Classes**: No_DR, Mild, Moderate, Severe, Proliferate_DR
- **Features**: 106 per image
- **Algorithm**: XGBoost