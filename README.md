# BigQuery Release Notes Hub 🚀

A sleek, responsive, and modern dashboard to monitor, search, and share Google Cloud BigQuery release notes. Built using a lightweight Python Flask backend and an interactive, glassmorphism-themed frontend using vanilla HTML, CSS, and JavaScript.

## 🌟 Features

- **Granular Update Separation**: Parses Google's day-level updates and groups them into individual sub-updates (Features, Bug Fixes, Notices, and Deprecations) so you can interact with them independently.
- **Smart X (Twitter) Share Intent**: Allows you to select any specific release note and share it to X. Features a custom Tweet composer modal with a simulated dark-mode Twitter post mockup, automatic text truncation, and a live circle-progress character counter (280-character limit).
- **Real-Time Search & Filtering**: Instantly search release descriptions, dates, or types, or filter updates by category (e.g. Features only, Bug Fixes only) with a single click.
- **Dashboard Stats Panel**: A quick-glance panel indicating the total number of synchronized items, features, bug fixes, and other alerts.
- **Performant Caching**: Utilizes server-side caching (5-minute TTL) to avoid hitting Google feed servers repeatedly, with a manual force-refresh action.
- **Aesthetic Dark Theme**: Designed with custom CSS variables, layout transitions, animated background glow orbs, and skeleton loader shimmers for a premium UI experience.

---

## 🛠️ Technology Stack

- **Backend**:
  - Python 3.13
  - Flask (Web Framework)
  - requests (HTTP Requests)
  - BeautifulSoup4 (HTML Parsing and Link Decoration)
- **Frontend**:
  - Semantic HTML5
  - Vanilla CSS3 (Custom grid layouts, custom scrollbars, backdrop filters, animations)
  - JavaScript (ES6+ for state management, API integration, and modal customizer)
  - Inline SVGs (No external image requests or icons needed)

---

## 📁 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask application & Feed parsing logic
├── requirements.txt        # Python dependencies
├── .gitignore              # Files ignored by git
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Main HTML Dashboard and Tweet composer layout
└── static/
    ├── css/
    │   └── styles.css      # Custom dark-theme & glassmorphism layout
    └── js/
        └── app.js          # Main client-side routing, filtering, and modal code
```

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **Python 3** installed on your system.

### 2. Set Up Virtual Environment & Install Dependencies
Run these commands from the root directory of the project:

```bash
# Initialize Python virtual environment
python3 -m venv .venv

# Activate virtual environment and install packages
.venv/bin/pip install -r requirements.txt
```

### 3. Run the Server
Launch the Flask development server:

```bash
.venv/bin/python app.py
```

The server will start locally. Open your browser and navigate to:
👉 **[http://localhost:5001](http://localhost:5001)**

---

## 🔗 Deployment

This codebase is ready to be committed and deployed. It is connected to the GitHub repository:
[jay-webster/antigravity-event-talks-app](https://github.com/jay-webster/antigravity-event-talks-app)
