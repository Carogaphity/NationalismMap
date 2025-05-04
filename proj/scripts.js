// =========================
// Configuration Constants
// =========================

const stageColors = {
  "Unknown": "#d9d9d9",
  "Democracy": "#69c0ff",
  "Elected Nationalist": "#fa8c16",
  "Authoritarian": "#fadb14",
  "Dictatorship": "#ff4d4f",
};

const likertColors = {
  "N/A": "5C5C5C",
  "Democratic": "#919191",
  "Low": "#85e630",
  "Medium": "#e6dc30",
  "High": "#ed2e2b",
  "Very High": "#8a0a08"
};

// =========================
// Utility Functions
// =========================

// Lightens a hex color by a given amount
function lightenColor(hex, amt) {
  const clamp = v => Math.min(255, Math.max(0, v));
  const num = parseInt(hex.slice(1), 16);
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xFF) + amt);
  const b = clamp((num & 0xFF) + amt);
  return `rgb(${r},${g},${b})`;
}

// Loads CSV country data and returns it as an object keyed by country ID
async function loadCountryData() {
  const response = await fetch('assets/content/countries.csv');
  const csvText = await response.text();
  const [header, ...rows] = csvText.trim().split('\n');

  return rows.reduce((acc, line) => {
    const [id, country, stage, popularity, volatility, position] = line.split(',');
    acc[id.trim()] = { country, stage, popularity, volatility, position };
    return acc;
  }, {});
}

// =========================
// DOM Elements
// =========================

const objectEl = document.getElementById("svgMap");
const infoBox = document.getElementById("infoBox");
const infoContent = document.getElementById("infoContent");
const toggleBtn = document.getElementById("toggleButton");
const strictCheckbox = document.getElementById("strictMode");
const bordersToggle = document.getElementById("showBorders");
const statusTrack = document.getElementById("statusTrack");

const tooltip = document.createElement("div");
tooltip.className = "tooltip";
document.body.appendChild(tooltip);

let scrollTimer = null;

// =========================
// UI Event Listeners
// =========================



// Toggle info panel visibility
toggleBtn.addEventListener("click", () => {
  infoBox.classList.toggle("expanded");
  toggleBtn.classList.toggle("expanded");
});

// When SVG map loads, bind interaction logic
objectEl.addEventListener("load", async () => {
  const countryData = await loadCountryData();
  const svgDoc = objectEl.contentDocument;
  const svgEl = svgDoc.querySelector("svg");
  const countries = svgDoc.querySelectorAll("path");

  countries.forEach(country => {
    const id = country.getAttribute("id");
    const data = countryData[id] || {
      country: id,
      stage: "Unknown",
      popularity: "N/A",
      volatility: "N/A",
      position: "N/A"
    };

    const baseColor = stageColors[data.stage] || stageColors["Unknown"];
    country.style.fill = baseColor;
    country.style.cursor = "pointer";

    // Hover effects
    country.addEventListener("mouseover", (e) => {
      tooltip.style.display = "block";
      tooltip.innerHTML = `
        <strong>${data.country}</strong><br>
        Stage: ${data.stage}<br>
        Popularity: <span style="color:${likertColors[data.popularity] || '#000'}">${data.popularity}</span><br>
        Volatility: <span style="color:${likertColors[data.volatility] || '#000'}">${data.volatility}</span><br>
        Position: ${data.position}
      `;
      country.style.fill = lightenColor(baseColor, 30);
    });

    country.addEventListener("mouseout", () => {
      tooltip.style.display = "none";
      country.style.fill = baseColor;
    });

    country.addEventListener("mousemove", (e) => {
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
    });

    // Click to fetch and display country info
    country.addEventListener("click", () => {
      fetch(`assets/text/${id}.txt`)
        .then(r => r.ok ? r.text() : Promise.reject("not found"))
        .then(text => renderInfoBox(data, baseColor, text))
        .catch(() => renderInfoBox(data, baseColor, "No detailed info available."));
    });
  });

  bordersToggle.addEventListener("change", () => {
    updateBorders(bordersToggle.checked);
  });

  if (bordersToggle.checked) {
    updateBorders(true);
  }

  // =========================
  // Helper Functions
  // =========================

  // Calculates percentage of each stage
  function calculateStagePercentages(data, strictOnly) {
    const counts = Object.fromEntries(Object.keys(stageColors).map(stage => [stage, 0]));
    let total = 0;

    Object.values(data).forEach(({ stage }) => {
      if (!stageColors[stage]) return;

      Object.keys(counts).forEach((s, i) => {
        if (stage === s || (!strictOnly && Object.keys(counts).indexOf(stage) > i)) {
          counts[s]++;
        }
      });

      total++;
    });

    return Object.entries(counts).map(([stage, count]) => ({
      stage,
      percent: total ? ((count / total) * 100).toFixed(1) : 0
    }));
  }

  function updateBorders(visible) {
    countries.forEach(country => {
      if (visible) {
        country.style.stroke = "#000";
        country.style.strokeWidth = "0.5";
      } else {
        country.style.stroke = "none";
      }
    });
  }

  // Updates the scrolling status bar
  function updateStageStatusLines(data) {
    clearTimeout(scrollTimer);
    const strictOnly = strictCheckbox.checked;
    const stats = calculateStagePercentages(data, strictOnly);

    const lines = stats.map(({ stage, percent }) => {
      const color = stageColors[stage] || "#000";
      return `<div class="statusLine"><span style="color:#000">The world is </span><span style="color:${color}">${percent}% ${stage}</span></div>`;
    });

    const allLines = [...lines, ...lines];
    statusTrack.innerHTML = allLines.join('');
    let index = 0;

    const step = () => {
      index++;
      if (index >= lines.length * 2) index = 0;

      statusTrack.style.transition = "transform 0.6s ease-in-out";
      statusTrack.style.transform = `translateY(-${index * 30}px)`;

      if (index === lines.length) {
        setTimeout(() => {
          statusTrack.style.transition = "none";
          statusTrack.style.transform = "translateY(0px)";
          index = 0;
        }, 700);
      }

      scrollTimer = setTimeout(step, 2000);
    };

    scrollTimer = setTimeout(step, 2000);
  }

  // Renders info box content for selected country
  function renderInfoBox(data, baseColor, text) {
    infoContent.innerHTML = `
      <strong>${data.country}</strong><br>
      <br><br>
      <div>${text}</div>
    `;
    infoBox.style.borderColor = baseColor;
    toggleBtn.style.borderColor = baseColor;
    toggleBtn.style.backgroundColor = "#f9f9f9";
  }

  // Bind checkbox change
  strictCheckbox.addEventListener("change", () => updateStageStatusLines(countryData));

  // Initial update
  updateStageStatusLines(countryData);

  // Initialize zoom/pan
  svgPanZoom(svgEl, {
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true
  });
});