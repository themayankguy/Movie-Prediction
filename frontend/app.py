import streamlit as st
import joblib
import requests
import os

# Define relative paths based on the new structure
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "../backend/models/movie_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "../backend/models/vectorizer.pkl")

# Load model
model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

st.set_page_config(page_title="🎬 Movie Predictor", layout="centered")

st.title("🎬 Movie Success Predictor")
st.write("Type a movie review and predict audience reaction.")

user_text = st.text_area("Enter movie review:", height=150)

if st.button("Predict 🎯"):
    if user_text.strip() == "":
        st.warning("Please enter some text.")
    else:
        vec = vectorizer.transform([user_text])
        prob = model.predict_proba(vec)[0][1]

        st.subheader("Prediction Result")
        st.progress(float(prob))
        st.write("Positive Confidence:", round(prob*100,2), "%")

        if prob > 0.5:
            st.success("🌟 Positive Impact")
        else:
            st.error("⚠️ Negative Impact")

#run app.py
