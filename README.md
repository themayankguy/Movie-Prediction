# 🎬 MMDB: Movie Success Predictor (Explainable AI)

An advanced, cinematic Machine Learning web application (inspired by IMDb) that predicts the sentiment and potential success of movies based on user reviews. Built with a high-performance **FastAPI** backend and a custom **Vanilla JS/CSS** frontend featuring **Explainable AI (XAI)** visualizations.

---

## 🚀 Key Features

### 🎞️ Cinematic discovery
- **IMDb-Style UI**: A premium dark-mode interface designed for a professional movie database experience.
- **Trending Movies**: Automatically loads 100 iconic movies with real-time data from the OMDb API.
- **Genre Filtering**: Instant, interactive filtering (Action, Horror, Sci-Fi, etc.) to browse specific categories.
- **Interactive Search**: Search any movie in the world to pull plot summaries, ratings, and cast details.

### 🧠 Explainable Machine Learning
- **Sentiment Predictor**: Logistic Regression model trained on 50,000 IMDb reviews to predict sentiment.
- **Word Impact Search**: A horizontal bar chart visualizing exactly which words in your review influenced the AI's decision (Positive vs. Negative coefficients).
- **Probability Breakdown**: A doughnut chart displaying the confidence split of the model's prediction.
- **Global Model Insights**: A dedicated dashboard showing the top 10 most impactful "Positive" and "Negative" words learned by the model globally.

### 🛠️ Advanced Tools
- **YouTube Trailer Integration**: Automatically finds and embeds official trailers for movies.
- **Batch CSV Analysis**: Upload a `.csv` file to analyze hundreds of reviews at once and download the results.

---

## 🧠 Technologies Used

### **Backend**
- **FastAPI**: High-performance Python web framework.
- **Scikit-Learn**: Powering the NLP pipeline and Logistic Regression.
- **Joblib**: Efficient model serialization.
- **Pandas**: Used for handling batch CSV data processing.

### **Frontend**
- **Vanilla JavaScript & CSS3**: Custom-built UI without heavy frameworks for maximum speed.
- **Chart.js**: Interactive data visualizations for ML insights.
- **Font Awesome**: Professional iconography.
- **OMDb API**: Real-time movie metadata integration.

---

## 📁 Project Structure

```text
Movie Success Predictor/
│
├── backend/
│   ├── main.py            # FastAPI Application & Endpoints
│   ├── models/            # Serialized ML Models (.pkl)
│   └── notebooks/         # Training & Cleaning Notebooks
│
├── frontend/
│   ├── index.html         # Main UI Structure
│   ├── style.css          # Premium Custom Styling
│   ├── script.js          # Logic & API Integrations
│   └── favicon.png        # Brand Icon
│
├── sample_reviews.csv     # For testing Batch Analysis
└── README.md
```

---

## ⚙️ How to Run the Project

### 1. Prerequisites
Ensure you have Python 3.8+ installed.

### 2. Install Dependencies
```bash
pip install fastapi uvicorn scikit-learn pandas joblib requests
```

### 3. Start the Application
Since the frontend is served statically by the backend, you only need to run the server:

```bash
# Navigate to the backend directory
cd backend

# Run the server
uvicorn main:app --reload
```

### 4. Open in Browser
Visit **[http://localhost:8000](http://localhost:8000)** to experience the app.

---

## 👤 Author
**Mayank Sawant**  
*Machine Learning Mini Project - Engineering Portfolio*

---
© 2026 MMDB Powered by ML & FastAPI
