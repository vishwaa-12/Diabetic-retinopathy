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

    // Real-time Mobile Number Validation
    const mobileInput = document.getElementById("patientMobile");
    if (mobileInput) {
        // Create Error Message Element
        const mobileErrorMsg = document.createElement("small");
        mobileErrorMsg.style.color = "#ef5350";
        mobileErrorMsg.style.display = "none";
        mobileErrorMsg.id = "mobileErrorMsg";
        mobileInput.parentNode.appendChild(mobileErrorMsg);

        mobileInput.addEventListener("input", (e) => {
            const mobile = e.target.value.trim();
            const mobileRegex = /^[0-9]{10}$/;

            // Reset state
            mobileInput.style.borderColor = "#ddd";
            mobileErrorMsg.style.display = "none";
            dropZone.style.pointerEvents = "auto";
            dropZone.style.opacity = "1";

            if (mobile.length === 10) {
                if (mobileRegex.test(mobile)) {
                    // Check Backend
                    fetch(`/check_mobile/${mobile}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.exists) {
                                mobileInput.style.borderColor = "#ef5350";
                                mobileErrorMsg.textContent = "Invalid Mobile Number: Patient already exists.";
                                mobileErrorMsg.style.display = "block";
                                // Disable upload
                                dropZone.style.pointerEvents = "none";
                                dropZone.style.opacity = "0.5";
                            }
                        });
                } else {
                    mobileErrorMsg.textContent = "Invalid Format: Must be 10 digits.";
                    mobileErrorMsg.style.display = "block";
                }
            }
        });
    }

    // Calculate Age from DOB
    window.calculateAge = function () {
        const dobInput = document.getElementById('patientDob').value;
        if (!dobInput) return;

        const dob = new Date(dobInput);
        const today = new Date();

        // Basic validation
        if (dob > today) {
            alert("Date of Birth cannot be in the future.");
            document.getElementById('patientDob').value = "";
            document.getElementById('patientAge').value = "";
            return;
        }

        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        // Update Age Field
        document.getElementById('patientAge').value = age >= 0 ? age : 0;
    }

    function handleFile(file) {
        // Validate Patient Form
        const name = document.getElementById("patientName").value.trim();
        const dob = document.getElementById("patientDob").value;
        const age = document.getElementById("patientAge").value.trim();
        const mobile = document.getElementById("patientMobile").value.trim();
        const gender = document.getElementById("patientGender").value;
        const diabetesDuration = document.getElementById("diabetesDuration").value.trim();

        if (!name || !dob || !age || !mobile || !gender) {
            alert(
                "Please enter all patient details (Name, DOB, Gender, Mobile) before uploading."
            );
            fileInput.value = ""; // Reset file input
            return;
        }

        // Validate Age (sanity check)
        if (parseInt(age) < 0 || parseInt(age) > 120) {
            alert("Calculated age seems invalid. Check Date of Birth.");
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
                dob: dob,
                age: age,
                mobile: mobile,
                gender: gender,
                diabetesDuration: diabetesDuration,
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
        formData.append("dob", dob); // Send DOB
        formData.append("age", age);
        formData.append("mobile", mobile);
        formData.append("gender", gender);
        formData.append("diabetes_duration", diabetesDuration);
        // Email removed from form data

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
                    window.currentAnalysisResult = data;
                    // Store additional data
                    window.currentPatientData.diagnosis_id = data.diagnosis_id;
                    window.currentPatientData.patient_id = data.patient_id;

                    // Success - Show Result
                    setTimeout(() => {
                        showDashboard(data);
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
            // Colors matching Chart.js distribution
            const chartColors = [
                "#00bfa5", // No DR
                "#29b6f6", // Mild
                "#ffb74d", // Moderate
                "#ef5350", // Severe
                "#c62828"  // Proliferative
            ];

            // Valid Diagnosis
            const color = chartColors[severity] || "#95a5a6";
            diagnosisText.style.color = color;

            // Set Meter Color
            meterFill.style.background = color;
            meterFill.style.boxShadow = `0 0 10px ${color}40`; // Add a glow

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

                `<strong>👨⚕️ Moderate Non-Proliferative DR</strong><br>
                <ul style='text-align:left; margin-top:10px; padding-left:20px;'>
                    <li><strong>Referral Required:</strong> Consult ophthalmologist within 3-6 months.</li>
                    <li>Consider Fluorescein Angiography to assess retinal ischemia.</li>
                    <li>monitor for signs of Macular Edema.</li>
                </ul>`,

                `<strong>🚨 Severe Non-Proliferative DR</strong><br>
                <ul style='text-align:left; margin-top:10px; padding-left:20px;'>
                    <li><strong>Urgent Referral:</strong> Consult retina specialist within 2-4 weeks.</li>
                    <li>High risk of progression to Proliferative DR. Closely monitor vision changes.</li>
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
        const data = orderedLabels.map((label) => {
            // Handle key mismatches from backend (e.g., 'No_DR' vs 'No DR', 'Proliferate_DR' vs 'Proliferative')
            let val = result.probabilities[label];
            if (val === undefined) {
                if (label === "No DR") val = result.probabilities["No_DR"] || result.probabilities["No DR"];
                if (label === "Proliferative") val = result.probabilities["Proliferate_DR"] || result.probabilities["Proliferative DR"];
            }
            return ((val || 0) * 100).toFixed(1);
        });
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

    window.showPrintPreview = function () {
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
                        <p style="margin: 2px 0; font-size: 13px; font-weight: 600;">${window.currentPatientData.name
            }</p>
                    </div>
                    <div>
                        <p style="margin: 2px 0; color: #666; font-size: 11px;"><strong>Age:</strong></p>
                        <p style="margin: 2px 0; font-size: 13px;">${window.currentPatientData.age
            } years</p>
                    </div>
                    <div>
                        <p style="margin: 2px 0; color: #666; font-size: 11px;"><strong>Mobile:</strong></p>
                        <p style="margin: 2px 0; font-size: 13px;">${window.currentPatientData.mobile
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
                        Progression Risk: <strong>${window.currentAnalysisResult.progression_risk
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

    window.renderPrintChart = function () {
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
        // Ensure probabilities exist, default to 0
        const probs = window.currentAnalysisResult.probabilities || {};
        const data = orderedLabels.map((l) => {
            let val = probs[l];
            if (val === undefined) {
                if (l === "No DR") val = probs["No_DR"] || probs["No DR"];
                if (l === "Proliferative") val = probs["Proliferate_DR"] || probs["Proliferative DR"];
            }
            return ((val || 0) * 100).toFixed(1);
        });

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
    };

    window.closePrintPreview = function () {
        const preview = document.getElementById("printPreview");
        if (preview) {
            preview.remove();
            document.body.style.overflow = "auto";
        }
    };

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
        // Gender and diabetes duration reset
        document.getElementById("patientGender").value = "";
        document.getElementById("diabetesDuration").value = "";
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
            if (window.loadHistory) {
                window.loadHistory(1, "");
            } else {
                console.error("loadHistory not found");
            }
        });
    }

    // Load History Helper
    window.loadHistory = function (page = 1, query = "") {
        const historySection = document.getElementById("historySection");
        if (!historySection) return;

        // Immediate Navigation Update
        document.getElementById("uploadSection")?.classList.add("hidden");
        document.getElementById("loadingSection")?.classList.add("hidden");
        document.getElementById("dashboardSection")?.classList.add("hidden");

        historySection.classList.remove("hidden");
        historySection.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <div class="loader-ring"></div>
                <p style="margin-top:15px; color:#666;">Loading patient records...</p>
            </div>
        `;
        window.scrollTo(0, 0);

        // Fetch Data with pagination and Search
        fetch(`/history?page=${page}&limit=50&search=${encodeURIComponent(query)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    historySection.innerHTML = `
                        <div class="card" style="text-align:center; padding:50px;">
                            <h3 style="color:#666;">Error Loading History</h3>
                            <p style="color:#999;">${data.error}</p>
                            <button class="btn primary" onclick="loadHistory(1)" style="margin-top:20px;">
                                Retry
                            </button>
                        </div>
                    `;
                    return;
                }

                // Store global data
                window.historyData = data.data;
                window.historyPagination = {
                    total: data.total,
                    page: data.page,
                    limit: data.limit,
                    pages: data.pages
                };
                renderHistory(data.data, data, query);
            })
            .catch(err => {
                historySection.innerHTML = `
                    <div class="card" style="text-align:center; padding:50px;">
                        <h3 style="color:#666;">Network Error</h3>
                        <p style="color:#999;">Failed to load patient records. Please check your connection.</p>
                        <button class="btn primary" onclick="loadHistory(1)" style="margin-top:20px;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }

    // History rendering functions
    window.renderHistory = function (data, paginationData = null, currentQuery = "") {
        const historySection = document.getElementById("historySection");
        if (!historySection) return;

        // Base HTML Structure - Header with Search is ALWAYS visible
        let html = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h3 style="margin:0;"><i class="fa fa-history"></i> Patient Records</h3>
                    ${paginationData && data && data.length > 0 ? `<small style="color:#666;">Showing ${data.length} of ${paginationData.total} records</small>` : ''}
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                     <div style="position:relative;">
                        <i class="fa fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#aaa;"></i>
                        <input type="text" id="recordSearch" placeholder="Search History..." value="${currentQuery}"
                           style="padding:10px 10px 10px 38px; border:1px solid #e0e0e0; border-radius:25px; width:300px; outline:none; transition:all 0.3s; font-family:'Outfit',sans-serif; font-size:14px; background:#f9f9f9;"
                           onfocus="this.style.borderColor='#00bfa5'; this.style.background='#fff'; this.style.boxShadow='0 4px 12px rgba(0,191,165,0.1)';"
                           onblur="this.style.borderColor='#e0e0e0'; this.style.background='#f9f9f9'; this.style.boxShadow='none';"
                           autocomplete="off">
                     </div>
                     <button id="deleteSelectedBtn" class="btn secondary" style="background:#ef5350; color:white; display:none; border-radius:20px; padding:8px 20px; box-shadow:0 4px 6px rgba(239,83,80,0.2);">
                        <i class="fa fa-trash"></i>
                     </button>
                </div>
            </div>`;

        // Conditional Content
        if (!data || data.length === 0) {
            html += `
            <div style="text-align:center; padding:50px; border-top:1px solid #eee;">
                <i class="fa fa-folder-open" style="font-size:48px; color:#ddd; margin-bottom:20px;"></i>
                <h3 style="color:#666;">No Patient Records Found</h3>
                <p style="color:#999;">${currentQuery ? 'No matches for "' + currentQuery + '"' : 'Diagnostic history will appear here.'}</p>
                ${currentQuery ? '<button class="btn secondary" onclick="loadHistory(1, \'\')" style="margin-top:20px;">Clear Search</button>' : ''}
            </div>
            </div>`; // Close card
        } else {
            // Render Table
            html += `
            <div style="overflow-x:auto;">
                <table class="history-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8f9fa; text-align:left;">
                            <th style="padding:12px; border-bottom:2px solid #eee; width: 40px;">
                                <input type="checkbox" id="selectAllHistory">
                            </th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Date</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">ID / Name</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">DOB</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Age</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Diagnosis</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Risk</th>
                            <th style="padding:12px; border-bottom:2px solid #eee;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="historyTableBody">
            `;

            data.forEach((item) => {
                let badgeColor = "#95a5a6";
                let severityClass = "Invalid";
                const diags = item.diagnosis || item.diagnosis_class || "";

                if (diags.includes("No DR")) { badgeColor = "#00bfa5"; severityClass = "No DR"; }
                else if (diags.includes("Mild")) { badgeColor = "#29b6f6"; severityClass = "Mild"; }
                else if (diags.includes("Moderate")) { badgeColor = "#ffb74d"; severityClass = "Moderate"; }
                else if (diags.includes("Severe")) { badgeColor = "#ef5350"; severityClass = "Severe"; }
                else if (diags.includes("Proliferative")) { badgeColor = "#c62828"; severityClass = "Proliferative DR"; }

                const pName = item.patient ? item.patient.name : "Unknown";
                const pAge = item.patient ? item.patient.age : "N/A";
                const pDob = item.patient && item.patient.dob ? item.patient.dob : "-";
                const pId = item.patient_id || "N/A";

                html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;"><input type="checkbox" class="history-checkbox" data-id="${item.id}"></td>
                    <td style="padding:12px; color:#666; font-size:12px;">${item.date || ""}</td>
                    <td style="padding:12px;">
                        <div style="font-weight:600; color:#333;">${pName}</div>
                        <div style="font-size:11px; color:#888; font-family:monospace;">${pId}</div>
                    </td>
                    <td style="padding:12px; color:#666;">${pDob}</td>
                    <td style="padding:12px; color:#666;">${pAge}</td>
                    <td style="padding:12px;">
                        <span style="background:${badgeColor}20; color:${badgeColor}; padding:4px 10px; border-radius:15px; font-size:12px; font-weight:600;">${severityClass}</span>
                    </td>
                    <td style="padding:12px;">
                        <div style="width:80px; height:4px; background:#f0f0f0; border-radius:2px; margin-bottom:4px;">
                            <div style="width:${item.risk}%; height:100%; background:${badgeColor};"></div>
                        </div>
                        <small style="color:#666;">${item.risk || "0"}%</small>
                    </td>
                    <td style="padding:12px;">
                        <button class="btn secondary" style="padding:6px 10px; font-size:12px;" onclick="window.printHistoryRecord('${item.id}')" title="Print"><i class="fa fa-print"></i></button>
                        <button class="btn secondary" style="padding:6px 10px; font-size:12px; color:#e53935;" onclick="window.deleteRecord('${item.id}')" title="Delete"><i class="fa fa-archive"></i></button>
                    </td>
                </tr>`;
            });

            html += `</tbody></table></div>`;

            // Pagination
            if (paginationData && paginationData.pages > 1) {
                html += `
                <div style="display:flex; justify-content:center; margin-top:20px; gap:10px;">
                    <button class="btn secondary" onclick="loadHistory(${paginationData.page - 1}, '${currentQuery}')" ${paginationData.page <= 1 ? 'disabled' : ''}>&lt; Prev</button>
                    <span style="line-height:30px; color:#666;">Page ${paginationData.page} of ${paginationData.pages}</span>
                    <button class="btn secondary" onclick="loadHistory(${paginationData.page + 1}, '${currentQuery}')" ${paginationData.page >= paginationData.pages ? 'disabled' : ''}>Next &gt;</button>
                </div>`;
            }

            html += `</div>`; // Close card
        }

        historySection.innerHTML = html;
        attachHistoryEvents();
    };

    function attachHistoryEvents() {
        const searchInput = document.getElementById("recordSearch");
        if (searchInput) {
            let timer;
            // Only focus if we have a value (meaning user was typing)
            // to avoid auto-focus jump on initial load
            if (searchInput.value) {
                searchInput.focus();
                const val = searchInput.value; searchInput.value = ''; searchInput.value = val;
            }

            searchInput.addEventListener("input", (e) => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    if (window.loadHistory) window.loadHistory(1, e.target.value.trim());
                }, 600);
            });
        }

        // Check if table elements exist before attaching listener
        const selectAll = document.getElementById("selectAllHistory");
        const checkboxes = document.querySelectorAll(".history-checkbox");
        let deleteBtn = document.getElementById("deleteSelectedBtn");

        if (deleteBtn) {
            // Remove old listeners by cloning
            const newBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
            deleteBtn = newBtn; // Update reference to the new button in DOM

            deleteBtn.addEventListener("click", () => {
                const ids = Array.from(document.querySelectorAll(".history-checkbox:checked")).map(cb => cb.dataset.id);
                if (confirm(`Delete ${ids.length} items?`)) {
                    Promise.all(ids.map(id => fetch(`/delete_diagnosis/${id}`, { method: 'DELETE' }))).then(() => {
                        window.loadHistory(1, searchInput ? searchInput.value : "");
                    });
                }
            });
        }

        function updateDelete() {
            const checked = document.querySelectorAll(".history-checkbox:checked");
            if (deleteBtn) deleteBtn.style.display = checked.length > 0 ? "block" : "none";
        }

        if (selectAll) selectAll.addEventListener("change", (e) => {
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateDelete();
        });
        checkboxes.forEach(cb => cb.addEventListener("change", updateDelete));
    }

}); // END DOMContentLoaded

// Global Helpers (outside DOMContentLoaded to ensure access if needed, though window.x works inside too)
window.printHistoryRecord = function (id) {
    fetch(`/diagnosis/${id}`).then(r => r.json()).then(d => {
        if (d.error) return alert(d.error);
        window.currentPatientData = {
            name: d.patient.name,
            age: d.patient.age,
            dob: d.patient.dob || "",
            mobile: d.patient.mobile,
            gender: d.patient.gender,
            imageSrc: d.image_filename ? `/diagnosis/image/${id}` : ""
        };
        window.currentAnalysisResult = {
            class: d.diagnosis,
            severity_index: d.severity_index,
            progression_risk: d.risk,
            probabilities: d.probabilities
        };
        showPrintPreview();
    });
};

window.deleteRecord = function (id) {
    if (confirm("Delete this record?")) {
        fetch(`/delete_diagnosis/${id}`, { method: 'DELETE' }).then(r => r.json()).then(d => {
            if (d.success) {
                const searchVal = document.getElementById('recordSearch')?.value || "";
                window.loadHistory(1, searchVal);
            }
        });
    }
}

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
            padding: 6mm !important;
            background: white !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
        }
        
        #printPreview * {
            visibility: visible !important;
        }
        
        .no-print {
            display: none !important;
        }
        
        img {
            max-width: 150px !important;
            max-height: 100px !important;
        }
        
        #printProbChart {
            width: 500px !important;
            height: 180px !important;
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    }
`;
document.head.appendChild(style);