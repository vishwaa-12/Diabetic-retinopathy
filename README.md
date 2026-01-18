# Diabetic Retinopathy Detection System

A machine learning system for detecting diabetic retinopathy in retinal images using computer vision and Random Forest classification.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Prepare training data:
   - Create a `data` folder
   - Add subfolders: `data/normal/` and `data/diabetic/`
   - Place retinal images in respective folders

## Usage

### Basic Usage
```python
from retinopathy_detector import RetinopathyDetector

detector = RetinopathyDetector()
detector.train("data")  # Train on your dataset
result = detector.predict("test_image.jpg")  # Predict on new image
print(result)
```

### Run Demo
```bash
python demo.py
```

## Features

- **Feature Extraction**: Statistical features, edge detection, histogram analysis
- **Machine Learning**: Random Forest classifier with cross-validation
- **Image Processing**: Automatic resizing and color space conversion
- **Evaluation**: Accuracy metrics and classification reports

## Data Structure
```
retinopathy/
├── data/
│   ├── normal/          # Normal retinal images
│   └── diabetic/        # Diabetic retinopathy images
├── test_images/         # Images for testing
└── retinopathy_detector.py
```

## Model Performance

The system extracts multiple features:
- Grayscale statistics (mean, std, median)
- HSV color space features
- Edge density from Canny edge detection
- Histogram features (16 bins)

Total: 25+ features per image for classification.