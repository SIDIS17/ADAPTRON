#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <Preferences.h>

// --- CONFIGURATION RÉSEAU ---
const char* ssid_home = "helmholtz";
const char* password_home = "12345678";
const char* ssid_ap = "ADAPTRON_V5_STATION";
const char* password_ap = "password123";

IPAddress local_IP(192, 168, 1, 80);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(8, 8, 8, 8);

// --- BROCHES MATÉRIELLES ---
#define PIN_SSR 26
#define PIN_TRIAC 27
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17

// --- CONSTANTES PWM ---
#define PWM_FREQ 10000
#define PWM_RESOLUTION 8
#define PWM_CHANNEL 0
#define MAX_POWER 5000

// --- OBJETS GLOBAUX ---
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
WebServer server(80);
Preferences preferences;

// --- VARIABLES D'ÉTAT ---
bool ssrStatus = false;
float batterySOC = 85.0;
bool pzemConnected = false;
const unsigned long PZEM_INTERVAL = 1000;

struct Settings {
  uint16_t powerThreshold = 3000;
  uint8_t triacLimit = 200;
  bool mlMode = true;
  char targetServer[32] = "192.168.1.100";
} settings;

volatile float currentVoltage = 0;
volatile float currentPower = 0;
volatile float currentFrequency = 0;
volatile float currentUpsPower = 0;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

// ==========================================
// INTERFACE WEB AVEC FOND BLANC ET DESIGN COHÉRENT
// ==========================================
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ADAPTRON V5 - Energy Manager</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: #FFFFFF;
            color: #1a1a1a;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        /* En-tête */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 0;
            border-bottom: 2px solid #e0e0e0;
            margin-bottom: 30px;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #0066CC, #00A3FF);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0, 102, 204, 0.2);
        }

        .logo-text {
            font-size: 28px;
            font-weight: 800;
            color: #0066CC;
            letter-spacing: -0.5px;
        }

        .logo-text span {
            color: #FF6600;
            font-weight: 600;
            font-size: 18px;
            margin-left: 5px;
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f5f5f5;
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 500;
        }

        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #4CAF50;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Grille principale */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        /* Cartes */
        .card {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06);
            border: 1px solid #e8e8e8;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 102, 204, 0.08);
            border-color: #0066CC;
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .card-header h2 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            letter-spacing: -0.3px;
        }

        .card-header .icon {
            font-size: 24px;
        }

        /* Indicateurs */
        .metric-grid {
            display: grid;
            gap: 20px;
        }

        .metric-item {
            display: flex;
            flex-direction: column;
        }

        .metric-label {
            font-size: 13px;
            font-weight: 500;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .metric-value {
            font-size: 36px;
            font-weight: 700;
            color: #1a1a1a;
            line-height: 1.2;
        }

        .metric-unit {
            font-size: 16px;
            font-weight: 400;
            color: #888;
            margin-left: 4px;
        }

        .metric-value.highlight {
            color: #0066CC;
        }

        .metric-value.warning {
            color: #FF6600;
        }

        /* Batterie */
        .battery-container {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }

        .battery-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .battery-bar {
            width: 100%;
            height: 12px;
            background: #e0e0e0;
            border-radius: 20px;
            overflow: hidden;
            margin: 15px 0;
        }

        .battery-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF6600, #FF9900);
            border-radius: 20px;
            transition: width 0.5s ease;
            box-shadow: 0 0 12px rgba(255, 102, 0, 0.3);
        }

        .battery-stats {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #666;
        }

        /* Statut PZEM */
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            border-radius: 10px;
            background: #f8f9fa;
        }

        .status-indicator.connected {
            background: #e8f5e9;
            color: #2e7d32;
        }

        .status-indicator.disconnected {
            background: #ffebee;
            color: #c62828;
        }

        /* Boutons */
        .button-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 20px;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
            min-width: 120px;
        }

        .btn-primary {
            background: #0066CC;
            color: white;
            box-shadow: 0 2px 8px rgba(0, 102, 204, 0.2);
        }

        .btn-primary:hover {
            background: #0052a3;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
        }

        .btn-warning {
            background: #FF6600;
            color: white;
            box-shadow: 0 2px 8px rgba(255, 102, 0, 0.2);
        }

        .btn-warning:hover {
            background: #e55a00;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
        }

        .btn-secondary {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ddd;
        }

        .btn-secondary:hover {
            background: #e8e8e8;
        }

        /* Configuration */
        .config-form {
            margin-top: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #555;
            margin-bottom: 8px;
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #ddd;
            border-radius: 10px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            transition: border-color 0.2s;
            background: white;
        }

        .form-control:focus {
            outline: none;
            border-color: #0066CC;
            box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        /* Mode actuel */
        .mode-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        .mode-snel {
            background: #e3f2fd;
            color: #0066CC;
        }

        .mode-battery {
            background: #fff3e0;
            color: #FF6600;
        }

        /* Responsive */
        @media (max-width: 768px) {
            body {
                padding: 12px;
            }

            .header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }

            .metric-value {
                font-size: 28px;
            }

            .button-group {
                flex-direction: column;
            }

            .btn {
                width: 100%;
            }
        }

        /* Graphique placeholder */
        .chart-placeholder {
            width: 100%;
            height: 200px;
            background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 14px;
            border: 1px dashed #ddd;
            margin-top: 20px;
        }

        /* Info ligne */
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            color: #666;
            font-size: 14px;
        }

        .info-value {
            font-weight: 600;
            color: #1a1a1a;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo">
                <div class="logo-icon">A5</div>
                <div class="logo-text">ADAPTRON<span>V5</span></div>
            </div>
            <div class="status-badge">
                <span class="status-dot"></span>
                <span>Système Opérationnel</span>
            </div>
        </div>

        <!-- Dashboard -->
        <div class="dashboard-grid">
            <!-- Carte Réseau -->
            <div class="card">
                <div class="card-header">
                    <h2>Réseau SNEL</h2>
                    <span class="icon">⚡</span>
                </div>
                <div class="metric-grid">
                    <div class="metric-item">
                        <span class="metric-label">Tension</span>
                        <div class="metric-value"><span id="voltage">--</span><span class="metric-unit">V</span></div>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Fréquence</span>
                        <div class="metric-value"><span id="frequency">--</span><span class="metric-unit">Hz</span></div>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Puissance Active</span>
                        <div class="metric-value highlight"><span id="power">--</span><span class="metric-unit">W</span></div>
                    </div>
                </div>
                <div class="status-indicator" id="pzemStatus">
                    <span id="pzemIcon">🔌</span>
                    <span id="pzemText">Vérification...</span>
                </div>
            </div>

            <!-- Carte Batterie -->
            <div class="card">
                <div class="card-header">
                    <h2>Power Station</h2>
                    <span class="icon">🔋</span>
                </div>
                <div class="battery-container">
                    <div class="battery-header">
                        <span>Niveau de charge</span>
                        <span id="socValue" style="font-weight: 700;">--%</span>
                    </div>
                    <div class="battery-bar">
                        <div class="battery-fill" id="batteryFill" style="width: 85%"></div>
                    </div>
                    <div class="battery-stats">
                        <span>Autonomie estimée</span>
                        <span id="autonomy">~4.2h</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-label">Mode actuel</span>
                    <span class="info-value"><span id="modeBadge" class="mode-badge mode-snel">🔌 Secteur</span></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Puissance secourue</span>
                    <span class="info-value"><span id="upsPower">--</span> W</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Régulation TRIAC</span>
                    <span class="info-value"><span id="triacValue">255</span>/255</span>
                </div>
            </div>
        </div>

        <!-- Carte Commandes -->
        <div class="card">
            <div class="card-header">
                <h2>Commandes Rapides</h2>
                <span class="icon">🎮</span>
            </div>
            <div class="button-group">
                <button class="btn btn-primary" onclick="toggleSSR()">
                    🔄 Basculer SSR
                </button>
                <button class="btn btn-secondary" onclick="forceSNEL()">
                    🔌 Forcer Secteur
                </button>
                <button class="btn btn-warning" onclick="forceUPS()">
                    🔋 Forcer Batterie
                </button>
            </div>
        </div>

        <!-- Carte Configuration -->
        <div class="card">
            <div class="card-header">
                <h2>Configuration Système</h2>
                <span class="icon">⚙️</span>
            </div>
            <div class="config-form">
                <div class="form-group">
                    <label>Seuil de puissance (W)</label>
                    <input type="number" id="threshold" class="form-control" value="3000" min="500" max="5000" step="100">
                </div>
                <div class="form-group">
                    <label>Limitation TRIAC (0-255)</label>
                    <input type="range" id="triacLimit" class="form-control" min="0" max="255" value="200" style="padding: 0;">
                    <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                        <span style="font-size: 12px; color: #666;">Économie max</span>
                        <span style="font-size: 12px; color: #666;">Puissance max</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="saveConfig()" style="width: 100%;">
                    💾 Sauvegarder la Configuration
                </button>
            </div>
        </div>

        <!-- Graphique (placeholder) -->
        <div class="card">
            <div class="card-header">
                <h2>Historique de Consommation</h2>
                <span class="icon">📊</span>
            </div>
            <div class="chart-placeholder">
                📈 Graphique disponible sur l'application mobile
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            ADAPTRON V5 © 2024 - Tous droits réservés | Connecté à helmholtz
        </div>
    </div>

    <script>
        // Variables globales
        let currentMode = 'SNEL';
        let currentSOC = 85.0;

        // Mise à jour automatique des données
        function updateData() {
            fetch('/api/data')
                .then(response => response.json())
                .then(data => {
                    // Mise à jour des valeurs
                    document.getElementById('voltage').textContent = data.voltage.toFixed(1);
                    document.getElementById('frequency').textContent = data.freq.toFixed(1);
                    document.getElementById('power').textContent = data.power.toFixed(0);
                    document.getElementById('socValue').textContent = data.soc.toFixed(1) + '%';
                    document.getElementById('batteryFill').style.width = data.soc + '%';
                    document.getElementById('upsPower').textContent = data.upsPower.toFixed(0);
                    document.getElementById('triacValue').textContent = data.triacValue || 255;
                    
                    // Statut PZEM
                    const pzemStatus = document.getElementById('pzemStatus');
                    const pzemIcon = document.getElementById('pzemIcon');
                    const pzemText = document.getElementById('pzemText');
                    
                    if (data.pzemConnected) {
                        pzemStatus.className = 'status-indicator connected';
                        pzemIcon.textContent = '✅';
                        pzemText.textContent = 'PZEM-004T Connecté';
                    } else {
                        pzemStatus.className = 'status-indicator disconnected';
                        pzemIcon.textContent = '❌';
                        pzemText.textContent = 'PZEM-004T Déconnecté';
                    }
                    
                    // Mode actuel
                    const modeBadge = document.getElementById('modeBadge');
                    if (data.ssrStatus) {
                        modeBadge.className = 'mode-badge mode-battery';
                        modeBadge.textContent = '🔋 Batterie';
                        currentMode = 'BATTERY';
                    } else {
                        modeBadge.className = 'mode-badge mode-snel';
                        modeBadge.textContent = '🔌 Secteur';
                        currentMode = 'SNEL';
                    }
                    
                    // Autonomie estimée
                    const autonomy = (data.soc / 100 * 5).toFixed(1);
                    document.getElementById('autonomy').textContent = '~' + autonomy + 'h';
                    
                    // Mise à jour des valeurs de config
                    document.getElementById('threshold').value = data.threshold || 3000;
                    
                    currentSOC = data.soc;
                })
                .catch(error => {
                    console.error('Erreur API:', error);
                });
        }

        // Fonctions de commande
        function toggleSSR() {
            fetch('/api/toggle-ssr', { method: 'POST' })
                .then(response => response.text())
                .then(result => {
                    console.log('SSR toggled:', result);
                    updateData();
                });
        }

        function forceSNEL() {
            fetch('/api/cmd?action=force_snel', { method: 'POST' })
                .then(response => response.text())
                .then(result => {
                    console.log('Force SNEL:', result);
                    updateData();
                });
        }

        function forceUPS() {
            if (currentSOC < 20) {
                alert('⚠️ Batterie trop faible pour passer en mode UPS');
                return;
            }
            fetch('/api/cmd?action=force_ups', { method: 'POST' })
                .then(response => response.text())
                .then(result => {
                    console.log('Force UPS:', result);
                    updateData();
                });
        }

        function saveConfig() {
            const threshold = document.getElementById('threshold').value;
            const triacLimit = document.getElementById('triacLimit').value;
            
            fetch(`/api/cmd?action=set_threshold&value=${threshold}`, { method: 'POST' })
                .then(() => {
                    alert('✅ Configuration sauvegardée avec succès !');
                    updateData();
                })
                .catch(error => {
                    alert('❌ Erreur lors de la sauvegarde');
                });
        }

        // Synchronisation du slider TRIAC avec le seuil
        document.addEventListener('DOMContentLoaded', function() {
            const triacSlider = document.getElementById('triacLimit');
            triacSlider.addEventListener('input', function() {
                const percent = (this.value / 255 * 100).toFixed(0);
                this.title = `Limitation: ${percent}%`;
            });
        });

        // Démarrage des mises à jour
        updateData();
        setInterval(updateData, 2000);
    </script>
</body>
</html>
)rawliteral";

// --- FONCTIONS DE GESTION ---
void pzemTask(void *parameter) {
  for(;;) {
    float voltage = pzem.voltage();
    float power = pzem.power();
    float freq = pzem.frequency();
    
    portENTER_CRITICAL(&mux);
    if (!isnan(voltage) && !isnan(power)) {
      currentVoltage = voltage;
      currentPower = power;
      currentFrequency = freq;
      currentUpsPower = (ssrStatus) ? power * 0.8 : 0;
      pzemConnected = true;
    } else {
      pzemConnected = false;
    }
    portEXIT_CRITICAL(&mux);
    
    // Régulation TRIAC
    if (pzemConnected && power > settings.powerThreshold) {
      int triacValue = map(power, settings.powerThreshold, MAX_POWER, 255, settings.triacLimit);
      triacValue = constrain(triacValue, 0, 255);
      ledcWrite(PWM_CHANNEL, triacValue);
    } else {
      ledcWrite(PWM_CHANNEL, 255);
    }
    
    vTaskDelay(pdMS_TO_TICKS(PZEM_INTERVAL));
  }
}

void updateBatterySOC() {
  static unsigned long lastBatteryUpdate = 0;
  if (millis() - lastBatteryUpdate > 10000) {
    if (ssrStatus) {
      batterySOC -= 0.5;
      if (batterySOC < 15) {
        ssrStatus = false;
        digitalWrite(PIN_SSR, LOW);
      }
    } else {
      batterySOC += 0.2;
    }
    batterySOC = constrain(batterySOC, 10, 100);
    lastBatteryUpdate = millis();
  }
}

void loadSettings() {
  preferences.begin("adaptron", false);
  settings.powerThreshold = preferences.getUInt("threshold", 3000);
  settings.triacLimit = preferences.getUInt("triac", 200);
  settings.mlMode = preferences.getBool("mlmode", true);
  preferences.getString("target", settings.targetServer, 32);
  preferences.end();
}

void saveSettings() {
  preferences.begin("adaptron", false);
  preferences.putUInt("threshold", settings.powerThreshold);
  preferences.putUInt("triac", settings.triacLimit);
  preferences.putBool("mlmode", settings.mlMode);
  preferences.putString("target", settings.targetServer);
  preferences.end();
}

void setupRouting() {
  server.on("/", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "max-age=3600");
    server.send(200, "text/html", INDEX_HTML);
  });

  server.on("/api/data", HTTP_GET, []() {
    DynamicJsonDocument doc(512);
    
    portENTER_CRITICAL(&mux);
    float power = currentPower;
    float voltage = currentVoltage;
    float freq = currentFrequency;
    float upsPower = currentUpsPower;
    bool pzemOk = pzemConnected;
    portEXIT_CRITICAL(&mux);
    
    doc["power"] = power;
    doc["voltage"] = voltage;
    doc["freq"] = freq;
    doc["soc"] = batterySOC;
    doc["upsPower"] = upsPower;
    doc["ssrStatus"] = ssrStatus;
    doc["pzemConnected"] = pzemOk;
    doc["threshold"] = settings.powerThreshold;
    doc["triacValue"] = ledcRead(PWM_CHANNEL);
    
    String response;
    serializeJson(doc, response);
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", response);
  });

  server.on("/api/toggle-ssr", HTTP_POST, []() {
    ssrStatus = !ssrStatus;
    digitalWrite(PIN_SSR, ssrStatus ? HIGH : LOW);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", ssrStatus ? "BATTERY_ON" : "SNEL_ON");
  });

  server.on("/api/cmd", HTTP_POST, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    
    if (server.hasArg("action")) {
      String action = server.arg("action");
      
      if (action == "force_snel") {
        ssrStatus = false;
        digitalWrite(PIN_SSR, LOW);
        ledcWrite(PWM_CHANNEL, 255);
      } 
      else if (action == "force_ups") {
        if (batterySOC > 20) {
          ssrStatus = true;
          digitalWrite(PIN_SSR, HIGH);
        } else {
          server.send(400, "text/plain", "BATTERY_TOO_LOW");
          return;
        }
      }
      else if (action == "set_threshold") {
        if (server.hasArg("value")) {
          settings.powerThreshold = server.arg("value").toInt();
          saveSettings();
        }
      }
      
      server.send(200, "text/plain", "OK:" + action);
    } else {
      server.send(400, "text/plain", "MISSING_ACTION");
    }
  });
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n🚀 ADAPTRON V5 - Démarrage...");
  
  pinMode(PIN_SSR, OUTPUT);
  digitalWrite(PIN_SSR, LOW);
  
  ledcAttach(PIN_TRIAC, PWM_FREQ, PWM_RESOLUTION);
  ledcWrite(PIN_TRIAC, 255);
  
  loadSettings();
  
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(ssid_ap, password_ap);
  
  Serial.printf("📡 Connexion à %s ...\n", ssid_home);
  WiFi.begin(ssid_home, password_home);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Connecté à helmholtz !");
    Serial.print("📟 IP locale: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n⚠️ Mode Point d'Accès uniquement");
  }
  
  Serial.print("📱 IP App: ");
  Serial.println(WiFi.softAPIP());
  
  xTaskCreatePinnedToCore(pzemTask, "PZEM_Task", 4096, NULL, 1, NULL, 0);
  
  setupRouting();
  server.begin();
  
  Serial.println("🌐 Serveur Web démarré");
  Serial.println("✅ Système prêt !\n");
}

void loop() {
  server.handleClient();
  updateBatterySOC();
  
  static unsigned long lastReport = 0;
  if (millis() - lastReport > 5000) {
    portENTER_CRITICAL(&mux);
    float power = currentPower;
    bool pzemOk = pzemConnected;
    portEXIT_CRITICAL(&mux);
    
    if (pzemOk) {
      Serial.printf("📊 PZEM: %.0fW | SOC: %.1f%% | SSR: %s\n", 
                   power, batterySOC, ssrStatus ? "ON" : "OFF");
    }
    lastReport = millis();
  }
  
  delay(10);
}