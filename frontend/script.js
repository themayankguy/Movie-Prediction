const API_BASE_URL = "http://localhost:8000";

// --- DOM Elements ---
const searchInput = document.getElementById("movieSearchInput");
const searchBtn = document.getElementById("searchBtn");
const searchLoader = document.getElementById("searchLoader");
const searchError = document.getElementById("searchError");
const navLogo = document.getElementById("navLogo");

// Detail Card Elements
const movieCard = document.getElementById("movieDetailsCard");
const backToMoviesBtn = document.getElementById("backToMoviesBtn");
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

// Sidebar Elements
const openSidebarBtn = document.getElementById("openSidebarBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebarMenu = document.getElementById("sidebarMenu");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const navToPredictor = document.getElementById("navToPredictor");
const navToTrending = document.getElementById("navToTrending");
const navToTopRated = document.getElementById("navToTopRated");
const navToCsvModal = document.getElementById("navToCsvModal");

// CSV Modal Elements
const csvModalOverlay = document.getElementById("csvModalOverlay");
const closeCsvModalBtn = document.getElementById("closeCsvModalBtn");
const csvFileInput = document.getElementById("csvFileInput");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const csvLoader = document.getElementById("csvLoader");
const csvError = document.getElementById("csvError");

// --- Global Data Cache ---
let globalMoviesList = [];

// --- Event Listeners ---

// Sidebar Toggle Logic
openSidebarBtn.addEventListener("click", () => {
    sidebarMenu.classList.add("active");
    sidebarOverlay.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
});

function closeSidebar() {
    sidebarMenu.classList.remove("active");
    sidebarOverlay.classList.remove("active");
    document.body.style.overflow = "auto";
}

closeSidebarBtn.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
navToPredictor.addEventListener("click", closeSidebar);

// Shuffle helper for trending
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

navToTrending.addEventListener("click", (e) => {
    e.preventDefault();
    closeSidebar();

    if (globalMoviesList.length > 0) {
        movieCard.classList.add("hidden");
        reviewSection.classList.add("hidden");
        trendingSection.classList.remove("hidden");

        document.querySelector("#trendingSection h3").innerHTML = '<span class="yellow-bar"></span> Trending Movies';

        // Render randomized cache
        const randomized = shuffleArray(globalMoviesList);
        renderMovieGrid(randomized);
    }
});

navToTopRated.addEventListener("click", (e) => {
    e.preventDefault();
    closeSidebar();

    // Sort global library by rating
    if (globalMoviesList.length > 0) {
        // Show trending section, hide details
        movieCard.classList.add("hidden");
        reviewSection.classList.add("hidden");
        trendingSection.classList.remove("hidden");

        // Change section title
        document.querySelector("#trendingSection h3").innerHTML = '<span class="yellow-bar"></span> Top Rated Movies';

        // Sort globally loaded movies
        const sortedMovies = [...globalMoviesList].sort((a, b) => {
            const ratingA = parseFloat(a.imdbRating) || 0;
            const ratingB = parseFloat(b.imdbRating) || 0;
            return ratingB - ratingA; // Descending
        });

        // Re-use the exact same grid rendering function
        renderMovieGrid(sortedMovies);
    }
});

// --- CSV Modal Logic ---
navToCsvModal.addEventListener("click", (e) => {
    e.preventDefault();
    closeSidebar();
    csvModalOverlay.classList.add("active");
});

closeCsvModalBtn.addEventListener("click", () => {
    csvModalOverlay.classList.remove("active");
    csvError.classList.add("hidden");
});

uploadCsvBtn.addEventListener("click", async () => {
    const file = csvFileInput.files[0];
    if (!file) {
        csvError.textContent = "Please select a .csv file first.";
        csvError.classList.remove("hidden");
        return;
    }

    csvError.classList.add("hidden");
    csvLoader.classList.remove("hidden");
    uploadCsvBtn.disabled = true;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE_URL}/batch_predict`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Error processing CSV.");
        }

        // Trigger file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `analyzed_${file.name}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        // Close modal on success
        csvModalOverlay.classList.remove("active");

    } catch (e) {
        csvError.textContent = e.message;
        csvError.classList.remove("hidden");
    } finally {
        csvLoader.classList.add("hidden");
        uploadCsvBtn.disabled = false;
        csvFileInput.value = ""; // Reset input
    }
});

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

// --- Backtracking Logic ---
function returnToHome() {
    movieCard.classList.add("hidden");
    reviewSection.classList.add("hidden");
    trendingSection.classList.remove("hidden");
    searchInput.value = "";

    // Default to trending view
    document.querySelector("#trendingSection h3").innerHTML = '<span class="yellow-bar"></span> Trending Movies';
    if (globalMoviesList.length > 0) {
        renderMovieGrid(shuffleArray(globalMoviesList));
    } else {
        loadTrendingMovies();
    }
}

backToMoviesBtn.addEventListener("click", returnToHome);
navLogo.addEventListener("click", returnToHome);

// Load default movies on startup
document.addEventListener("DOMContentLoaded", loadTrendingMovies);

// --- API Calls & Logic ---

async function loadTrendingMovies() {
    trendingGrid.innerHTML = '<div class="loader"></div>';

    // A curated list of 100 solid movie titles
    const defaultMovies = [
        "The Shawshank Redemption", "The Godfather", "The Dark Knight", "Pulp Fiction", "Forrest Gump", "Inception", "Fight Club", "The Matrix", "Goodfellas", "The Empire Strikes Back",
        "Interstellar", "City of God", "Spirited Away", "Saving Private Ryan", "The Green Mile", "Parasite", "Leon: The Professional", "Gladiator", "The Lion King", "The Prestige",
        "The Departed", "Whiplash", "The Usual Suspects", "Se7en", "Django Unchained", "The Shining", "WALL-E", "Avengers: Infinity War", "Spider-Man: Into the Spider-Verse", "Joker",
        "Braveheart", "Toy Story", "Inglourious Basterds", "Good Will Hunting", "Requiem for a Dream", "2001: A Space Odyssey", "Toy Story 3", "Star Wars", "Reservoir Dogs", "Up",
        "Jurassic Park", "Die Hard", "Batman Begins", "Truman Show", "Shutter Island", "The Sixth Sense", "A Beautiful Mind", "Jurassic Park", "Finding Nemo", "Kill Bill: Vol. 1",
        "V for Vendetta", "No Country for Old Men", "Avatar", "Catch Me If You Can", "The Big Lebowski", "The Wolf of Wall Street", "Blade Runner 2049", "The Grand Budapest Hotel", "Mad Max: Fury Road", "Gone Girl",
        "Prisoners", "The Social Network", "12 Years a Slave", "Hacksaw Ridge", "Ford v Ferrari", "Logan", "Dune", "Everything Everywhere All at Once", "Oppenheimer", "Barbie",
        "Top Gun: Maverick", "The Batman", "John Wick", "Deadpool", "Guardians of the Galaxy", "Iron Man", "Black Panther", "Thor: Ragnarok", "Avengers: Endgame", "Dunkirk",
        "Arrival", "Ex Machina", "Her", "Silver Linings Playbook", "La La Land", "Jojo Rabbit", "Knives Out", "Get Out", "A Quiet Place", "Hereditary",
        "The Conjuring", "IT", "Split", "Glass", "Unbreakable", "Rocky", "Creed", "The Terminator", "Terminator 2: Judgment Day", "Alien"
    ];

    // Fisher-Yates Shuffle to randomize the array before loading
    for (let i = defaultMovies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [defaultMovies[i], defaultMovies[j]] = [defaultMovies[j], defaultMovies[i]];
    }

    trendingGrid.innerHTML = "";
    // Process in batches of 10 to avoid blasting the API all at once and causing freezes
    const BATCH_SIZE = 10;

    for (let i = 0; i < defaultMovies.length; i += BATCH_SIZE) {
        const batch = defaultMovies.slice(i, i + BATCH_SIZE);

        try {
            const promises = batch.map(title =>
                fetch(`${API_BASE_URL}/movie/${encodeURIComponent(title)}`).then(res => res.json())
            );

            const movies = await Promise.all(promises);

            // Add valid movies to our global cache
            movies.forEach(m => {
                if (m.Response === "True") {
                    // Check for duplicates just in case
                    if (!globalMoviesList.find(existing => existing.imdbID === m.imdbID)) {
                        globalMoviesList.push(m);
                    }
                }
            });

            // Re-render the grid as we load
            renderMovieGrid(globalMoviesList);

        } catch (e) {
            console.error("Failed to load a batch of trending movies", e);
        }
    }
}

function renderMovieGrid(moviesArray) {
    trendingGrid.innerHTML = "";

    moviesArray.forEach(data => {
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
    });
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
