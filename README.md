# Diabetic-retinopathy

## System Architecture Diagram
A high-quality system architecture diagram has been generated for the project:
- **System Architecture Infographic**: [Open diagram_viz/system_architecture.html](./diagram_viz/system_architecture.html) (Frontend/Backend Split).
- **Documentation**: [architecture_diagram.md](./architecture_diagram.md) (Mermaid).

## Web Application (Working Model)
A complete working prototype of the diagnostic pipeline has been implemented in the `app/` directory.

### Features
- **Frontend**: Medical-grade Upload Interface & Interactive Dashboard (HTML/CSS/JS).
- **Backend**: Python Flask connecting VGG16 (Feature Extraction) and XGBoost (Classification).
- **Visualization**: Chart.js integration for Risk and Probability graphs.

### How to Run
1. Navigate to the app directory:
   ```bash
   cd app
   ```
2. Install dependencies:
   ```bash
   pip install -r ../requirements.txt
   ```
3. Run the Flask Server:
   ```bash
   python app.py
   ```
4. Open your browser at `http://localhost:3000`.


