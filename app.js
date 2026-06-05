/**
 * app.js - Application Logic & Predictive Simulation Model
 * Predictive Modeling for Course Demand & Revenue Forecasting (EduPro)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    currentView: 'dashboard',
    savedScenarios: [],
    inputs: {
      category: 'datascience',
      price: 49,
      duration: 24,
      level: 'intermediate',
      type: 'selfpaced',
      teacherExp: 5,
      teacherRating: 4.2,
      expertiseMatch: 'medium'
    },
    predictions: {
      enrollment: 0,
      revenue: 0,
      grade: 'Medium'
    },
    charts: {
      importance: null,
      category: null,
      priceCurve: null
    }
  };

  // DOM Elements
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.view-section');
  const mTabBtns = document.querySelectorAll('.m-tab-btn');
  const mPanes = document.querySelectorAll('.methodology-pane');
  
  // Input Controls
  const inputCategory = document.getElementById('input-category');
  const inputPrice = document.getElementById('input-price');
  const valPrice = document.getElementById('val-price');
  const inputDuration = document.getElementById('input-duration');
  const valDuration = document.getElementById('val-duration');
  const inputLevel = document.querySelectorAll('input[name="course-level"]');
  const inputType = document.querySelectorAll('input[name="course-type"]');
  const inputTeacherExp = document.getElementById('input-teacher-exp');
  const valTeacherExp = document.getElementById('val-teacher-exp');
  const inputTeacherRating = document.getElementById('input-teacher-rating');
  const valTeacherRating = document.getElementById('val-teacher-rating');
  const inputExpertiseMatch = document.getElementById('input-expertise-match');
  
  // Output Displays
  const displayEnrollments = document.getElementById('output-enrollments');
  const displayRevenue = document.getElementById('output-revenue');
  const displayGrade = document.getElementById('gauge-grade');
  const circularGauge = document.getElementById('circular-gauge');
  
  // Buttons
  const btnSaveScenario = document.getElementById('btn-save-scenario');
  const btnClearScenarios = document.getElementById('btn-clear-scenarios');
  const scenariosContainer = document.getElementById('scenarios-container');
  const btnDownloadReport = document.getElementById('btn-download-report');
  const toastNotification = document.getElementById('toast-notification');

  /* ==========================================================================
     1. Navigation and View Controls
     ========================================================================== */
  function switchView(viewId) {
    state.currentView = viewId;
    
    // Update Sidebar Navigation
    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update Sections Display
    sections.forEach(section => {
      if (section.id === `view-${viewId}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Initialize/Resize charts when entering analytics view
    if (viewId === 'analytics') {
      setTimeout(initAnalyticsCharts, 100);
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });

  // Methodology Section Tabs
  mTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const paneId = btn.getAttribute('data-pane');
      
      mTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      mPanes.forEach(pane => {
        if (pane.id === `pane-${paneId}`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });

  /* ==========================================================================
     2. Predictive Simulation Engine Formulas
     ========================================================================== */
  function calculatePredictions(priceVal) {
    const p = priceVal !== undefined ? priceVal : state.inputs.price;
    const cat = state.inputs.category;
    const dur = state.inputs.duration;
    const lvl = state.inputs.level;
    const type = state.inputs.type;
    const exp = state.inputs.teacherExp;
    const rating = state.inputs.teacherRating;
    const expMatch = state.inputs.expertiseMatch;

    // 1. Baseline demand by category
    let baseline = 300;
    let elasticity = 0.015;
    
    switch (cat) {
      case 'datascience':
        baseline = 680;
        elasticity = 0.011;
        break;
      case 'development':
        baseline = 920;
        elasticity = 0.013;
        break;
      case 'business':
        baseline = 480;
        elasticity = 0.009;
        break;
      case 'design':
        baseline = 410;
        elasticity = 0.014;
        break;
      case 'marketing':
        baseline = 380;
        elasticity = 0.017;
        break;
    }

    // 2. Adjust elasticity & baseline based on level
    let lvlMultiplier = 1.0;
    if (lvl === 'beginner') {
      lvlMultiplier = 1.35; // Beginners represent the largest market size
      // High price penalty for beginners
      if (p > 50) {
        elasticity *= 1.35;
      }
    } else if (lvl === 'advanced') {
      lvlMultiplier = 0.65; // Smaller market share
      elasticity *= 0.75;  // Advanced learners are less price sensitive
    }

    // 3. Type Multiplier (Instructor led is premium)
    const typeMultiplier = type === 'instructor' ? 1.28 : 1.0;

    // 4. Instructor Rating Multiplier (strongly non-linear)
    // Formula scales rating relative to a standard 4.0
    const ratingMultiplier = Math.pow(rating / 4.0, 3.2);

    // 5. Instructor Experience Multiplier (Logarithmic)
    const expMultiplier = 1 + 0.12 * Math.log(exp + 1);

    // 6. Expertise Match Score
    let matchMultiplier = 1.0;
    if (expMatch === 'high') matchMultiplier = 1.25;
    if (expMatch === 'low') matchMultiplier = 0.8;

    // 7. Course Duration Curve (Optimal length is around 15-30 hours)
    // Extreme short or long courses get mild discounts
    let durationMultiplier = 1.0;
    if (dur < 8) {
      durationMultiplier = 0.85;
    } else if (dur > 40) {
      durationMultiplier = 1.0 - (dur - 40) * 0.004; // steady slight decline
      durationMultiplier = Math.max(0.7, durationMultiplier);
    } else {
      durationMultiplier = 1.0 + 0.15 * Math.sin(((dur - 8) / 32) * Math.PI);
    }

    // 8. Exponential Price Elasticity Demand Model
    // D(p) = Base * multipliers * exp(-elasticity * p)
    const multiplierProduct = lvlMultiplier * typeMultiplier * ratingMultiplier * expMultiplier * matchMultiplier * durationMultiplier;
    let enrollment = baseline * multiplierProduct * Math.exp(-elasticity * p);
    
    // Ensure logical bounds
    enrollment = Math.max(1, Math.round(enrollment));
    const revenue = Math.round(enrollment * p);

    return {
      enrollment,
      revenue
    };
  }

  // Update State and UI
  function updateDashboard() {
    // Read input values
    state.inputs.category = inputCategory.value;
    state.inputs.price = parseInt(inputPrice.value);
    state.inputs.duration = parseInt(inputDuration.value);
    state.inputs.teacherExp = parseInt(inputTeacherExp.value);
    state.inputs.teacherRating = parseFloat(inputTeacherRating.value);
    state.inputs.expertiseMatch = inputExpertiseMatch.value;

    inputLevel.forEach(radio => {
      if (radio.checked) state.inputs.level = radio.value;
    });
    inputType.forEach(radio => {
      if (radio.checked) state.inputs.type = radio.value;
    });

    // Update Slider text indicators
    valPrice.textContent = `$${state.inputs.price}`;
    valDuration.textContent = `${state.inputs.duration}h`;
    valTeacherExp.textContent = `${state.inputs.teacherExp} yr${state.inputs.teacherExp !== 1 ? 's' : ''}`;
    valTeacherRating.textContent = state.inputs.teacherRating.toFixed(1);

    // Run Prediction
    const res = calculatePredictions();
    state.predictions.enrollment = res.enrollment;
    state.predictions.revenue = res.revenue;

    // Demand Grading System
    let grade = 'Low';
    let gradeColor = 'var(--color-danger)';
    let gradeDegree = 15;
    
    if (res.enrollment >= 350) {
      grade = 'Critical';
      gradeColor = 'var(--color-secondary)';
      gradeDegree = 90;
    } else if (res.enrollment >= 200) {
      grade = 'High';
      gradeColor = 'var(--color-success)';
      gradeDegree = 75;
    } else if (res.enrollment >= 90) {
      grade = 'Medium';
      gradeColor = 'var(--color-warning)';
      gradeDegree = 50;
    }
    
    state.predictions.grade = grade;

    // Display numbers (with counter effect if supported, otherwise static)
    displayEnrollments.textContent = state.predictions.enrollment.toLocaleString();
    displayRevenue.textContent = `$${state.predictions.revenue.toLocaleString()}`;
    displayGrade.textContent = grade;
    displayGrade.style.color = gradeColor;

    // Update circular progress gauge
    circularGauge.style.background = `radial-gradient(closest-side, var(--bg-card) 79%, transparent 80% 100%), conic-gradient(${gradeColor} ${gradeDegree}%, rgba(255, 255, 255, 0.05) 0)`;

    // Update Live Price Curve Chart on Dashboard if it exists
    updatePriceCurveChart();
  }

  // Setup Event Listeners on Dashboard Controls
  inputCategory.addEventListener('change', updateDashboard);
  inputPrice.addEventListener('input', updateDashboard);
  inputDuration.addEventListener('input', updateDashboard);
  inputTeacherExp.addEventListener('input', updateDashboard);
  inputTeacherRating.addEventListener('input', updateDashboard);
  inputExpertiseMatch.addEventListener('change', updateDashboard);

  inputLevel.forEach(radio => radio.addEventListener('change', updateDashboard));
  inputType.forEach(radio => radio.addEventListener('change', updateDashboard));

  /* ==========================================================================
     3. Scenario Comparison System
     ========================================================================== */
  function saveScenario() {
    const num = state.savedScenarios.length + 1;
    const catText = inputCategory.options[inputCategory.selectedIndex].text;
    const lvlText = state.inputs.level.charAt(0).toUpperCase() + state.inputs.level.slice(1);
    
    const scenarioName = prompt(`Enter a label for this course scenario:`, `Scenario ${num}: ${catText} (${lvlText})`);
    if (scenarioName === null) return; // user cancelled

    const scenario = {
      id: Date.now().toString(),
      name: scenarioName || `Scenario ${num}`,
      inputs: { ...state.inputs },
      predictions: { ...state.predictions },
      catLabel: catText
    };

    state.savedScenarios.push(scenario);
    renderScenarios();
    showToast('Scenario saved successfully!');
  }

  function removeScenario(id) {
    state.savedScenarios = state.savedScenarios.filter(sc => sc.id !== id);
    renderScenarios();
  }

  function clearScenarios() {
    if (state.savedScenarios.length === 0) return;
    if (confirm('Are you sure you want to remove all saved scenarios?')) {
      state.savedScenarios = [];
      renderScenarios();
      showToast('All scenarios cleared.');
    }
  }

  function renderScenarios() {
    scenariosContainer.innerHTML = '';
    
    if (state.savedScenarios.length === 0) {
      scenariosContainer.innerHTML = `
        <div class="empty-scenarios-message">
          <i class="fa-regular fa-folder-open" style="font-size: 1.75rem; margin-bottom: 0.5rem; display: block; color: var(--text-muted);"></i>
          No scenarios saved yet. Adjust configurations above and click "Save Scenario" to compare them.
        </div>
      `;
      return;
    }

    state.savedScenarios.forEach(sc => {
      const card = document.createElement('div');
      card.className = 'scenario-card';
      
      let gradeColor = 'var(--color-danger)';
      if (sc.predictions.grade === 'High') gradeColor = 'var(--color-success)';
      if (sc.predictions.grade === 'Medium') gradeColor = 'var(--color-warning)';
      if (sc.predictions.grade === 'Critical') gradeColor = 'var(--color-secondary)';

      card.innerHTML = `
        <button class="scenario-remove" data-id="${sc.id}" title="Remove Scenario">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="scenario-title">
          ${sc.name}
        </div>
        <div class="scenario-metrics">
          <div class="scenario-metric">
            <div class="scenario-metric-val" style="color: var(--color-primary-light);">${sc.predictions.enrollment}</div>
            <div class="scenario-metric-lbl">Enrollments</div>
          </div>
          <div class="scenario-metric">
            <div class="scenario-metric-val" style="color: var(--color-success);">$${sc.predictions.revenue.toLocaleString()}</div>
            <div class="scenario-metric-lbl">Revenue</div>
          </div>
        </div>
        <div class="scenario-details-list">
          <div class="scenario-detail-item" title="Price"><i class="fa-solid fa-tag"></i> $${sc.inputs.price}</div>
          <div class="scenario-detail-item" title="Duration"><i class="fa-solid fa-clock"></i> ${sc.inputs.duration}h</div>
          <div class="scenario-detail-item" title="Level"><i class="fa-solid fa-graduation-cap"></i> ${sc.inputs.level.slice(0,5)}..</div>
          <div class="scenario-detail-item" title="Instructor Rating"><i class="fa-solid fa-star"></i> ${sc.inputs.teacherRating.toFixed(1)} ★</div>
          <div class="scenario-detail-item" title="Type" style="grid-column: span 2;"><i class="fa-solid fa-chalkboard-user"></i> ${sc.inputs.type === 'instructor' ? 'Instructor-led' : 'Self-paced'}</div>
        </div>
      `;

      // Attach remove event
      card.querySelector('.scenario-remove').addEventListener('click', () => {
        removeScenario(sc.id);
      });

      scenariosContainer.appendChild(card);
    });
  }

  btnSaveScenario.addEventListener('click', saveScenario);
  btnClearScenarios.addEventListener('click', clearScenarios);

  /* ==========================================================================
     4. Toast Notifications
     ========================================================================== */
  let toastTimeout;
  function showToast(message) {
    clearTimeout(toastTimeout);
    toastNotification.querySelector('span').textContent = message;
    toastNotification.classList.add('show');
    
    toastTimeout = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 3000);
  }

  btnDownloadReport.addEventListener('click', () => {
    showToast('Preparing PDF Executive Summary...');
    setTimeout(() => {
      showToast('Download started: EduPro_Executive_Summary.pdf');
    }, 1500);
  });

  /* ==========================================================================
     5. Chart.js Implementation & Visualizations
     ========================================================================== */
  function initAnalyticsCharts() {
    // 1. Feature Importance Chart
    const ctxImportance = document.getElementById('chart-importance').getContext('2d');
    
    if (state.charts.importance) state.charts.importance.destroy();
    
    state.charts.importance = new Chart(ctxImportance, {
      type: 'bar',
      data: {
        labels: [
          'Past Enrollments', 
          'Instructor Rating', 
          'Course Price', 
          'Expertise Match', 
          'Teacher Experience', 
          'Course Duration'
        ],
        datasets: [{
          label: 'Relative Feature Importance (%)',
          data: [32, 22, 18, 12, 10, 6],
          backgroundColor: [
            'rgba(99, 102, 241, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(20, 184, 166, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(239, 68, 68, 0.85)'
          ],
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9ca3af', callback: val => `${val}%` }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#f3f4f6', font: { weight: 'bold' } }
          }
        }
      }
    });

    // 2. Category Performance Comparison Chart
    const ctxCategory = document.getElementById('chart-category').getContext('2d');
    
    if (state.charts.category) state.charts.category.destroy();
    
    state.charts.category = new Chart(ctxCategory, {
      type: 'bar',
      data: {
        labels: ['Data Science', 'Development', 'Business', 'Design', 'Marketing'],
        datasets: [
          {
            label: 'Aggregated Monthly Revenue ($)',
            yAxisID: 'y-revenue',
            data: [72000, 95000, 58000, 42000, 31000],
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Total Enrollments (Students)',
            yAxisID: 'y-enrollments',
            data: [1200, 1850, 950, 780, 680],
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#f3f4f6', font: { family: 'Inter' } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af' }
          },
          'y-revenue': {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
              color: '#10b981',
              callback: val => `$${val.toLocaleString()}`
            },
            title: {
              display: true,
              text: 'Projected Revenue ($)',
              color: '#10b981'
            }
          },
          'y-enrollments': {
            type: 'linear',
            position: 'right',
            grid: { display: false }, // Avoid duplicate lines
            ticks: { color: '#6366f1' },
            title: {
              display: true,
              text: 'Monthly Enrollments',
              color: '#6366f1'
            }
          }
        }
      }
    });
  }

  // 3. Price Optimization Sensitivity Chart
  function initPriceCurveChart() {
    const ctxPriceCurve = document.getElementById('chart-price-curve').getContext('2d');
    
    if (state.charts.priceCurve) state.charts.priceCurve.destroy();
    
    // Generate pricing model curve points ($10 to $200)
    const pricePoints = [];
    const revenuePoints = [];
    const enrollmentPoints = [];
    
    for (let p = 10; p <= 200; p += 10) {
      const pred = calculatePredictions(p);
      pricePoints.push(p);
      revenuePoints.push(pred.revenue);
      enrollmentPoints.push(pred.enrollment);
    }

    // Find optimal price where revenue is maximum
    let maxRev = -1;
    let optimalPrice = 0;
    revenuePoints.forEach((rev, idx) => {
      if (rev > maxRev) {
        maxRev = rev;
        optimalPrice = pricePoints[idx];
      }
    });

    // Determine current price position index
    const currentPrice = state.inputs.price;
    const currentPred = calculatePredictions(currentPrice);

    state.charts.priceCurve = new Chart(ctxPriceCurve, {
      type: 'line',
      data: {
        labels: pricePoints.map(p => `$${p}`),
        datasets: [
          {
            label: 'Predicted Revenue Curve ($)',
            data: revenuePoints,
            borderColor: 'rgba(16, 185, 129, 0.85)',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            yAxisID: 'y'
          },
          {
            label: 'Current Setup Price',
            data: pricePoints.map(p => p === Math.round(currentPrice / 10) * 10 ? currentPred.revenue : null),
            borderColor: '#a855f7',
            backgroundColor: '#a855f7',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#f3f4f6' }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label.indexOf('Current') !== -1) {
                  return `Selected: $${currentPrice} -> Est. Rev: $${currentPred.revenue.toLocaleString()}`;
                }
                if (context.parsed.y !== null) {
                  label += `: $${context.parsed.y.toLocaleString()}`;
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9ca3af' },
            title: {
              display: true,
              text: 'Course Pricing Tier ($)',
              color: '#9ca3af'
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
              color: '#9ca3af',
              callback: val => `$${val.toLocaleString()}`
            },
            title: {
              display: true,
              text: 'Projected Course Revenue',
              color: '#9ca3af'
            }
          }
        }
      }
    });

    // Update optimal text indicator on dashboard
    const optimalTextElement = document.getElementById('optimal-pricing-text');
    if (optimalTextElement) {
      optimalTextElement.innerHTML = `Category Sweet Spot: <strong style="color: var(--color-success);">$${optimalPrice}</strong> (Projected Max Revenue: $${maxRev.toLocaleString()})`;
    }
  }

  function updatePriceCurveChart() {
    if (!state.charts.priceCurve) {
      initPriceCurveChart();
      return;
    }

    const pricePoints = [];
    const revenuePoints = [];
    
    for (let p = 10; p <= 200; p += 10) {
      const pred = calculatePredictions(p);
      pricePoints.push(p);
      revenuePoints.push(pred.revenue);
    }

    let maxRev = -1;
    let optimalPrice = 0;
    revenuePoints.forEach((rev, idx) => {
      if (rev > maxRev) {
        maxRev = rev;
        optimalPrice = pricePoints[idx];
      }
    });

    const currentPrice = state.inputs.price;
    const currentPred = calculatePredictions(currentPrice);

    // Map current price dot
    const currentDotData = pricePoints.map(p => {
      // Find closest price point on chart grid
      const step = Math.round(currentPrice / 10) * 10;
      return p === step ? currentPred.revenue : null;
    });

    state.charts.priceCurve.data.datasets[0].data = revenuePoints;
    state.charts.priceCurve.data.datasets[1].data = currentDotData;
    state.charts.priceCurve.update('none'); // silent update without reset transition

    const optimalTextElement = document.getElementById('optimal-pricing-text');
    if (optimalTextElement) {
      optimalTextElement.innerHTML = `Category Sweet Spot: <strong style="color: var(--color-success);">$${optimalPrice}</strong> (Projected Max Revenue: $${maxRev.toLocaleString()})`;
    }
  }

  // Initial Run
  updateDashboard();
  initPriceCurveChart();
  renderScenarios();
});
