document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const uploadSection = document.getElementById("uploadSection");
  const loadingSection = document.getElementById("loadingSection");
  const dashboardSection = document.getElementById("dashboardSection");
  const historySection = document.getElementById("historySection");

  // Elements to update
  const diagnosisText = document.getElementById("diagnosisText");
  const riskScore = document.getElementById("riskScore");
  const meterFill = document.getElementById("confidenceFill");
  const previewImage = document.getElementById("previewImage");
  const recommendationText = document.getElementById("recommendationText");

  // Store current analysis result globally for print preview
  window.currentAnalysisResult = null;
  window.currentPatientData = null;

  // Drag & Drop Handlers
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#009688";
    dropZone.style.background = "#e0f2f1";
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#cfd8dc";
    dropZone.style.background = "#ffffff";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    // Validate Patient Form
    const name = document.getElementById("patientName").value.trim();
    const age = document.getElementById("patientAge").value.trim();
    const mobile = document.getElementById("patientMobile").value.trim();

    if (!name || !age || !mobile) {
      alert(
        "Please enter all patient details (Name, Age, Mobile) before uploading."
      );
      fileInput.value = ""; // Reset file input
      return;
    }

    // Validate Age (Max 2 digits, numeric)
    const ageRegex = /^[0-9]{1,2}$/;
    if (!ageRegex.test(age) || parseInt(age) <= 0) {
      alert("Age must be a valid number (1-99).");
      fileInput.value = "";
      return;
    }

    // Validate Mobile (Exactly 10 numeric digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      alert(
        "Mobile number must correspond to Indian Standard (Exactly 10 numeric digits, no characters)."
      );
      fileInput.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    // Show Image Preview Immediate
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;

      // Store patient data AFTER image is ready ✅
      window.currentPatientData = {
        name: name,
        age: age,
        mobile: mobile,
        imageSrc: e.target.result,
      };
    };
    reader.readAsDataURL(file);

    // UI Transition
    uploadSection.classList.add("hidden");
    loadingSection.classList.remove("hidden");

    // Simulate Progressive Loading Steps
    simulateSteps();

    // Send to Backend
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("age", age);
    formData.append("mobile", mobile);

    fetch("/analyze", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server Error: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          alert("Analysis Failed: " + data.error);
          location.reload();
        } else {
          // Store result globally for print preview
          window.currentAnalysisResult = data.data;

          // Success - Show Result
          setTimeout(() => {
            showDashboard(data.data);
          }, 2000); // 2s delay for effect
        }
      })
      .catch((err) => {
        console.error(err);
        alert("An error occurred during upload: " + err.message);
        // Reset UI
        loadingSection.classList.add("hidden");
        uploadSection.classList.remove("hidden");
        fileInput.value = "";
      });
  }

  function simulateSteps() {
    const steps = ["step1", "step2", "step3", "step4", "step5"];
    let delay = 0;
    steps.forEach((id, index) => {
      setTimeout(() => {
        document
          .querySelectorAll(".step")
          .forEach((s) => s.classList.remove("active"));
        document.getElementById(id).classList.add("active");
      }, delay);
      delay += 800;
    });
  }

  let probChartInstance = null;
  let riskChartInstance = null;

  function showDashboard(result) {
    loadingSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");

    // Update Text
    diagnosisText.innerText = result.class;
    riskScore.innerText = `Progression Risk: ${result.progression_risk}%`;
    meterFill.style.width = `${result.progression_risk}%`;

    // Determine Color & Recommendation
    const severity = result.severity_index;
    let recText = "";

    if (severity === -1) {
      // Invalid Input Case
      diagnosisText.style.color = "#7f8c8d"; // Grey
      recText =
        result.error ||
        "Image Rejected. Please upload a valid retinal fundus scan.";
      // Hide risk info for invalid
      riskScore.innerText = "N/A";
      meterFill.style.width = "0%";
    } else {
      // Valid Diagnosis
      const color =
        severity === 0 ? "#00bfa5" : severity < 3 ? "#fb8c00" : "#d32f2f";
      diagnosisText.style.color = color;

      const recs = [
        `<strong>✅ Low Risk (No Apparent DR)</strong><br>
                <ul style='text-align:left; margin-top:10px; padding-left:20px;'>
                    <li>Maintain annual comprehensive eye examinations.</li>
                    <li>Continue strict control of blood glucose (HbA1c < 7%) and blood pressure.</li>
                    <li>Monitor lipid profile regularly.</li>
                </ul>`,

        `<strong>⚠️ Mild Non-Proliferative DR</strong><br>
                <ul style='text-align:left; margin-top:10px; padding-left:20px;'>
                    <li>Schedule follow-up appointment in 6-12 months.</li>
                    <li>Optimize glycemic control to delay progression.</li>
                    <li>Manage blood pressure and cholesterol levels aggressively.</li>
                </ul>`,

        `<strong>👨‍⚕️ Moderate Non-Proliferative DR</strong><br>
                <ul style='text-align:left; margin-top:10px; padding-left:20px;'>
                    <li><strong>Referral Required:</strong> Consult ophthalmologist within 3-6 months.</li>
                    <li>Consider Fluorescein Angiography to assess retinal ischemia.</li>
                    <li>monitor for signs of Macular Edema.</li>
                </ul>`,

        `<strong>🚨 Severe Non-Proliferative DR</strong><br>
                <ul style='text-align:left; margin-top:10px; padding-left:20px;'>
                    <li><strong>Urgent Referral:</strong> Consult retina specialist within 2-4 weeks.</li>
                    <li>High risk of progression to PDR. Closely monitor vision changes.</li>
                    <li>Pan-retinal photocoagulation (PRP) laser therapy may be indicated.</li>
                </ul>`,

        `<strong>🚑 Proliferative DR (High Risk)</strong><br>
                <ul style='text-align:left; margin-top:10px; padding-left:20px;'>
                    <li><strong>Immediate Intervention Required:</strong> High risk of severe vision loss.</li>
                    <li>Treatments typically include Anti-VEGF injections or Vitrectomy.</li>
                    <li>Avoid strenuous physical activity that increases blood pressure until treated.</li>
                </ul>`,
      ];
      recText = recs[severity] || "Consult a specialist.";
    }

    recommendationText.innerHTML = recText;

    // Charts
    renderCharts(result);

    // Setup Print Button
    setupPrintButton();
  }

  function renderCharts(result) {
    const ctxProb = document.getElementById("probChart").getContext("2d");
    const ctxRisk = document.getElementById("riskChart").getContext("2d");

    // Prob Chart - Enforce Order
    const orderedLabels = [
      "No DR",
      "Mild",
      "Moderate",
      "Severe",
      "Proliferative",
    ];
    const data = orderedLabels.map((label) =>
      (result.probabilities[label] * 100).toFixed(1)
    );
    const labels = orderedLabels;

    if (probChartInstance) probChartInstance.destroy();

    probChartInstance = new Chart(ctxProb, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Confidence (%)",
            data: data,
            backgroundColor: [
              "#00bfa5" /* No DR - Medical Teal */,
              "#29b6f6" /* Mild - Blue */,
              "#ffb74d" /* Moderate - Warning Orange */,
              "#ef5350" /* Severe - Soft Red */,
              "#c62828" /* Proliferative - Deep Red */,
            ],
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });

    // Risk Graph (Simulated Progression)
    const timeLabels = ["Year 1", "Year 2", "Year 3", "Year 5"];
    const baseRisk = result.progression_risk;
    const severity = result.severity_index;
    let slope = 5;
    if (severity === 0) slope = 2;
    else if (severity === 1) slope = 5;
    else if (severity === 2) slope = 12;
    else if (severity === 3) slope = 20;
    else if (severity === 4) slope = 1;

    const riskTrend = timeLabels.map((t, i) =>
      Math.min(100, baseRisk + i * slope)
    );

    if (riskChartInstance) riskChartInstance.destroy();

    riskChartInstance = new Chart(ctxRisk, {
      type: "line",
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: "Projected Risk",
            data: riskTrend,
            borderColor: "#1976d2",
            tension: 0.4,
            fill: true,
            backgroundColor: "rgba(25, 118, 210, 0.1)",
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });
  }

  function setupPrintButton() {
    const printBtn = document.getElementById("downloadPdfBtn");

    if (!printBtn) {
      console.error("Print button not found!");
      return;
    }

    // Update button text and icon
    printBtn.innerHTML = '<i class="fa fa-print"></i> Print Report';
    printBtn.classList.remove("primary");
    printBtn.classList.add("print-btn");

    // Remove any existing event listeners
    const newBtn = printBtn.cloneNode(true);
    printBtn.parentNode.replaceChild(newBtn, printBtn);

    newBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      // Show print preview
      showPrintPreview();
    });

    console.log("Print button setup complete");
  }

  function showPrintPreview() {
    // Create print preview modal
    const printPreview = document.createElement("div");
    printPreview.id = "printPreview";
    printPreview.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 9999;
        overflow-y: auto;
        padding: 15px;
        font-family: 'Outfit', sans-serif;
        box-sizing: border-box;
    `;

    // Get current date
    const now = new Date();
    const formattedDate = now.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Get severity color for diagnosis
    const severity = window.currentAnalysisResult.severity_index;
    let diagnosisColor = "#2c3e50";
    if (severity === 0) diagnosisColor = "#00bfa5";
    else if (severity === -1) diagnosisColor = "#95a5a6";
    else if (severity === 4 || severity === 3) diagnosisColor = "#d32f2f";
    else diagnosisColor = "#fb8c00";

    // Get recommendation text
    const recommendationElement = document.getElementById("recommendationText");
    let printRecommendation = recommendationElement
      ? recommendationElement.innerHTML
      : "";

    // Get the preview image src
    const imageSrc = window.currentPatientData?.imageSrc || "";

    // Create image HTML with smaller size
    let imageHtml = "";
    if (imageSrc && imageSrc !== "" && imageSrc !== "data:") {
      imageHtml = `
            <div style="text-align: center; margin-top: 8px;">
                <img src="${imageSrc}" 
                     style="max-width: 180px; max-height: 120px; border: 1px solid #ddd; border-radius: 4px; display: inline-block;" 
                     onerror="this.style.display='none'" />
            </div>
        `;
    } else {
      imageHtml = `
            <div style="text-align: center; margin-top: 8px; padding: 15px; background: #f5f5f5; border-radius: 4px;">
                <p style="color: #999; font-size: 12px; font-style: italic;">Image not available for print</p>
            </div>
        `;
    }

    // Create print content with smaller elements
    printPreview.innerHTML = `
        <div style="max-width: 210mm; margin: 0 auto; padding: 15px; box-sizing: border-box;">
            <!-- Print Header -->
            <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #d32f2f;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 22px; line-height: 1.2;">RetinaAI Pro</h1>
                <h3 style="color: #666; margin: 3px 0 8px 0; font-weight: normal; font-size: 13px;">
                    Advanced Diabetic Retinopathy Diagnosis System
                </h3>
            </div>
            
            <!-- Report Header -->
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2c3e50; font-size: 16px; margin: 0 0 5px 0; font-weight: 600;">DIAGNOSIS REPORT</h2>
                <p style="color: #666; font-size: 11px; margin: 0;">
                    Report ID: RAI-${Date.now()
                      .toString()
                      .slice(-8)} | Generated: ${formattedDate}
                </p>
            </div>
            
            <!-- Patient Information -->
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="color: #2c3e50; background: #f5f5f5; padding: 6px 10px; border-left: 3px solid #2980b9; font-size: 13px; margin: 0 0 10px 0; font-weight: 500;">
                    PATIENT INFORMATION
                </h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px;">
                    <div>
                        <p style="margin: 2px 0; color: #666; font-size: 11px;"><strong>Name:</strong></p>
                        <p style="margin: 2px 0; font-size: 13px; font-weight: 600;">${
                          window.currentPatientData.name
                        }</p>
                    </div>
                    <div>
                        <p style="margin: 2px 0; color: #666; font-size: 11px;"><strong>Age:</strong></p>
                        <p style="margin: 2px 0; font-size: 13px;">${
                          window.currentPatientData.age
                        } years</p>
                    </div>
                    <div>
                        <p style="margin: 2px 0; color: #666; font-size: 11px;"><strong>Mobile:</strong></p>
                        <p style="margin: 2px 0; font-size: 13px;">${
                          window.currentPatientData.mobile
                        }</p>
                    </div>
                </div>
            </div>
            
            <!-- Diagnosis Result - Smaller Box -->
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="color: #2c3e50; background: #f5f5f5; padding: 6px 10px; border-left: 3px solid #27ae60; font-size: 13px; margin: 0 0 10px 0; font-weight: 500;">
                    DIAGNOSIS RESULT
                </h3>
                <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; margin-top: 8px;">
                    <h1 style="color: ${diagnosisColor}; font-size: 22px; margin: 0; line-height: 1.2; font-weight: 600;">
                        ${window.currentAnalysisResult.class}
                    </h1>
                    <p style="color: #666; margin-top: 5px; font-size: 14px;">
                        Progression Risk: <strong>${
                          window.currentAnalysisResult.progression_risk
                        }%</strong>
                    </p>
                </div>
            </div>
            
            <!-- Image Section with Smaller Image -->
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="color: #2c3e50; background: #f5f5f5; padding: 6px 10px; border-left: 3px solid #9b59b6; font-size: 13px; margin: 0 0 10px 0; font-weight: 500;">
                    RETINAL FUNDUS IMAGE
                </h3>
                ${imageHtml}
            </div>
            
            <!-- Recommendations -->
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="color: #2c3e50; background: #f5f5f5; padding: 6px 10px; border-left: 3px solid #f39c12; font-size: 13px; margin: 0 0 10px 0; font-weight: 500;">
                    CLINICAL RECOMMENDATIONS
                </h3>
                <div style="margin-top: 8px; padding: 12px; background: #fff8e1; border-radius: 5px; font-size: 12px; line-height: 1.4;">
                    ${printRecommendation}
                </div>
            </div>
            
            <!-- Probability Distribution with Smaller Chart -->
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="color: #2c3e50; background: #f5f5f5; padding: 6px 10px; border-left: 3px solid #e74c3c; font-size: 13px; margin: 0 0 10px 0; font-weight: 500;">
                    SEVERITY PROBABILITY DISTRIBUTION
                </h3>
                <div style="
                    margin-top: 8px;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    width: 100%;
                    height: 200px; /* Reduced from 300px */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <canvas id="printProbChart" width="600" height="200"></canvas>
                </div>
            </div>
            
            <!-- Action Buttons (Non-printable) -->
            <div class="no-print" style="display: flex; justify-content: center; gap: 12px; margin: 20px 0; padding-top: 15px; border-top: 1px solid #eee;">
                <button onclick="window.print()" class="btn primary" style="padding: 8px 20px; font-size: 13px; cursor: pointer;">
                    <i class="fa fa-print"></i> Print Now
                </button>
                <button onclick="closePrintPreview()" class="btn secondary" style="padding: 8px 20px; font-size: 13px; cursor: pointer;">
                    <i class="fa fa-times"></i> Close Preview
                </button>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #eee; text-align: center; page-break-inside: avoid;">
                <p style="color: #666; font-size: 10px; font-style: italic; margin: 0 0 8px 0; line-height: 1.3;">
                    Disclaimer: This report is generated by an AI diagnostic system. 
                    Results should be verified by a qualified ophthalmologist before clinical decisions.
                </p>
                <p style="color: #999; font-size: 9px; margin: 0;">
                    © ${new Date().getFullYear()} RetinaAI Pro - All rights reserved.
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(printPreview);

    // Render chart for print preview with smaller dimensions
    setTimeout(() => {
      renderPrintChart();
    }, 100);

    // Disable main page scrolling
    document.body.style.overflow = "hidden";
  }
  // 2. Patient History Tab
  const diagnosisLink = Array.from(
    document.querySelectorAll(".nav-links a")
  ).find((el) => el.textContent.includes("Diagnosis"));
  const historyLink = Array.from(
    document.querySelectorAll(".nav-links a")
  ).find((el) => el.textContent.includes("Patient History"));

  window.resetDiagnosis = function () {
    // Clear Form
    document.getElementById("patientName").value = "";
    document.getElementById("patientAge").value = "";
    document.getElementById("patientMobile").value = "";
    fileInput.value = "";
    document.getElementById("previewImage").src = "";

    // UI Reset
    if (historySection) historySection.classList.add("hidden");
    if (loadingSection) loadingSection.classList.add("hidden");
    if (dashboardSection) dashboardSection.classList.add("hidden");
    if (uploadSection) uploadSection.classList.remove("hidden");

    // Nav Update
    document
      .querySelectorAll(".nav-links a")
      .forEach((el) => el.classList.remove("active"));
    if (diagnosisLink) diagnosisLink.classList.add("active");

    window.scrollTo(0, 0);
  };

  if (diagnosisLink) {
    diagnosisLink.addEventListener("click", (e) => {
      e.preventDefault();
      resetDiagnosis();
    });
  }

  if (historyLink) {
    historyLink.addEventListener("click", (e) => {
      e.preventDefault();

      // Immediate Navigation Update
      if (uploadSection) uploadSection.classList.add("hidden");
      if (loadingSection) loadingSection.classList.add("hidden");
      if (dashboardSection) dashboardSection.classList.add("hidden");

      if (historySection) {
        historySection.classList.remove("hidden");
        historySection.innerHTML =
          '<div style="text-align:center; padding:50px;"><div class="loader-ring"></div></div>';
        window.scrollTo(0, 0);
      }

      // Fetch Data
      fetch("/history")
        .then((res) => res.json())
        .then((data) => {
          // Store global data for filtering
          window.historyData = data;
          renderHistory(data);
        });
    });
  }

  // History rendering functions remain the same...
  window.renderHistory = function (data) {
    // ... (keep all the existing history rendering code)
  };

  // Add print-specific CSS
  // Add print-specific CSS
  const style = document.createElement("style");
  style.textContent = `
    @media print {
        body > *:not(#printPreview) {
            display: none !important;
        }
        
        #printPreview {
            position: static !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin-top: 0mm !important;
            padding: 6mm !important;       /* reduced further */
            background: white !important;
            font-size: 11px !important;    /* shrink fonts more */
            line-height: 1.2 !important;   /* tighter spacing */
        }
        
        #printPreview * {
            visibility: visible !important;
        }
        
        .no-print {
            display: none !important;
        }
        
        img {
            max-width: 150px !important;    /* further reduced */
            max-height: 100px !important;   /* further reduced */
        }
        
        #printProbChart {
            width: 500px !important;        /* smaller chart */
            height: 180px !important;       /* smaller chart */
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    }
`;
  document.head.appendChild(style);

  function renderPrintChart() {
    const canvas = document.getElementById("printProbChart");
    if (!canvas || !window.currentAnalysisResult) return;

    const ctx = canvas.getContext("2d");

    const orderedLabels = [
      "No DR",
      "Mild",
      "Moderate",
      "Severe",
      "Proliferative",
    ];
    const data = orderedLabels.map((l) =>
      (window.currentAnalysisResult.probabilities[l] * 100).toFixed(1)
    );

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: orderedLabels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              "#00bfa5",
              "#29b6f6",
              "#ffb74d",
              "#ef5350",
              "#c62828",
            ],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100 },
        },
      },
    });
  }
});
