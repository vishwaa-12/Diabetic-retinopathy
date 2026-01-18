# Diabetic Retinopathy Detection System

Complete web application for diabetic retinopathy detection with patient management and AI analysis.

## Features
- 👤 Patient information form
- 📷 Retinal image upload
- 🔬 AI-powered analysis (96.23% accuracy)
- 📊 Detailed severity assessment
- 🖨️ Printable reports

## Quick Start

1. **Install dependencies:**
```bash
pip install -r requirements_web.txt
```

2. **Run the web application:**
```bash
python app.py
```

3. **Open browser:**
```
http://localhost:5000
```

## Usage
1. Fill patient details (name, age, gender, diabetes duration)
2. Upload retinal image (PNG/JPG/JPEG)
3. Click "Analyze Retinal Image"
4. View detailed results with severity classification

## Severity Classes
- **No_DR**: No diabetic retinopathy
- **Mild**: Mild non-proliferative DR
- **Moderate**: Moderate non-proliferative DR  
- **Severe**: Severe non-proliferative DR
- **Proliferate_DR**: Proliferative DR

## Model Performance
- **Accuracy**: 96.23%
- **Algorithm**: XGBoost
- **Features**: 106 per image