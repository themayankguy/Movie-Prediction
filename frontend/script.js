const API_BASE_URL = "http://localhost:8000";

// --- DOM Elements ---
const searchInput = document.getElementById("movieSearchInput");
const searchBtn = document.getElementById("searchBtn");
const searchLoader = document.getElementById("searchLoader");
const searchError = document.getElementById("searchError");

// Detail Card Elements
const movieCard = document.getElementById("movieDetailsCard");
const trendingSection = document.getElementById("trendingSection");
const trendingGrid = document.getElementById("trendingGrid");

const movieTitle = document.getElementById("movieTitle");
const movieYear = document.getElementById("movieYear");
const movieRatingAge = document.getElementById("movieRatingAge");
const movieRuntime = document.getElementById("movieRuntime");
const movieRating = document.getElementById("movieRating");
const moviePoster = document.getElementById("moviePoster");
const moviePlot = document.getElementById("moviePlot");
const movieDirector = document.getElementById("movieDirector");
const movieWriters = document.getElementById("movieWriters");
const movieStars = document.getElementById("movieStars");
const genreTags = document.getElementById("movieGenreTags");

// Predictor Elements
const reviewInput = document.getElementById("reviewInput");
const predictBtn = document.getElementById("predictBtn");
const resultContainer = document.getElementById("resultContainer");
const reviewSection = document.getElementById("reviewSection");

// --- Event Listeners ---

searchBtn.addEventListener("click", () => {
    const title = searchInput.value.trim();
    if (title) fetchMovieData(title);
});

searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const title = searchInput.value.trim();
        if (title) fetchMovieData(title);
    }
});

predictBtn.addEventListener("click", () => {
    const text = reviewInput.value.trim();
    if (text) predictSentiment(text);
});

// Load default movies on startup
document.addEventListener("DOMContentLoaded", loadTrendingMovies);

// --- API Calls & Logic ---

async function loadTrendingMovies() {
    trendingGrid.innerHTML = '<div class="loader"></div>';
    const defaultMovies = ["Inception", "The Dark Knight", "Oppenheimer", "Interstellar", "The Matrix", "Pulp Fiction"];

    try {
        const promises = defaultMovies.map(title =>
            fetch(`${API_BASE_URL}/movie/${encodeURIComponent(title)}`).then(res => res.json())
        );
        const movies = await Promise.all(promises);

        trendingGrid.innerHTML = "";

        movies.forEach(data => {
            if (data.Response === "True") {
                const card = document.createElement("div");
                card.className = "grid-item";

                const posterStr = data.Poster !== "N/A" ? data.Poster : "https://via.placeholder.com/300x450?text=No+Poster";

                card.innerHTML = `
                    <img class="grid-poster" src="${posterStr}" alt="${data.Title}">
                    <div class="grid-info">
                        <div class="grid-title" title="${data.Title}">${data.Title}</div>
                        <div class="grid-rating">
                            <i class="fa-solid fa-star"></i> ${data.imdbRating}
                        </div>
                    </div>
                `;

                card.addEventListener("click", () => {
                    searchInput.value = data.Title;
                    fetchMovieData(data.Title);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });

                trendingGrid.appendChild(card);
            }
        });

    } catch (e) {
        console.error("Failed to load trending movies", e);
        trendingGrid.innerHTML = "<p>Couldn't load popular movies right now.</p>";
    }
}

async function fetchMovieData(title) {
    searchLoader.classList.remove("hidden");
    searchError.classList.add("hidden");
    movieCard.classList.add("hidden");

    try {
        const response = await fetch(`${API_BASE_URL}/movie/${encodeURIComponent(title)}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to fetch movie data.");
        }

        const data = await response.json();

        // Populate IMDb-style header
        movieTitle.textContent = data.Title;
        movieYear.textContent = data.Year;
        movieRatingAge.textContent = data.Rated;
        movieRuntime.textContent = data.Runtime;
        movieRating.textContent = data.imdbRating;

        // Populate Media
        moviePoster.src = data.Poster !== "N/A" ? data.Poster : "https://via.placeholder.com/300x450?text=No+Poster";
        moviePlot.textContent = data.Plot;

        // Populate Credits
        movieDirector.textContent = data.Director;
        movieWriters.textContent = data.Writer;
        movieStars.textContent = data.Actors;

        // Populate Genre Tags
        genreTags.innerHTML = "";
        if (data.Genre && data.Genre !== "N/A") {
            const genres = data.Genre.split(', ');
            genres.forEach(g => {
                const span = document.createElement("span");
                span.className = "genre-tag";
                span.textContent = g;
                genreTags.appendChild(span);
            });
        }

        movieCard.classList.remove("hidden");
        reviewSection.classList.remove("hidden"); // Reveal review box
        trendingSection.classList.add("hidden"); // Hide the trending grid

    } catch (error) {
        searchError.textContent = error.message;
        searchError.classList.remove("hidden");
        reviewSection.classList.add("hidden"); // Hide on error
    } finally {
        searchLoader.classList.add("hidden");
    }
}

async function predictSentiment(text) {
    const ogHtml = predictBtn.innerHTML;
    predictBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
    predictBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) throw new Error("Failed to predict sentiment.");

        const data = await response.json();
        updateResultUI(data.sentiment, data.confidence);

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        predictBtn.innerHTML = ogHtml;
        predictBtn.disabled = false;
    }
}

function updateResultUI(sentiment, confidence) {
    resultContainer.className = "result-container"; // reset

    const label = document.getElementById("sentimentLabel");
    const icon = document.getElementById("sentimentIcon");
    const fill = document.getElementById("meterFill");

    document.getElementById("confidenceValue").textContent = `${confidence}%`;

    setTimeout(() => { fill.style.width = `${confidence}%`; }, 100);

    if (sentiment === "Positive") {
        resultContainer.classList.add("status-positive");
        label.textContent = "Positive (Recommended)";
        icon.className = "fa-solid fa-face-smile"; // Change star to smile for positive
    } else {
        resultContainer.classList.add("status-negative");
        label.textContent = "Negative (Not Recommended)";
        icon.className = "fa-solid fa-face-frown"; // Change star to frown for negative
    }

    resultContainer.classList.remove("hidden");
}
