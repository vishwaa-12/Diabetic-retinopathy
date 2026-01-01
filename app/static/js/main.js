document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadSection = document.getElementById('uploadSection');
    const loadingSection = document.getElementById('loadingSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const historySection = document.getElementById('historySection');


    // Elements to update
    const diagnosisText = document.getElementById('diagnosisText');
    const riskScore = document.getElementById('riskScore');
    const meterFill = document.getElementById('confidenceFill');
    const previewImage = document.getElementById('previewImage');
    const recommendationText = document.getElementById('recommendationText');

    // Drag & Drop Handlers
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#009688';
        dropZone.style.background = '#e0f2f1';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#cfd8dc';
        dropZone.style.background = '#ffffff';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
        // Validate Patient Form
        const name = document.getElementById('patientName').value.trim();
        const age = document.getElementById('patientAge').value.trim();
        const mobile = document.getElementById('patientMobile').value.trim();

        if (!name || !age || !mobile) {
            alert('Please enter all patient details (Name, Age, Mobile) before uploading.');
            fileInput.value = ''; // Reset file input
            return;
        }

        // Validate Age (Max 2 digits, numeric)
        const ageRegex = /^[0-9]{1,2}$/;
        if (!ageRegex.test(age) || parseInt(age) <= 0) {
            alert('Age must be a valid number (1-99).');
            fileInput.value = '';
            return;
        }

        // Validate Mobile (Exactly 10 numeric digits)
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(mobile)) {
            alert('Mobile number must correspond to Indian Standard (Exactly 10 numeric digits, no characters).');
            fileInput.value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        // Show Image Preview Immediate
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // UI Transition
        uploadSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        // Simulate Progressive Loading Steps
        simulateSteps();

        // Send to Backend
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('age', age);
        formData.append('mobile', mobile);

        fetch('/analyze', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server Error: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    alert('Analysis Failed: ' + data.error);
                    location.reload();
                } else {
                    // Success - Show Result
                    setTimeout(() => {
                        showDashboard(data.data);
                    }, 2000); // 2s delay for effect
                }
            })
            .catch(err => {
                console.error(err);
                alert('An error occurred during upload: ' + err.message);
                // Reset UI
                loadingSection.classList.add('hidden');
                uploadSection.classList.remove('hidden');
                fileInput.value = '';
            });

    }

    function simulateSteps() {
        const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
        let delay = 0;
        steps.forEach((id, index) => {

            setTimeout(() => {
                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                document.getElementById(id).classList.add('active');
            }, delay);
            delay += 800;
        });
    }

    let probChartInstance = null;
    let riskChartInstance = null;

    function showDashboard(result) {
        loadingSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');

        // Update Text
        diagnosisText.innerText = result.class;
        riskScore.innerText = `Progression Risk: ${result.progression_risk}%`;
        meterFill.style.width = `${result.progression_risk}%`;

        // Determine Color & Recommendation
        const severity = result.severity_index;
        let recText = "";

        if (severity === -1) {
            // Invalid Input Case
            diagnosisText.style.color = '#7f8c8d'; // Grey
            recText = result.error || "Image Rejected. Please upload a valid retinal fundus scan.";
            // Hide risk info for invalid
            riskScore.innerText = "N/A";
            meterFill.style.width = "0%";
        } else {
            // Valid Diagnosis
            const color = severity === 0 ? '#00bfa5' : severity < 3 ? '#fb8c00' : '#d32f2f';
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
                </ul>`
            ];
            recText = recs[severity] || "Consult a specialist.";
        }

        recommendationText.innerHTML = recText;


        // Charts
        renderCharts(result);
    }

    function renderCharts(result) {
        const ctxProb = document.getElementById('probChart').getContext('2d');
        const ctxRisk = document.getElementById('riskChart').getContext('2d');

        // Prob Chart
        // Prob Chart - Enforce Order
        const orderedLabels = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'];
        const data = orderedLabels.map(label => (result.probabilities[label] * 100).toFixed(1));
        const labels = orderedLabels;

        if (probChartInstance) probChartInstance.destroy();

        probChartInstance = new Chart(ctxProb, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Confidence (%)',
                    data: data,
                    backgroundColor: [
                        '#00bfa5', /* No DR - Medical Teal */
                        '#29b6f6', /* Mild - Blue */
                        '#ffb74d', /* Moderate - Warning Orange */
                        '#ef5350', /* Severe - Soft Red */
                        '#c62828'  /* Proliferative - Deep Red */
                    ],

                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });

        // Risk Graph (Simulated Progression)
        // We simulate a graph based on current severity
        const timeLabels = ['Year 1', 'Year 2', 'Year 3', 'Year 5'];
        const baseRisk = result.progression_risk;
        // Dynamic Slope based on Severity
        const severity = result.severity_index;
        let slope = 5;
        if (severity === 0) slope = 2;       // No DR: Slow progression
        else if (severity === 1) slope = 5;  // Mild: Moderate progression
        else if (severity === 2) slope = 12; // Moderate: Accelerating
        else if (severity === 3) slope = 20; // Severe: Critical Progression Rate
        else if (severity === 4) slope = 1;  // Proliferative: Saturated/Maxed

        const riskTrend = timeLabels.map((t, i) => Math.min(100, baseRisk + (i * slope)));

        if (riskChartInstance) riskChartInstance.destroy();

        riskChartInstance = new Chart(ctxRisk, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Projected Risk',
                    data: riskTrend,
                    borderColor: '#1976d2',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(25, 118, 210, 0.1)'
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    }

    // --- NEW FEATURES: PhD Level Upgrades ---

    // 1. PDF Report Generation
    // 1. PDF Report Generation
    const downloadBtn = document.querySelector('.btn.primary');
    downloadBtn.addEventListener('click', () => {
        // Populate Print Details
        const name = document.getElementById('patientName').value || 'Unknown';
        const age = document.getElementById('patientAge').value || '-';
        const mobile = document.getElementById('patientMobile').value || '-';

        const detailsHtml = `
            <div><strong>Patient Name:</strong> ${name}</div>
            <div><strong>Age:</strong> ${age}</div>
            <div><strong>Mobile:</strong> ${mobile}</div>
        `;
        document.getElementById('printPatientDetails').innerHTML = detailsHtml;
        document.getElementById('printDate').innerText = new Date().toLocaleString();

        // Prepare Element for PDF
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.margin = '0 auto'; // Reset margins
        element.style.background = 'white';
        // 700px allows comfortable fit on A4 (~794px) with margins
        element.style.width = '700px';
        element.style.maxWidth = '700px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = '14px'; // Increased font size
        element.style.color = '#333';
        element.style.boxSizing = 'border-box';

        // Get additional details from DOM
        const riskVal = document.getElementById('riskScore').innerText;
        // Try to get confidence if available, else skip
        const confidenceVal = document.querySelector('.meter-bar') ? document.querySelector('.meter-bar').style.width : 'N/A';

        // --- 1. HEADER ---
        const headerHtml = `
            <table style="width:100%; border-bottom:2px solid #000; margin-bottom:15px; padding-bottom:10px;">
                <tr>
                    <td style="vertical-align:middle; text-align:left; width:55%;">
                        <div style="display:flex; align-items:center; gap:10px;">
                             <div style="font-size:2.8rem; color:#d32f2f;">❖</div>
                             <div>
                                <h2 style="margin:0; font-size:1.8rem; color:#444;">RetinaAI <span style="font-weight:300;">PRO</span></h2>
                                <div style="font-size:0.8rem; color:#777;">ISO 9001:2015 CERTIFIED</div>
                             </div>
                        </div>
                    </td>
                    <td style="vertical-align:middle; text-align:right; width:45%;">
                        <div style="font-size:1.4rem; font-weight:bold; color:#444; margin-bottom:5px;">DIAGNOSIS REPORT</div>
                        <div style="font-size:1rem; color:#666;">Date: ${new Date().toLocaleDateString()}</div>
                        <div style="font-size:1rem; color:#666;">Time: ${new Date().toLocaleTimeString()}</div>
                    </td>
                </tr>
            </table>
        `;

        // --- 2. PATIENT DETAILS ---
        const pdfDetailsHtml = `
            <div style="margin-bottom:20px; background:#f9f9f9; padding:15px; border-radius:5px; border:1px solid #eee;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="padding:5px;"><span style="color:#666;">Name:</span> <strong>${name}</strong></td>
                        <td style="padding:5px;"><span style="color:#666;">Age:</span> <strong>${age}</strong></td>
                        <td style="padding:5px;"><span style="color:#666;">Mobile:</span> <strong>${mobile}</strong></td>
                    </tr>
                </table>
            </div>
        `;

        // --- 3. CLINICAL FINDINGS (Table Layout) ---
        const diagnosis = diagnosisText.innerText;
        const findingHtml = `
            <div style="margin-bottom:20px;">
                <h3 style="margin:0 0 15px 0; border-bottom:1px solid #ddd; padding-bottom:8px; color:#2c3e50;">Clinical Findings</h3>
                
                <table style="width:100%; vertical-align:top; border-collapse:collapse;">
                    <tr>
                        <!-- Left: Text Analysis -->
                        <td style="vertical-align:top; padding-right:20px; width:60%;">
                            <div style="font-size:1.3rem; margin-bottom:15px;">
                                Diagnosis: <strong style="color:${diagnosisText.style.color}">${diagnosis} Diabetic Retinopathy</strong>
                            </div>
                            
                            <div style="background:#eef2f5; padding:15px; border-radius:4px; margin-bottom:20px;">
                                <div><strong>Risk Score:</strong> ${riskVal} (Progression Probability)</div>
                                <div><strong>Confidence:</strong> ${confidenceVal} match to class</div>
                            </div>

                            <div style="font-size:1rem; line-height:1.6; color:#444;">
                                <strong>Recommendations:</strong>
                                ${recommendationText.innerHTML}
                            </div>
                        </td>

                        <!-- Right: Scan Image -->
                        <td style="vertical-align:top; width:40%; text-align:right;">
                             <div style="border:1px solid #ccc; padding:5px; background:white; display:inline-block;">
                                 <img src="${document.getElementById('previewImage').src}" style="width:100%; max-width:250px; height:auto; display:block;">
                             </div>
                             <div style="text-align:center; font-size:0.8rem; color:#777; margin-top:5px; width:100%; max-width:250px; display:inline-block;">Input Scan</div>
                        </td>
                    </tr>
                </table>
            </div>
        `;

        // --- 4. FOOTER ---
        const footerHtml = `
             <div style="margin-top:40px; text-align:center; border-top:1px solid #ddd; padding-top:15px; font-size:0.9rem; color:#999;">
                This is an automated computer-aided diagnosis verified by RetinaAI Algorithm v2.0.<br>
                Please consult a certified ophthalmologist for final verification.
             </div>
        `;

        element.innerHTML = headerHtml + pdfDetailsHtml + findingHtml + footerHtml;

        // HTML2PDF Configuration
        const opt = {
            margin: [5, 5, 5, 5],
            filename: `RetinaAI_Report_${name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Generate and Save
        // STRATEGY: Visible Overlay
        // To guarantee formatting, we show the report in a full-screen white overlay for a split second.
        // This forces the browser to render it properly for html2canvas.

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'white';
        overlay.style.zIndex = '10000'; // On top of everything
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'flex-start'; // Start from top
        overlay.style.overflow = 'auto'; // Allow scrolling if needed
        overlay.style.padding = '20px';

        // Add a "Generating PDF..." message
        const msg = document.createElement('div');
        msg.innerText = 'Generating High-Res Report... (v2.0)';
        msg.style.position = 'fixed';
        msg.style.top = '10px';
        msg.style.left = '50%';
        msg.style.transform = 'translateX(-50%)';
        msg.style.background = 'rgba(0,0,0,0.8)';
        msg.style.color = '#4caf50'; // Green text
        msg.style.fontWeight = 'bold';
        msg.style.padding = '15px 30px';
        msg.style.borderRadius = '5px';
        msg.style.zIndex = '10001';

        overlay.appendChild(element); // Add our report to the overlay
        document.body.appendChild(overlay);
        document.body.appendChild(msg);

        // Small delay to ensure rendering
        setTimeout(() => {
            html2pdf()
                .set(opt)
                .from(element)
                .save()
                .then(() => {
                    // Cleanup
                    document.body.removeChild(overlay);
                    document.body.removeChild(msg);
                })
                .catch(err => {
                    console.error(err);
                    alert('PDF Error: ' + err.message);
                    document.body.removeChild(overlay);
                    document.body.removeChild(msg);
                });
        }, 500); // 500ms delay to let image render
    });

    // 2. Patient History Tab
    // 2. Patient History Tab logic
    // 3. Diagnosis Link & Reset Logic
    const diagnosisLink = Array.from(document.querySelectorAll('.nav-links a')).find(el => el.textContent.includes('Diagnosis'));

    window.resetDiagnosis = function () {
        // Clear Form
        document.getElementById('patientName').value = '';
        document.getElementById('patientAge').value = '';
        document.getElementById('patientMobile').value = '';
        fileInput.value = '';
        document.getElementById('previewImage').src = '';

        // UI Reset
        if (historySection) historySection.classList.add('hidden');
        if (loadingSection) loadingSection.classList.add('hidden');
        if (dashboardSection) dashboardSection.classList.add('hidden');
        if (uploadSection) uploadSection.classList.remove('hidden');

        // Nav Update
        document.querySelectorAll('.nav-links a').forEach(el => el.classList.remove('active'));
        if (diagnosisLink) diagnosisLink.classList.add('active');

        window.scrollTo(0, 0);
    };

    if (diagnosisLink) {
        diagnosisLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetDiagnosis();
        });
    }

    const historyLink = Array.from(document.querySelectorAll('.nav-links a')).find(el => el.textContent.includes('Patient History'));

    if (historyLink) {
        historyLink.addEventListener('click', (e) => {
            e.preventDefault();

            // Immediate Navigation Update
            if (uploadSection) uploadSection.classList.add('hidden');
            if (loadingSection) loadingSection.classList.add('hidden');
            if (dashboardSection) dashboardSection.classList.add('hidden');

            if (historySection) {
                historySection.classList.remove('hidden');
                historySection.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader-ring"></div></div>';
                window.scrollTo(0, 0);
            }

            // Fetch Data
            fetch('/history')
                .then(res => res.json())
                .then(data => {
                    // Store global data for filtering
                    window.historyData = data;
                    renderHistory(data);
                });
        });

        // -------------------------
        // HISTORY RENDER & LOGIC
        // -------------------------
        window.renderHistory = function (data) {

            // 1. Calculate Stats
            const total = data.length;
            const avgRisk = total > 0 ? (data.reduce((acc, curr) => acc + (curr.risk || 0), 0) / total).toFixed(1) : 0;
            const severeCount = data.filter(d => ['Severe', 'Proliferative'].includes(d.diagnosis)).length;
            const historySection = document.getElementById('historySection');

            let html = `
                <!-- Stats Row -->
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:30px;">
                    <div class="card" style="text-align:center; padding:20px;">
                        <h4 style="color:#7f8c8d; margin:0;">Total Scans</h4>
                        <div style="font-size:2rem; font-weight:700; color:#2c3e50;">${total}</div>
                    </div>
                    <div class="card" style="text-align:center; padding:20px;">
                        <h4 style="color:#7f8c8d; margin:0;">Avg Risk Score</h4>
                        <div style="font-size:2rem; font-weight:700; color:${avgRisk < 30 ? '#00bfa5' : '#ef5350'};">${avgRisk}%</div>
                    </div>
                     <div class="card" style="text-align:center; padding:20px;">
                        <h4 style="color:#7f8c8d; margin:0;">High Risk Cases</h4>
                        <div style="font-size:2rem; font-weight:700; color:#c62828;">${severeCount}</div>
                    </div>
                </div>

                <!-- Trend Chart -->
                <div class="card" style="margin-bottom:30px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3>Disease Progression Trends</h3>
                    </div>
                    <div style="height:300px;">
                        <canvas id="historyChart"></canvas>
                    </div>
                </div>

                <!-- Database Table -->
                <div class="card" style="width:100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:15px;">
                        <h3>Patient Database</h3>
                        
                        <!-- Controls -->
                        <div style="display:flex; gap:10px; align-items:center;">
                            <!-- Filters -->
                            <select id="filterSeverity" onchange="applyFilters()" style="padding:8px; border-radius:6px; border:1px solid #ddd;">
                                <option value="all">All Severities</option>
                                <option value="No DR">No DR</option>
                                <option value="Mild">Mild</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Severe">Severe</option>
                                <option value="Proliferative">Proliferative</option>
                            </select>

                             <button id="bulkDeleteBtn" class="btn" onclick="deleteSelected()" style="display:none; background:#ef5350; color:white; padding:8px 16px;">
                                <i class="fa fa-trash"></i> Delete Selected
                            </button>
                            <button class="btn secondary" onclick="resetDiagnosis()" style="padding:8px 16px;">
                                <i class="fa fa-refresh"></i> Dashboard
                            </button>
                        </div>
                    </div>
                    
                    <table style="width:100%; text-align:left; border-collapse:collapse;">
                        <tr style="background:#f5f7fa; border-bottom:2px solid #e1e4e8; color:#546e7a;">
                            <th style="padding:15px; width:40px;"><input type="checkbox" id="selectAll" onchange="toggleAll(this)"></th>
                           <th style="padding:15px;">ID</th>
                           <th style="padding:15px;">Date</th>
                           <th style="padding:15px;">Patient Name</th>
                           <th style="padding:15px;">Age</th>
                           <th style="padding:15px;">Mobile</th>
                            <th style="padding:15px;">Diagnosis</th>
                            <th style="padding:15px;">Risk Score</th>
                            <th style="padding:15px; text-align:right;">Action</th>
                        </tr>
                        ${data.length > 0 ? data.map((d, i) => `
                        <tr style="border-bottom:1px solid #eee; transition:background 0.2s;" onmouseover="this.style.background='#fbfcfe'" onmouseout="this.style.background='transparent'">
                            <td style="padding:15px;"><input type="checkbox" class="history-checkbox" value="${i}" onchange="checkSelection()"></td>
                            <td style="padding:15px; font-family:monospace; color:#455a64; font-weight:600;">${d.patient_id || '-'}</td>
                            <td style="padding:15px; color:#2c3e50; font-size:0.9rem;">${d.date}</td>
                            <td style="padding:15px; font-weight:600;">${d.patient ? d.patient.name : 'Unknown'}</td>
                            <td style="padding:15px;">${d.patient ? d.patient.age : '-'}</td>
                            <td style="padding:15px; color:#7f8c8d;">${d.patient ? d.patient.mobile : '-'}</td>
                            <td style="padding:15px; font-weight:700; color:${d.diagnosis === 'No DR' ? '#00bfa5' : d.diagnosis === 'Invalid Input' ? '#95a5a6' : '#ef5350'}">${d.diagnosis}</td>
                            <td style="padding:15px; font-weight:500;">
                                ${d.risk > 0 ? `
                                <span style="background:${d.risk < 30 ? '#e0f2f1' : '#ffebee'}; color:${d.risk < 30 ? '#00796b' : '#c62828'}; padding:4px 8px; border-radius:4px;">
                                    ${d.risk}%
                                </span>` : '<span style="color:#bdc3c7;">N/A</span>'}
                            </td>
                            <td style="padding:15px; text-align:right;">
                                <button onclick="deleteHistory(${i})" style="border:none; background:none; color:#e74c3c; cursor:pointer; font-weight:600;" title="Delete Record">
                                    <i class="fa fa-trash"></i> Delete
                                </button>
                            </td>
                        </tr>`).join('') : '<tr><td colspan="8" style="padding:30px; text-align:center; color:#90a4ae;">No history records found.</td></tr>'}
                    </table>
                </div>`;

            if (historySection) historySection.innerHTML = html;
            renderHistoryChart(data);
        };

        window.renderHistoryChart = function (data) {
            // Sort by date/time (simple reverse for now, assuming newest first)
            const chartData = [...data].reverse().slice(-10); // Last 10 records

            const ctx = document.getElementById('historyChart').getContext('2d');

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.map(d => d.date.split(' ')[0]),
                    datasets: [{
                        label: 'Risk Score (%)',
                        data: chartData.map(d => d.risk),
                        borderColor: '#0288d1',
                        backgroundColor: 'rgba(2, 136, 209, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, max: 100 } }
                }
            });
        };

        window.applyFilters = function () {
            const severity = document.getElementById('filterSeverity').value;
            let filtered = window.historyData;

            if (severity !== 'all') {
                filtered = filtered.filter(d => d.diagnosis === severity);
            }
            renderHistory(filtered);
        };





        // Bulk Selection Logic
        window.toggleAll = function (source) {
            const checkboxes = document.querySelectorAll('.history-checkbox');
            checkboxes.forEach(cb => cb.checked = source.checked);
            checkSelection();
        };

        window.checkSelection = function () {
            const selected = document.querySelectorAll('.history-checkbox:checked').length;
            const btn = document.getElementById('bulkDeleteBtn');
            if (selected > 0) {
                btn.style.display = 'block';
                btn.innerHTML = `<i class="fa fa-trash"></i> Delete Selected (${selected})`;
            } else {
                btn.style.display = 'none';
            }
        };

        window.deleteSelected = function () {
            const checkboxes = document.querySelectorAll('.history-checkbox:checked');
            const indices = Array.from(checkboxes).map(cb => parseInt(cb.value));

            if (confirm(`Are you sure you want to delete ${indices.length} records?`)) {
                fetch('/delete_history_bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ indices: indices })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            historyLink.click();
                        } else {
                            alert('Error deleting records');
                        }
                    });
            }
        };

        // Global Delete Function
        window.deleteHistory = function (index) {
            if (confirm('Are you sure you want to delete this specific record?')) {
                fetch('/delete_history/' + index, { method: 'DELETE' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            historyLink.click(); // Reload view
                        } else {
                            alert('Error deleting record.');
                        }
                    });
            }
        };
    }





});


