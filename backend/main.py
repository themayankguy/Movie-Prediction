from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import joblib
import requests
import os
import pandas as pd
import io

app = FastAPI(title="Movie Success Predictor API")

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths to ML assets
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models/movie_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "models/vectorizer.pkl")

# Load ML model and vectorizer
try:
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
except Exception as e:
    print(f"Error loading models: {e}. Please ensure they exist in backend/models/")

# OMDb API Key
OMDB_API_KEY = "21ba351d"

class ReviewRequest(BaseModel):
    text: str

@app.post("/predict")
async def predict_sentiment(request: ReviewRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Review text cannot be empty.")
    
    # Vectorize and predict
    vec = vectorizer.transform([request.text])
    prob = model.predict_proba(vec)[0][1]
    
    sentiment = "Positive" if prob > 0.5 else "Negative"
    
    return {
        "sentiment": sentiment,
        "confidence": round(prob * 100, 2),
        "probability_score": float(prob)
    }

@app.post("/batch_predict")
async def batch_predict(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        # Read the uploaded CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # We assume the CSV has a column named 'review' (case-insensitive check)
        review_col = next((col for col in df.columns if col.lower() == 'review'), None)
        
        if not review_col:
             raise HTTPException(status_code=400, detail="CSV must contain a column named 'review'")
             
        # Process predictions in batch
        reviews_list = df[review_col].astype(str).tolist()
        vec_batch = vectorizer.transform(reviews_list)
        probs_batch = model.predict_proba(vec_batch)[:, 1] # Get probability of class 1 (Positive)
        
        # Append results back to DataFrame
        df['Probability_Score'] = probs_batch
        df['Sentiment_Prediction'] = ['Positive' if p > 0.5 else 'Negative' for p in probs_batch]
        df['Confidence_Percent'] = (probs_batch * 100).round(2).astype(str) + '%'
        
        # Convert df back to CSV
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response_bytes = stream.getvalue()
        
        return StreamingResponse(
            iter([response_bytes]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=analyzed_{file.filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/movie/{title}")
async def get_movie_details(title: str):
    if not title.strip():
        raise HTTPException(status_code=400, detail="Movie title cannot be empty.")
        
    url = f"http://www.omdbapi.com/?t={title}&apikey={OMDB_API_KEY}"
    response = requests.get(url)
    
    if response.status_code != 200:
         raise HTTPException(status_code=500, detail="Error fetching data from OMDb API")
         
    data = response.json()
    
    if data.get("Response") == "False":
        raise HTTPException(status_code=404, detail="Movie not found or API key invalid.")
        
    return data

# Serve the static frontend
app.mount("/", StaticFiles(directory=os.path.join(BASE_DIR, "../frontend"), html=True), name="frontend")
