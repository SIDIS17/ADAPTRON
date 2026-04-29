/**
 * ============================================================
 * ADAPTRON V5 — Moteur IA / Machine Learning
 * Basé sur TensorFlow.js (in-browser, temps réel)
 * ============================================================
 * Fonctionnalités :
 *   1. Réseau de neurones dense → prédiction consommation (t+1, t+5)
 *   2. Détection d'anomalies par Z-score sur fenêtre glissante
 *   3. Recommandation de mode optimal (SNEL / Hybride / Batterie)
 *   4. Entraînement incrémental online (aucun serveur requis)
 * ============================================================
 */

class AdaptronMLEngine {
    constructor() {
        // --- Hyperparamètres ---
        this.WINDOW_SIZE       = 20;   // Taille de la fenêtre d'entrée (pas de temps)
        this.FORECAST_STEPS    = 5;    // Pas de prédiction future
        this.MIN_TRAIN_SAMPLES = 40;   // Seuils avant premier entraînement
        this.RETRAIN_EVERY     = 20;   // Réentraîner tous les N nouveaux points
        this.MAX_BUFFER        = 300;  // Taille max du buffer de données
        this.BATCH_SIZE        = 32;
        this.EPOCHS_PER_CYCLE  = 8;
        this.ANOMALY_THRESHOLD = 2.8;  // Z-score

        // --- État interne ---
        this.model             = null;
        this.isModelReady      = false;
        this.isTraining        = false;
        this.samplesSinceRetrain = 0;
        this.totalSamplesAdded = 0;
        this.lastTrainLoss     = null;
        this.trainingCycles    = 0;

        // --- Buffers de données (normalisées) ---
        this.powerBuffer   = [];  // Puissance SNEL
        this.socBuffer     = [];  // State of Charge
        this.voltageBuffer = [];  // Tension réseau

        // --- Statistiques glissantes (pour normalisation + anomalie) ---
        this.stats = {
            power:   { mean: 1500, variance: 250000, std: 500, n: 0 },
            voltage: { mean: 225,  variance: 25,     std: 5,   n: 0 },
            soc:     { mean: 70,   variance: 400,    std: 20,  n: 0 },
        };

        // --- Résultats exposés ---
        this.lastPrediction = null; // { nextPower, forecast[], confidence }
        this.lastAnomaly    = null; // { isAnomaly, zScore, severity }
        this.lastRecommendation = null;

        // --- Callbacks UI ---
        this.onUpdate = null; // appelé après chaque maj

        this._initModel();
    }

    // ──────────────────────────────────────────────
    // 1. CONSTRUCTION DU MODÈLE
    // ──────────────────────────────────────────────

    _initModel() {
        try {
            // Architecture : Dense séquentiel adapté aux séries temporelles légères
            // Entrée : [power_t, power_t-1, ..., power_t-WINDOW, soc_t, volt_t]
            const inputDim = this.WINDOW_SIZE + 2;

            this.model = tf.sequential({
                layers: [
                    tf.layers.dense({
                        inputShape:  [inputDim],
                        units:       32,
                        activation:  'relu',
                        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
                    }),
                    tf.layers.batchNormalization(),
                    tf.layers.dense({ units: 16, activation: 'relu' }),
                    tf.layers.dropout({ rate: 0.15 }),
                    tf.layers.dense({ units: 8,  activation: 'relu' }),
                    tf.layers.dense({ units: this.FORECAST_STEPS, activation: 'linear' })
                ]
            });

            this.model.compile({
                optimizer: tf.train.adam(0.0015),
                loss: 'meanSquaredError',
                metrics: ['mae']
            });

            console.log('[AdaptronML] Modèle initialisé. Architecture :', inputDim, '→ 32 → 16 → 8 →', this.FORECAST_STEPS);
        } catch (e) {
            console.error('[AdaptronML] Erreur initialisation TensorFlow.js :', e);
        }
    }

    // ──────────────────────────────────────────────
    // 2. NORMALISATION / DÉNORMALISATION (Welford online)
    // ──────────────────────────────────────────────

    _updateStats(key, value) {
        const s = this.stats[key];
        s.n++;
        const delta  = value - s.mean;
        s.mean      += delta / s.n;
        const delta2 = value - s.mean;
        s.variance  += (delta * delta2 - s.variance) / Math.min(s.n, 200); // fenêtre courte
        s.std        = Math.sqrt(Math.max(s.variance, 1));
    }

    _normalize(value, key) {
        const s = this.stats[key];
        return (value - s.mean) / (s.std || 1);
    }

    _denormalize(value, key) {
        const s = this.stats[key];
        return value * s.std + s.mean;
    }

    // ──────────────────────────────────────────────
    // 3. DÉTECTION D'ANOMALIES (Z-score + tendance)
    // ──────────────────────────────────────────────

    _detectAnomaly(power) {
        const zScore = Math.abs((power - this.stats.power.mean) / (this.stats.power.std || 1));
        const isAnomaly = zScore > this.ANOMALY_THRESHOLD;

        let severity = 'normal';
        if (zScore > this.ANOMALY_THRESHOLD * 1.5) severity = 'critique';
        else if (isAnomaly) severity = 'alerte';

        this.lastAnomaly = { isAnomaly, zScore: zScore.toFixed(2), severity, power };
        return this.lastAnomaly;
    }

    // ──────────────────────────────────────────────
    // 4. CONSTRUCTION DES FEATURES POUR LE MODÈLE
    // ──────────────────────────────────────────────

    _buildFeatureVector() {
        if (this.powerBuffer.length < this.WINDOW_SIZE) return null;

        // Fenêtre glissante normalisée de puissance
        const powerWindow = this.powerBuffer.slice(-this.WINDOW_SIZE)
                                            .map(v => this._normalize(v, 'power'));

        // Contexte instantané
        const latestSoc  = this._normalize(this.socBuffer[this.socBuffer.length - 1] || 70, 'soc');
        const latestVolt = this._normalize(this.voltageBuffer[this.voltageBuffer.length - 1] || 225, 'voltage');

        return [...powerWindow, latestSoc, latestVolt];
    }

    _buildTrainingSamples() {
        const samples = [];
        const minLen  = this.WINDOW_SIZE + this.FORECAST_STEPS;

        for (let i = 0; i + minLen <= this.powerBuffer.length; i++) {
            const xPowerWindow = this.powerBuffer.slice(i, i + this.WINDOW_SIZE)
                                                 .map(v => this._normalize(v, 'power'));
            const socVal  = this._normalize(this.socBuffer[i + this.WINDOW_SIZE - 1] || 70, 'soc');
            const voltVal = this._normalize(this.voltageBuffer[i + this.WINDOW_SIZE - 1] || 225, 'voltage');

            const x = [...xPowerWindow, socVal, voltVal];
            const y = this.powerBuffer.slice(i + this.WINDOW_SIZE, i + this.WINDOW_SIZE + this.FORECAST_STEPS)
                                      .map(v => this._normalize(v, 'power'));

            if (y.length === this.FORECAST_STEPS) {
                samples.push({ x, y });
            }
        }
        return samples;
    }

    // ──────────────────────────────────────────────
    // 5. ENTRAÎNEMENT
    // ──────────────────────────────────────────────

    async _train() {
        if (this.isTraining || !this.model) return;
        const samples = this._buildTrainingSamples();
        if (samples.length < this.MIN_TRAIN_SAMPLES) return;

        this.isTraining = true;
        this.samplesSinceRetrain = 0;

        try {
            const xs = tf.tensor2d(samples.map(s => s.x));
            const ys = tf.tensor2d(samples.map(s => s.y));

            const history = await this.model.fit(xs, ys, {
                epochs:    this.EPOCHS_PER_CYCLE,
                batchSize: this.BATCH_SIZE,
                shuffle:   true,
                verbose:   0,
                validationSplit: 0.15,
            });

            const lastEpoch = history.history.loss.length - 1;
            this.lastTrainLoss = history.history.loss[lastEpoch].toFixed(6);
            this.trainingCycles++;
            this.isModelReady = true;

            xs.dispose();
            ys.dispose();

            console.log(`[AdaptronML] Cycle #${this.trainingCycles} terminé — Loss: ${this.lastTrainLoss}`);
        } catch (e) {
            console.error('[AdaptronML] Erreur entraînement :', e);
        }

        this.isTraining = false;
    }

    // ──────────────────────────────────────────────
    // 6. PRÉDICTION
    // ──────────────────────────────────────────────

    _predict() {
        if (!this.isModelReady || !this.model) return null;

        const features = this._buildFeatureVector();
        if (!features) return null;

        let values = null;
        tf.tidy(() => {
            const inputTensor = tf.tensor2d([features]);
            const output      = this.model.predict(inputTensor);
            values = Array.from(output.dataSync());
        });

        if (!values) return null;

        // Dénormaliser les prédictions
        const forecast = values.map(v => Math.max(0, this._denormalize(v, 'power')));

        // Niveau de confiance basé sur les cycles d'entraînement et le loss
        const confidenceRaw  = Math.min(95, 40 + this.trainingCycles * 4);
        const lossBonus      = this.lastTrainLoss ? Math.max(0, 10 - parseFloat(this.lastTrainLoss) * 5000) : 0;
        const confidence     = Math.min(99, confidenceRaw + lossBonus);

        this.lastPrediction = {
            nextPower:  forecast[0],
            forecast,
            confidence: confidence.toFixed(1),
        };

        return this.lastPrediction;
    }

    // ──────────────────────────────────────────────
    // 7. RECOMMANDATION DE MODE
    // ──────────────────────────────────────────────

    _computeRecommendation(data) {
        const { power, soc, voltage } = data;
        const pred = this.lastPrediction;
        const anomaly = this.lastAnomaly;

        // Tendance de la consommation
        let trend = 'stable';
        if (pred && pred.forecast.length >= 3) {
            const delta = pred.forecast[pred.forecast.length - 1] - pred.forecast[0];
            if (delta > 200)       trend = 'hausse';
            else if (delta < -200) trend = 'baisse';
        }

        // Logique de recommandation
        let rec = { mode: 'AUTO IA', color: 'green', icon: '🤖', reason: '', priority: 0 };

        if (anomaly && anomaly.isAnomaly && anomaly.severity === 'critique') {
            rec = { mode: 'ALERTE CRITIQUE', color: 'red', icon: '🚨',
                    reason: `Pic anormal détecté ! (Z=${anomaly.zScore}) — Isoler charge immédiatement.`, priority: 10 };
        } else if (soc < 20) {
            rec = { mode: 'SNEL FORCÉ', color: 'red', icon: '🔌',
                    reason: `SOC critique (${soc.toFixed(0)}%) — Passage obligatoire sur réseau SNEL.`, priority: 9 };
        } else if (voltage < 210 && voltage > 0) {
            rec = { mode: 'BATTERIE PRIORITAIRE', color: 'orange', icon: '🔋',
                    reason: `Tension réseau instable (${voltage.toFixed(0)}V < 210V) — Décharge batterie recommandée.`, priority: 8 };
        } else if (pred && pred.forecast[0] > 3000 && soc > 50) {
            rec = { mode: 'HYBRIDE PRÉVENTIF', color: 'orange', icon: '⚡',
                    reason: `Pic prédit à ${pred.forecast[0].toFixed(0)}W — Pré-activation batterie conseillée.`, priority: 7 };
        } else if (trend === 'hausse' && power > 2000) {
            rec = { mode: 'HYBRIDE ADAPTATIF', color: 'cyan', icon: '📈',
                    reason: `Tendance à la hausse détectée — Mode mixte déclenché en anticipation.`, priority: 6 };
        } else if (soc > 85 && power < 1000) {
            rec = { mode: 'CHARGE OPTIMALE', color: 'green', icon: '✅',
                    reason: `Conditions idéales — Batterie chargée, consommation faible.`, priority: 3 };
        } else {
            rec = { mode: 'AUTO IA', color: 'green', icon: '🤖',
                    reason: `Régime nominal — L'hyperviseur gère la commutation automatiquement.`, priority: 1 };
        }

        rec.trend = trend;
        this.lastRecommendation = rec;
        return rec;
    }

    // ──────────────────────────────────────────────
    // 8. POINT D'ENTRÉE PRINCIPAL (appelé depuis app.js)
    // ──────────────────────────────────────────────

    async processDataPoint(data) {
        const { power, voltage, soc } = data;

        // Mise à jour des statistiques (Welford)
        this._updateStats('power',   power);
        this._updateStats('voltage', voltage || 225);
        this._updateStats('soc',     soc || 70);

        // Ajout au buffer
        this.powerBuffer.push(power);
        this.voltageBuffer.push(voltage || 225);
        this.socBuffer.push(soc || 70);

        this.totalSamplesAdded++;
        this.samplesSinceRetrain++;

        // Limite les buffers
        if (this.powerBuffer.length   > this.MAX_BUFFER) this.powerBuffer.shift();
        if (this.voltageBuffer.length > this.MAX_BUFFER) this.voltageBuffer.shift();
        if (this.socBuffer.length     > this.MAX_BUFFER) this.socBuffer.shift();

        // Anomalie (immédiat, dès 5 points)
        if (this.totalSamplesAdded > 5) {
            this._detectAnomaly(power);
        }

        // Entraînement (asynchrone)
        if (this.samplesSinceRetrain >= this.RETRAIN_EVERY &&
            this.powerBuffer.length >= this.MIN_TRAIN_SAMPLES) {
            this._train(); // non-bloquant
        }

        // Prédiction
        this._predict();

        // Recommandation
        this._computeRecommendation(data);

        // Notifier l'UI
        if (this.onUpdate) {
            this.onUpdate({
                prediction:     this.lastPrediction,
                anomaly:        this.lastAnomaly,
                recommendation: this.lastRecommendation,
                status:         this.getStatus(),
            });
        }
    }

    // ──────────────────────────────────────────────
    // 9. STATUT D'EXPOSÉ POUR L'UI
    // ──────────────────────────────────────────────

    getStatus() {
        const progress = Math.min(100, (this.totalSamplesAdded / this.MIN_TRAIN_SAMPLES) * 100);
        return {
            totalSamples:   this.totalSamplesAdded,
            trainingCycles: this.trainingCycles,
            isModelReady:   this.isModelReady,
            isTraining:     this.isTraining,
            loss:           this.lastTrainLoss,
            progress:       progress.toFixed(0),
            bufferSize:     this.powerBuffer.length,
        };
    }

    // Réinitialiser les poids du modèle
    reset() {
        tf.disposeVariables();
        this.powerBuffer   = [];
        this.voltageBuffer = [];
        this.socBuffer     = [];
        this.trainingCycles    = 0;
        this.totalSamplesAdded = 0;
        this.isModelReady  = false;
        this.lastPrediction    = null;
        this.lastAnomaly       = null;
        this.lastRecommendation = null;
        this._initModel();
        console.log('[AdaptronML] Modèle réinitialisé.');
    }
}

// Exporter en tant que singleton global
window.AdaptronML = new AdaptronMLEngine();
console.log('[AdaptronML] Moteur IA Adaptron V5 chargé. TF.js :', tf.version.tfjs);
