from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import joblib
import requests
import os
import pandas as pd
import io
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv

# Load .env file for local development
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", ".env"))
print(f"--- STARTUP LOG ---")
print(f"Looking for .env at: {ENV_PATH}")
if os.path.exists(ENV_PATH):
    print(".env file exists")
    load_dotenv(ENV_PATH)
else:
    print(".env file NOT FOUND")

app = FastAPI(title="Movie Success Predictor API")

# Google Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
print(f"GOOGLE_CLIENT_ID Loaded: '{GOOGLE_CLIENT_ID[:10]}...'")
print(f"--- END STARTUP LOG ---")

class AuthRequest(BaseModel):
    token: str

@app.post("/api/auth/google")
async def google_auth(request: AuthRequest):
    try:
        # Verify Google ID Token
        target_audience = GOOGLE_CLIENT_ID or os.getenv("GOOGLE_CLIENT_ID", "")
        # Forced fallback for local reliability
        if not target_audience or target_audience == "":
            target_audience = "980250266647-6e5i3e7r1km3jkg1fvokuivhromsdvs0.apps.googleusercontent.com"
             
        print(f"Verifying token for audience: '{target_audience}'")

        id_info = id_token.verify_oauth2_token(
            request.token, 
            google_requests.Request(), 
            audience=target_audience
        )

        user_email = id_info.get("email")
        user_name = id_info.get("name")
        user_picture = id_info.get("picture")


        return {
            "email": user_email,
            "name": user_name,
            "picture": user_picture
        }
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ML assets and logic follow...

# Paths to ML assets
# Vercel treats the root of the project as the base for file access in serverless functions
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "../backend/models/movie_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "../backend/models/vectorizer.pkl")

# Load ML model and vectorizer
try:
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
except Exception as e:
    print(f"Error loading models: {e}. Path used: {MODEL_PATH}")

# OMDb API Key
OMDB_API_KEY = "21ba351d"

class ReviewRequest(BaseModel):
    text: str

@app.post("/api/predict")
async def predict_sentiment(request: ReviewRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Review text cannot be empty.")
    
    try:
        vec = vectorizer.transform([request.text])
        prob = model.predict_proba(vec)[0][1] 
        sentiment = "Positive" if prob > 0.5 else "Negative"
        
        feature_names = vectorizer.get_feature_names_out()
        coefs = model.coef_[0]
        feature_indices = vec.indices
        word_impacts = []
        
        for idx in feature_indices:
            word = feature_names[idx]
            weight = coefs[idx]
            word_impacts.append({
                "word": word,
                "weight": round(float(weight), 4)
            })
            
        word_impacts = sorted(word_impacts, key=lambda x: abs(x['weight']), reverse=True)[:8]
        
        return {
            "sentiment": sentiment,
            "confidence": round(float(prob * 100), 2),
            "probability_score": float(prob),
            "word_impacts": word_impacts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model_stats")
def get_model_stats():
    try:
        feature_names = vectorizer.get_feature_names_out()
        coefs = model.coef_[0]
        pairs = list(zip(feature_names, coefs))
        
        top_positive = sorted(pairs, key=lambda x: x[1], reverse=True)[:10]
        top_positive = [{"word": p[0], "weight": round(float(p[1]), 4)} for p in top_positive]
        
        top_negative = sorted(pairs, key=lambda x: x[1])[:10]
        top_negative = [{"word": p[0], "weight": round(float(p[1]), 4)} for p in top_negative]
        
        return {
            "top_positive": top_positive,
            "top_negative": top_negative,
            "training_dist": {"Positive": 25000, "Negative": 25000}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch_predict")
async def batch_predict(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        review_col = next((col for col in df.columns if col.lower() == 'review'), None)
        
        if not review_col:
             raise HTTPException(status_code=400, detail="CSV must contain a column named 'review'")
             
        reviews_list = df[review_col].astype(str).tolist()
        vec_batch = vectorizer.transform(reviews_list)
        probs_batch = model.predict_proba(vec_batch)[:, 1]
        
        df['Probability_Score'] = probs_batch
        df['Sentiment_Prediction'] = ['Positive' if p > 0.5 else 'Negative' for p in probs_batch]
        df['Confidence_Percent'] = (probs_batch * 100).round(2).astype(str) + '%'
        
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

@app.get("/api/movie/{title}")
async def get_movie_details(title: str):
    try:
        if not title.strip():
            raise HTTPException(status_code=400, detail="Movie title cannot be empty.")
            
        url = f"http://www.omdbapi.com/?t={title}&apikey={OMDB_API_KEY}"
        response = requests.get(url)
        
        if response.status_code != 200:
             print(f"OMDb Error for {title}: {response.status_code} - {response.text}")
             raise HTTPException(status_code=500, detail="Error fetching data from OMDb API")
             
        data = response.json()
        if data.get("Response") == "False":
            print(f"OMDb Movie Not Found for {title}: {data.get('Error')}")
            raise HTTPException(status_code=404, detail=f"Movie not found: {data.get('Error')}")
            
        return data
    except Exception as e:
        import traceback
        print(f"GET_MOVIE_ERROR for {title}:")
        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

# Serve static files LAST so it doesn't shadow other routes
if os.getenv("VERCEL") is None:
    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Mount at the end to avoid shadowing /api routes
    app.mount("/", StaticFiles(directory=os.path.join(BASE_DIR, ".."), html=True), name="static")
