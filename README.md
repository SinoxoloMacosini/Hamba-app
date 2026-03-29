# Hamba — The Community Accessibility Companion

**Hamba** (meaning "Go" or "Walk") is a professional, community-driven accessibility mapping application. It is designed to empower individuals with mobility challenges—such as wheelchair users, parents with strollers, and the elderly—by making the "invisible" barriers of our cities visible.

By combining real-time GPS tracking, a weighted safety scoring algorithm, and crowd-sourced hazard reporting, Hamba ensures that every journey is predictable, safe, and dignified.

---

## Key Features

### Intelligent Geocoding & Mapping
*   **Human-Readable Locations:** Powered by Google GenAI, Hamba converts raw GPS coordinates into specific place names (e.g., "UNISA Parow Campus") for better context.
*   **Interactive Map Picker:** Report hazards exactly where they are, even if you've already moved past them, using an intuitive drag-and-drop map interface.
*   **Location Search:** Quickly find specific buildings or intersections to view accessibility data or report new obstacles.

### Community Hazard Reporting
*   **One-Tap Reporting:** Instantly flag obstacles like broken ramps, steep inclines, steps, or blocked sidewalks.
*   **Local-First Architecture:** Reports are saved to your device immediately and synced to the cloud (JSONBin) in the background, ensuring the app works even on slow 3G connections.
*   **Offline Resilience:** Continue using the app in network "dead zones"; data automatically syncs once you regain connectivity.

### The Area Score Algorithm
*   **Live Safety Rating:** Hamba scans a 400-meter radius around your position and calculates a safety score from 0 to 100.
*   **Weighted Penalties:** Not all hazards are equal. The algorithm applies heavier penalties to critical barriers (like steps) compared to minor ones (like narrow paths).
*   **Visual Alerts:** A dynamic color-coded ring (Green/Amber/Red) provides a "weather forecast" for your immediate surroundings.

### Route Recording
*   **Digital Breadcrumbs:** Record your actual path as you move. Unlike standard GPS, this captures the *proven* safe route you took, pinging coordinates every 4 seconds.
*   **Verified Paths:** Share your recorded routes with the community so others can follow a path they know is accessible.

---

## Design Philosophy
*   **Professional Palette:** A clean, high-contrast three-color scheme (Blue, Slate, Red) designed for maximum legibility in direct sunlight.
*   **Light/Dark Mode:** Full support for system themes to assist users with light sensitivity and to preserve battery life.
*   **Clarity Over Clutter:** No emojis or AI-generated "slop." Every icon and button is purposeful and explained in the integrated **Information Modal**.

---

## Technical Stack
*   **Frontend:** React 18 (Vite) + TypeScript
*   **Styling:** Tailwind CSS
*   **Maps:** Leaflet & React-Leaflet
*   **AI/Geocoding:** @google/genai (Gemini 3.1 Flash)
*   **Storage/Sync:** JSONBin API + LocalStorage
*   **Icons:** Lucide React

---

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your API keys:
    ```env
    GEMINI_API_KEY=your_google_ai_key
    ```

### Running the App
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

---

## Security & Privacy
*   **Anonymous Reporting:** We track the hazard, not the person. No personal PII is required to contribute to the map.
*   **Data Integrity:** All community data is synced via a secure Master Key to JSONBin, ensuring a single source of truth for all users.

---

## Contributing
Hamba is a community project. If you are a developer or accessibility advocate, feel free to submit a PR or open an issue to help make our cities more accessible.

**Let's make the world move.**
