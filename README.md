# EFA EDO - Marketplace des Artisans Africains

> **« Trouve un artisan pro près de toi en 30 secondes »**  
> Une initiative technologique par **EFA TECHNOLOGIE**  
> *EDO* = Travail

---

## 🌍 Présentation

**EFA EDO** est une marketplace inclusive conçue pour connecter instantanément les artisans professionnels et les clients à travers toute l'Afrique.

L'application est pensée pour être utilisable par tous, y compris les personnes qui ne savent ni lire ni écrire, grâce à une interface visuelle, de grands boutons tactiles, des icônes explicites et une assistance vocale complète.

---

## ✨ Fonctionnalités Principales

1. **Onboarding Ultra-Rapide (30 secondes)** :
   - Choix du profil en 1 clic : *Je CHERCHE un artisan* (Client) ou *Je SUIS artisan* (Pro).
   - Connexion rapide via numéro WhatsApp et vérification par code de confirmation.
   - Sélection du métier en grille visuelle parmi les métiers artisanaux africains + option « Autre » pour métier personnalisé.
   - Détection GPS automatique de l'atelier ou du domicile.

2. **Géolocalisation Universelle Afrique (Zéro liste figée de quartiers)** :
   - Détection de position GPS de l'appareil (`navigator.geolocation`).
   - Calcul de distance en temps réel par formule de Haversine (`lat`/`lng`).
   - Classement automatique des artisans : du plus proche au plus éloigné avec badge de distance (`📍 à 0.8km`).
   - Filtrage par rayon kilométrique (1 km, 3 km, 5 km, 10 km).

3. **Recherche & Commande Vocale** :
   - Recherche textuelle et vocale (*« Dis ce que tu cherches... »*).
   - Synthèse vocale intégrée pour lire les fiches artisans et les instructions à voix haute.
   - Guide vocal audio pour expliquer le fonctionnement de l'application.

4. **Fiche Profil & Contact Direct** :
   - Statut en ligne en temps réel (Pastille verte pulsante).
   - Deux grands boutons d'action rapide (50% de l'écran chacun) :
     - **Appeler directement** (`tel:...`)
     - **Écrire sur WhatsApp** (`https://wa.me/...`)
   - Galerie photos des réalisations (portfolio).
   - Note moyenne 1 à 5 étoiles et avis clients vérifiés.
   - Carte GPS de l'artisan et calcul d'itinéraire direct sur Google Maps.

5. **Espace Artisan (Mode Travail)** :
   - Gros bouton central tactile : **JE SUIS DISPONIBLE** (vert) / **JE SUIS OCCUPÉ** (rouge).
   - Statistiques journalières (Vues de profil, Appels reçus).
   - Simulateur d'appels clients entrants.
   - Abonnement EDO PRO (Monétisation via Mobile Money : TMoney & Flooz).

6. **Administration des Métiers Personnalisés** :
   - Gestion des métiers soumis par les artisans via le champ « Autre » pour enrichir la liste officielle.

---

## 🛠️ Stack Technique

- **Frontend** : React 19 + TypeScript + Vite
- **Styling** : Tailwind CSS v4 + Lucide Icons + Motion
- **Cartographie** : Leaflet + OpenStreetMap + calculs géodésiques Haversine
- **Audio & Voix** : Web Speech API (SpeechSynthesis & SpeechRecognition) + Web Audio API (effets sonores personnalisés)
- **Persistance** : LocalStorage & architecture prête pour synchronisation cloud

---

## 🚀 Démarrage local

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement (port 3000)
npm run dev

# Build de production
npm run build
```

---

© EFA TECHNOLOGIE — Tous droits réservés.
