/**
 * ============================================================
 * ADAPTRON V5 — Application principale (SPA)
 * Intègre : Navigation, Dashboard live, ROI, Moteur ML
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {

    // ══════════════════════════════════════════════════════════
    // 1. NAVIGATION SPA
    // ══════════════════════════════════════════════════════════
    const navButtons   = document.querySelectorAll(".nav-btn");
    const viewSections = document.querySelectorAll(".view-section");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            navButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            viewSections.forEach(sec => {
                sec.classList.remove("active");
                sec.classList.add("hidden");
            });
            const targetId = btn.getAttribute("data-target");
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.remove("hidden");
                target.classList.add("active");
            }
        });
    });


    // ══════════════════════════════════════════════════════════
    // 2. CHART.JS — GRAPHIQUE LIVE DASHBOARD
    // ══════════════════════════════════════════════════════════
    const ctx = document.getElementById('liveChart');
    let liveChart = null;

    if (ctx) {
        liveChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Puissance SNEL Réseau (W)',
                        data: [],
                        borderColor: '#00A3FF',
                        backgroundColor: 'rgba(0, 163, 255, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 1
                    },
                    {
                        label: 'Puissance Power Station (W)',
                        data: [],
                        borderColor: '#FF7F00',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#8AA4C8', font: { family: 'Outfit', weight: 'bold' } } } },
                scales: {
                    x: { ticks: { color: '#8AA4C8', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#8AA4C8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                },
                animation: { duration: 400 }
            }
        });
    }

    // ══════════════════════════════════════════════════════════
    // 3. CHART.JS — GRAPHIQUE ML (Historique + Prévision)
    // ══════════════════════════════════════════════════════════
    const mlCtx = document.getElementById('mlChart');
    let mlChart = null;

    if (mlCtx) {
        mlChart = new Chart(mlCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Mesure Réelle (W)',
                        data: [],
                        borderColor: '#00A3FF',
                        backgroundColor: 'rgba(0, 163, 255, 0.08)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 2
                    },
                    {
                        label: 'Prédiction IA (W)',
                        data: [],
                        borderColor: '#30D158',
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        borderDash: [6, 3],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 3,
                        pointBackgroundColor: '#30D158'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#8AA4C8', font: { family: 'Outfit', weight: 'bold' } } } },
                scales: {
                    x: { ticks: { color: '#8AA4C8', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#8AA4C8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                },
                animation: { duration: 300 }
            }
        });
    }

    // Références aux éléments du dashboard
    const valVoltage = document.getElementById("val-voltage");
    const valFreq    = document.getElementById("val-freq");
    const valPower   = document.getElementById("val-power");
    const valUpsPower = document.getElementById("val-ups-power");
    const valSoc     = document.getElementById("val-soc");
    const batteryBar = document.getElementById("battery-level-bar");

    // ══════════════════════════════════════════════════════════
    // 4. BOUCLE DE DONNÉES (ESP32 / Mock) + INJECTION ML
    // ══════════════════════════════════════════════════════════
    let lastData = { voltage: 225, freq: 50, power: 1200, upsPower: 300, soc: 75 };
    let anomalyLog = []; // journal local

    setInterval(async () => {
        let data = { voltage: 0, freq: 0, power: 0, upsPower: 0, soc: 0 };
        const targetIp = document.getElementById("target-ip")
            ? document.getElementById("target-ip").value.trim()
            : "";

        try {
            const endpoint = targetIp.endsWith('/')
                ? targetIp + 'api/data'
                : targetIp + '/api/data';
            const res = await fetch(endpoint, { signal: AbortSignal.timeout(1000) });
            if (res.ok) {
                data = await res.json();
            } else { throw new Error("API indisponible"); }
        } catch (e) {
            // Mode simulation (dév / démo)
            const t = Date.now() / 1000;
            data.voltage  = 225 + Math.sin(t * 0.3) * 8;
            data.freq     = 50  + Math.cos(t * 0.5) * 0.3;
            // Simulation de profils de consommation réalistes
            data.power    = 1400 + Math.sin(t * 0.12) * 600
                          + Math.random() * 200
                          + (Math.random() < 0.03 ? 1800 : 0); // spike aléatoire 3%
            data.upsPower = 280 + Math.random() * 60;
            data.soc      = Math.max(10, Math.min(100, 75 - (t % 3000) / 100));
        }

        lastData = data;

        // — Mise à jour Dashboard UI —
        if (valVoltage) valVoltage.innerText = data.voltage.toFixed(1);
        if (valFreq)    valFreq.innerText    = data.freq.toFixed(1);
        if (valPower)   valPower.innerText   = data.power.toFixed(0);
        if (valUpsPower) valUpsPower.innerText = data.upsPower.toFixed(0);

        const soc = Math.max(0, data.soc);
        if (valSoc)     valSoc.innerText     = soc.toFixed(1) + "%";
        if (batteryBar) batteryBar.style.width = soc.toFixed(1) + "%";

        if (soc < 20 && batteryBar) {
            batteryBar.style.background  = "var(--accent-red)";
            batteryBar.style.boxShadow   = "0 0 10px rgba(255, 69, 58, 0.4)";
        } else if (batteryBar) {
            batteryBar.style.background  = "linear-gradient(90deg, var(--accent-orange), #FFAA00)";
            batteryBar.style.boxShadow   = "0 0 15px rgba(255, 127, 0, 0.4)";
        }

        // — Graphique Live —
        if (liveChart) {
            const timeStr = new Date().toLocaleTimeString('fr-FR');
            liveChart.data.labels.push(timeStr);
            liveChart.data.datasets[0].data.push(data.power);
            liveChart.data.datasets[1].data.push(data.upsPower);
            if (liveChart.data.labels.length > 40) {
                liveChart.data.labels.shift();
                liveChart.data.datasets[0].data.shift();
                liveChart.data.datasets[1].data.shift();
            }
            liveChart.update();
        }

        // — Injection dans le moteur ML —
        if (window.AdaptronML) {
            await window.AdaptronML.processDataPoint(data);
        }

    }, 2000);


    // ══════════════════════════════════════════════════════════
    // 5. CALLBACK ML → MÀJ UI IA
    // ══════════════════════════════════════════════════════════
    if (window.AdaptronML) {
        window.AdaptronML.onUpdate = (mlResult) => {
            updateMLUI(mlResult);
        };
    }

    // ══════════════════════════════════════════════════════════
    // 6. MOTEUR ROI
    // ══════════════════════════════════════════════════════════
    const slider     = document.getElementById("consumption-slider");
    const simulKwh   = document.getElementById("simul-kwh");
    const valEcretage = document.getElementById("roi-ecretage");
    const valDelestage = document.getElementById("roi-delestage");
    const valTotal   = document.getElementById("roi-total");
    const roiYears   = document.getElementById("roi-years");

    function calculerROI(kwhMois) {
        const tarif         = 0.15;
        const ecoEcretage   = kwhMois * tarif * 0.25;
        const ecoDelestage  = kwhMois * tarif * 0.30;
        const totalMois     = ecoEcretage + ecoDelestage;
        const anneesROI     = 500 / (totalMois * 12);

        if (simulKwh)   simulKwh.innerText   = kwhMois;
        if (valEcretage) valEcretage.innerText = ecoEcretage.toFixed(2);
        if (valDelestage) valDelestage.innerText = ecoDelestage.toFixed(2);
        if (valTotal)   valTotal.innerText   = totalMois.toFixed(2);
        if (roiYears)   roiYears.innerText   = anneesROI.toFixed(1) + " ans";
    }

    if (slider) {
        slider.addEventListener("input", e => calculerROI(e.target.value));
        calculerROI(slider.value);
    }

}); // end DOMContentLoaded


// ══════════════════════════════════════════════════════════════
// 7. MISE À JOUR UI IA (exposé globalement)
// ══════════════════════════════════════════════════════════════
window.updateMLUI = function(mlResult) {
    if (!mlResult) return;

    const { prediction, anomaly, recommendation, status } = mlResult;

    // ── Statut du modèle ──
    const progressFill  = document.getElementById("training-progress-fill");
    const progressLabel = document.getElementById("training-progress-label");
    const phaseBadge    = document.getElementById("model-phase-badge");
    const phaseText     = document.getElementById("model-phase-text");
    const mlCycles      = document.getElementById("ml-cycles");
    const mlLoss        = document.getElementById("ml-loss");
    const mlConfidence  = document.getElementById("ml-confidence");
    const mlBuffer      = document.getElementById("ml-buffer");
    const mlDot         = document.getElementById("ml-dot");
    const mlMiniLabel   = document.getElementById("ml-mini-label");

    if (status) {
        const pct = Math.min(100, parseFloat(status.progress));
        if (progressFill)  progressFill.style.width = pct + "%";
        if (progressLabel) progressLabel.textContent = `${status.totalSamples} / 40 échantillons`;
        if (mlCycles)     mlCycles.textContent = status.trainingCycles;
        if (mlLoss)       mlLoss.textContent   = status.loss || "—";
        if (mlBuffer)     mlBuffer.textContent = status.bufferSize + " pts";

        // Phase badge
        if (phaseBadge && phaseText) {
            if (status.isTraining) {
                phaseBadge.className = "model-phase-badge training";
                phaseText.textContent = "⏳ Entraînement en cours...";
                if (mlDot) { mlDot.className = "ml-dot training"; }
                if (mlMiniLabel) mlMiniLabel.textContent = "IA: Entraînement...";
            } else if (status.isModelReady) {
                phaseBadge.className = "model-phase-badge ready";
                phaseText.textContent = `✅ Modèle opérationnel (cycle #${status.trainingCycles})`;
                if (mlDot)       { mlDot.className = "ml-dot ready"; }
                if (mlMiniLabel) mlMiniLabel.textContent = `IA: Actif (${status.trainingCycles} cycles)`;
            } else {
                phaseBadge.className = "model-phase-badge";
                phaseText.textContent = `⏳ Collecte de données... (${status.totalSamples}/40)`;
                if (mlDot)       { mlDot.className = "ml-dot collecting"; }
                if (mlMiniLabel) mlMiniLabel.textContent = `IA: ${status.totalSamples}/40 pts`;
            }
        }
    }

    // ── Prédiction ──
    if (prediction) {
        const predEl   = document.getElementById("pred-next-power");
        const confEl   = document.getElementById("ml-confidence");
        const confBar  = document.getElementById("confidence-bar-fill");
        const confPct  = document.getElementById("confidence-pct");
        const forecRow = document.getElementById("forecast-row");

        if (predEl)  predEl.textContent  = Math.round(prediction.nextPower);
        if (confEl)  confEl.textContent  = prediction.confidence + "%";
        if (confBar) confBar.style.width  = prediction.confidence + "%";
        if (confPct) confPct.textContent  = prediction.confidence + "%";

        // Forecast chips
        if (forecRow && prediction.forecast) {
            const chips = forecRow.querySelectorAll(".forecast-chip");
            prediction.forecast.forEach((val, i) => {
                if (chips[i]) {
                    chips[i].textContent = `t+${i+1}: ${Math.round(val)}W`;
                    chips[i].style.opacity = (1 - i * 0.12).toFixed(2);
                }
            });
        }

        // Graphique ML
        const mlChart = window._mlChartInstance;
        if (mlChart) {
            const timeStr = new Date().toLocaleTimeString('fr-FR');
            mlChart.data.labels.push(timeStr);
            mlChart.data.datasets[0].data.push(
                window._lastRealPower || prediction.nextPower
            );
            mlChart.data.datasets[1].data.push(prediction.nextPower);
            if (mlChart.data.labels.length > 50) {
                mlChart.data.labels.shift();
                mlChart.data.datasets[0].data.shift();
                mlChart.data.datasets[1].data.shift();
            }
            mlChart.update();
        }
    }

    // ── Anomalies ──
    if (anomaly) {
        const zsEl     = document.getElementById("anomaly-zscore");
        const badge    = document.getElementById("anomaly-status-badge");
        const badgeIcon = document.getElementById("anomaly-status-icon");
        const badgeText = document.getElementById("anomaly-status-text");
        const needle   = document.getElementById("gauge-needle");
        const anomalyBadgeNav = document.getElementById("anomaly-badge");

        const zScore = parseFloat(anomaly.zScore) || 0;

        if (zsEl) {
            zsEl.textContent = zScore.toFixed(2) + "σ";
            zsEl.style.color = zScore > 2.8 ? "var(--accent-red)" :
                               zScore > 1.5 ? "var(--accent-orange)" : "var(--accent-green)";
        }

        // Rotation aiguille (-90° = 0, +90° = max)
        if (needle) {
            const angle = Math.min(180, (zScore / 4) * 180) - 90;
            needle.setAttribute("transform", `rotate(${angle} 60 65)`);
        }

        if (badge && badgeIcon && badgeText) {
            if (anomaly.severity === 'critique') {
                badge.className = "anomaly-status-badge critical";
                badgeIcon.textContent = "🔴";
                badgeText.textContent = `CRITIQUE ! Pic de consommation anormal (Z=${anomaly.zScore})`;
                if (anomalyBadgeNav) anomalyBadgeNav.style.display = "flex";
                // Ajouter au journal
                addAnomalyLog(`Anomalie critique — Z=${anomaly.zScore} — ${Math.round(anomaly.power)}W`);
            } else if (anomaly.severity === 'alerte') {
                badge.className = "anomaly-status-badge warning";
                badgeIcon.textContent = "🔶";
                badgeText.textContent = `Alerte — Valeur inhabituelle (Z=${anomaly.zScore})`;
                if (anomalyBadgeNav) anomalyBadgeNav.style.display = "flex";
            } else {
                badge.className = "anomaly-status-badge";
                badgeIcon.textContent = "🟢";
                badgeText.textContent = "Nominal — Aucune anomalie détectée";
                if (anomalyBadgeNav) anomalyBadgeNav.style.display = "none";
            }
        }
    }

    // ── Recommandation ──
    if (recommendation) {
        const recIcon  = document.getElementById("rec-icon");
        const recMode  = document.getElementById("rec-mode-text");
        const recReason = document.getElementById("rec-reason");
        const recTrend  = document.getElementById("rec-trend");

        if (recIcon)   recIcon.textContent  = recommendation.icon;
        if (recMode) {
            recMode.textContent  = recommendation.mode;
            recMode.className = "rec-mode-text " + (recommendation.color || "green");
        }
        if (recReason) {
            recReason.textContent = recommendation.reason;
            recReason.style.borderLeftColor = recommendation.color === 'red'    ? "var(--accent-red)"    :
                                              recommendation.color === 'orange' ? "var(--accent-orange)" :
                                              recommendation.color === 'cyan'   ? "var(--accent-cyan)"   :
                                              "var(--accent-green)";
        }
        if (recTrend) {
            const trendMap = { hausse: '📈 Hausse', baisse: '📉 Baisse', stable: '➡️ Stable' };
            recTrend.textContent = trendMap[recommendation.trend] || "—";
        }
    }
};

// Ajouter une entrée au journal des anomalies
function addAnomalyLog(msg) {
    const logEl = document.getElementById("anomaly-log");
    if (!logEl) return;

    // Retirer le message "vide"
    const empty = logEl.querySelector(".anomaly-log-empty");
    if (empty) empty.remove();

    const entry = document.createElement("div");
    entry.className = "anomaly-log-entry";
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">⚠ ${msg}</span>`;
    logEl.insertBefore(entry, logEl.firstChild);

    // Limiter à 6 entrées
    while (logEl.children.length > 6) logEl.removeChild(logEl.lastChild);
}

// Exposer le dernier mlChart pour updateMLUI
document.addEventListener("DOMContentLoaded", () => {
    const mlCtxRef = document.getElementById('mlChart');
    if (mlCtxRef) {
        // chart.js crée l'instance ici, on la stocke globalement après init
        setTimeout(() => {
            const charts = Object.values(Chart.instances || {});
            const mlChartInstance = charts.find(c => c.canvas && c.canvas.id === 'mlChart');
            window._mlChartInstance = mlChartInstance || null;
        }, 500);
    }
});


// ══════════════════════════════════════════════════════════════
// 8. COMMANDES HARDWARE (Boutons → ESP32)
// ══════════════════════════════════════════════════════════════
window.sendCommand = async function(endpoint) {
    try {
        const targetIp = document.getElementById("target-ip")
            ? document.getElementById("target-ip").value.trim()
            : "";
        const finalUrl = targetIp.endsWith('/')
            ? targetIp.slice(0, -1) + endpoint
            : targetIp + endpoint;

        await fetch(finalUrl, { method: 'POST' });
        alert("✅ Commande relayée via le réseau au contrôleur !");
    } catch (e) {
        alert("❌ Impossible de joindre l'ESP32. (Vérifiez la connexion réseau)");
    }
};

// Applique la recommandation IA comme commande vers l'ESP32
window.applyMLRecommendation = async function() {
    const ml = window.AdaptronML;
    if (!ml || !ml.lastRecommendation) {
        alert("⚠ Aucune recommandation IA disponible pour l'instant.");
        return;
    }

    const rec = ml.lastRecommendation;
    let action = "auto";
    if (rec.mode.includes("SNEL"))    action = "force_snel";
    else if (rec.mode.includes("BATTERIE") || rec.mode.includes("BATT")) action = "force_ups";

    const endpoint = `/api/cmd?action=${action}&source=ml`;
    await window.sendCommand(endpoint);
};
