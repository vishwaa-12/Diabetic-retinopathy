# 👁️ Diabetic Retinopathy Intelligent Diagnosis System – Project Report

## 1. Executive Summary
This project is an **AI-powered medical diagnostic web application** designed to screen retinal fundus images for signs of **Diabetic Retinopathy (DR)**. It combines **Machine Learning (Random Forest)** with advanced **Computer Vision (Image Processing)** techniques to classify severity levels, assess progression risk, and provide medical-grade actionable recommendations.

The system features a premium, responsive user interface, robust input validation, and a persistent patient history database, making it a complete end-to-end solution for automated eye screening.

---

## 2. Key Features Breakdown

### 🧠 A. Core Diagnostic Engine (Backend)
The heart of the system is a Python-based Flask application that processes images through a multi-stage pipeline:

1.  **Intelligent Image Preprocessing**:
    *   **CLAHE (Contrast Limited Adaptive Histogram Equalization)**: Enhances local contrast to make tiny lesions (microaneurysms) visible.
    *   **Green Channel Extraction**: Isolates the green channel of the RGB image, where vascular structures and hemorrhages are most distinct.
    *   **Gaussian Blurring**: Reduces noise to prevent false positives.

2.  **Hybrid Classification Logic**:
    *   **Feature Extraction**: The system mathematically analyzes the image to extract:
        *   *Vascular Density*: How dense the blood vessels are.
        *   *Lesion Area*: The total area of bright spots (exudates) and dark spots (hemorrhages).
        *   *Texture Variance*: The roughness of the retinal surface.
    *   **Machine Learning Model**: A trained **Random Forest Classifier** (`dr_model.pkl`) predicts the severity class based on these extracted features.
    *   **Heuristic Fallback**: A rule-based system acts as a safety net to sanity-check the ML model's predictions (e.g., ensuring high lesion counts are not classified as "No DR").

3.  **Strict Input Validation**:
    *   **Anti-Spam/Anti-Error**: The system detects and **rejects** non-retinal images (e.g., charts, documents, scenic photos) by checking:
        *   *Aspect Ratio*: Ensures standard medical image dimensions.
        *   *Brightness/Variance*: Rejects images that are too bright (like white paper).
        *   *Spectral Signature*: Verifies the "Red Dominance" typical of human retinal tissue.

---

### 💻 B. User Interface & Experience (Frontend)
The frontend is built with **HTML5, CSS3 (Glassmorphism), and Vanilla JavaScript**, focusing on trust and usability.

1.  **Modern Dashboard**:
    *   **Drag & Drop Upload**: Intuitive zone for uploading scans.
    *   **Simulated AI Pipeline**: A visual loading screen shows the user exactly what steps the AI is taking (e.g., "Preprocessing...", "Feature Extraction..."), building trust in the process.

2.  **Comprehensive Diagnosis Report**:
    *   **Severity Classification**: Clear labeling (No DR, Mild, Moderate, Severe, Proliferative).
    *   **Risk Probability Score**: A calculated percentage indicating the risk of disease progression.
    *   **Interactive Charts**:
        *   *Confidence Bar Chart*: Shows the model's certainty across all 5 classes.
        *   *Risk Projection Graph*: A roadmap simulating how the condition might worsen over 5 years.
    *   **Medical Recommendations**: Dynamic advice changes based on severity (e.g., "Maintain annual exams" vs. "Immediate Anti-VEGF intervention required").

3.  **Patient History Database**:
    *   **Persistent Logging**: Every analysis is automatically saved to a JSON database.
    *   **Bulk Management**: Users can **Select All** or check specific records to **Bulk Delete** them from the history.
    *   **Security**: Invalid images are logged as "Rejected" for audit trails but clearly distinguished from valid diagnoses.

---

## 3. Technology Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Backend** | **Python (Flask)** | API Server, Routing, Logic Controller |
| **AI/ML** | **Scikit-Learn** | Random Forest Classifier, Model Training |
| **Image Proc** | **Pillow (PIL) / Numpy** | Pixel manipulation, Feature Extraction |
| **Frontend** | **HTML5 / CSS3** | Layout, Glassmorphism Design, Responsive Grid |
| **Scripting** | **JavaScript (ES6+)** | DOM Manipulation, API Calls, Chart.js Integration |
| **Data** | **JSON** | Lightweight NoSQL-style storage for patient history |

---

## 4. Workflow Walkthrough
1.  **Upload**: User uploads a retinal scan.
2.  **Validation**: Server checks if it's a valid eye image.
3.  **Analysis**:
    *   Features are extracted (lesions, vessels).
    *   ML Model predicts severity (0-4).
4.  **Result**: Frontend receives JSON data.
5.  **Display**:
    *   Dashboard reveals the diagnosis.
    *   Charts animate to show risk factors.
    *   Results are auto-saved to History.
6.  **Action**: User can download a PDF report or review past cases in the History tab.
