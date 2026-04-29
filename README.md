# ⚡ ADAPTRON V5 - Système Intelligent de Gestion d'Énergie

![ADAPTRON Banner](https://img.shields.io/badge/Status-Active-success?style=for-the-badge) ![Version](https://img.shields.io/badge/Version-5.0-blue?style=for-the-badge) ![ESP32](https://img.shields.io/badge/Hardware-ESP32-orange?style=for-the-badge) ![Flutter](https://img.shields.io/badge/Mobile-Flutter-02569B?style=for-the-badge&logo=flutter)

**ADAPTRON V5** est un système hybride avancé de gestion et d'optimisation de l'énergie. Il combine le matériel IoT (ESP32), une intelligence artificielle prédictive (TensorFlow.js) et des interfaces multiplateformes (Dashboard Web local et Application Mobile Flutter) pour assurer une distribution énergétique optimale, autonome et sécurisée.

## ✨ Fonctionnalités Principales

- 🔋 **Gestion Multiligne Hybride** : Basculement intelligent et automatique entre le réseau public (SNEL), les panneaux solaires et le système de batteries en fonction des besoins et de la disponibilité.
- 🧠 **Machine Learning & Prédiction** : Intégration de TensorFlow.js pour prévoir la consommation future, ajuster les relais en temps réel, et détecter des anomalies (surcharges, chutes de tension).
- 💻 **Dashboard Web Embarqué (ADAPTRON CORE)** : Une interface web moderne et réactive (HTML/CSS/JS) directement stockée dans la mémoire PROGMEM de l'ESP32. Ce dashboard permet d'analyser, de configurer et de surveiller le système en temps réel.
- 📱 **Application Mobile Flutter** : Contrôle complet à distance pour les utilisateurs, avec alertes, suivi en temps réel de la consommation (courants, tensions, puissance) et des états des relais.
- ⚙️ **Hardware Design & CAO** : Fichiers SolidWorks (.SLDPRT) intégrés, décrivant la mécanique et le boîtier de protection du système ADAPTRON.

## 📂 Structure du Dépôt

- 📁 **`ADAPTRON CORE/`** : Les fichiers du dashboard principal (Analyse, Configuration, Surveillance en temps réel). C'est le cœur de l'interface utilisateur.
- 📁 **`esp32_adaptron/`** : Le code source C++ (Firmware Arduino/ESP32) gérant les capteurs, les relais, et le serveur web embarqué.
- 📁 **`AdaptronApp_Flutter/`** : Code source complet de l'application mobile compagnon développée avec le framework Flutter.
- 📁 **`ADAPTRON/`** : Documentation complète, PDFs conceptuels, et spécifications des versions précédentes (V1 à V4).
- 📁 **`Nouveau dossier/`** : Captures d'écran et illustrations du système en action.
- 📄 **`*.SLDPRT`** : Pièces et modèles 3D SolidWorks de l'infrastructure physique.

## 🚀 Démarrage Rapide

1. **Firmware ESP32** : Ouvrez `esp32_adaptron/esp32_adaptron.ino` dans l'IDE Arduino. Téléversez-le sur votre carte ESP32 après avoir installé les bibliothèques nécessaires.
2. **Dashboard Local** : Connectez-vous au réseau Wi-Fi de l'ESP32 ou entrez son adresse IP sur votre réseau local pour accéder au dashboard principal.
3. **Application Flutter** : Allez dans le dossier `AdaptronApp_Flutter`, exécutez `flutter pub get` puis `flutter run` pour lancer l'application sur un émulateur ou votre appareil physique.

---
*Projet développé pour optimiser la consommation énergétique et automatiser la transition intelligente entre de multiples sources d'alimentation.*
