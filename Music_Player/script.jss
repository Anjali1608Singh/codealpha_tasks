* ==========================================================================
   MUSIC PLAYER - script.js
   A simple vanilla JS music player (play/pause, next/prev, seek, volume,
   playlist, autoplay-next, active song highlight).
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. SONG DATA
   --------------------------------------------------------------------------
   NOTE FOR LOCAL USE:
   Replace the "src" and "cover" values below with your own local files,
   e.g. "music/dreamy-sunset.mp3" and "images/cover1.jpg", once you've
   placed real files inside the /music and /images folders.

   For now (so this project works immediately when you open index.html),
   we use free, commonly-used royalty-free demo tracks (SoundHelix) for
   audio, and placeholder images for covers.
-------------------------------------------------------------------------- */
const songs = [
  {
    title: "Dreamy Sunset",
    artist: "Alex Carter",
    src: "music/dreamy-sunset.mp3",               // -> place your local file here
    fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "images/cover1.jpg",                    // -> place your local cover here
    fallbackCover: "https://picsum.photos/seed/sunset/300/300"
  },
  {
    title: "Morning Breeze",
    artist: "Liam Scott",
    src: "music/morning-breeze.mp3",
    fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "images/cover2.jpg",
    fallbackCover: "https://picsum.photos/seed/breeze/300/300"
  },
  {
    title: "Midnight Drive",
    artist: "Noah Wilson",
    src: "music/midnight-drive.mp3",
    fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "images/cover3.jpg",
    fallbackCover: "https://picsum.photos/seed/drive/300/300"
  },
  {
    title: "Summer Memories",
    artist: "Ethan Brooks",
    src: "music/summer-memories.mp3",
    fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    cover: "images/cover4.jpg",
    fallbackCover: "https://picsum.photos/seed/summer/300/300"
  },
  {
    title: "Peaceful Journey",
    artist: "Oliver James",
    src: "music/peaceful-journey.mp3",
    fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover: "images/cover5.jpg",
    fallbackCover: "https://picsum.photos/seed/journey/300/300"
  }
];

/* --------------------------------------------------------------------------
   2. GRAB DOM ELEMENTS
-------------------------------------------------------------------------- */
const audio = document.getElementById("audio");

const coverImg = document.getElementById("cover");
const songTitle = document.getElementById("song-title");
const songArtist = document.getElementById("song-artist");

const playBtn = document.getElementById("play-btn");
const playIcon = document.getElementById("play-icon");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const progressBar = document.getElementById("progress-bar");
const currentTimeEl = document.getElementById("current-time");
const totalDurationEl = document.getElementById("total-duration");

const volumeBar = document.getElementById("volume-bar");

const playlistEl = document.getElementById("playlist");

/* --------------------------------------------------------------------------
   3. STATE
-------------------------------------------------------------------------- */
let currentSongIndex = 0;
let isPlaying = false;

/* --------------------------------------------------------------------------
   4. HELPER: format seconds -> "m:ss"
-------------------------------------------------------------------------- */
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

/* --------------------------------------------------------------------------
   5. LOAD A SONG INTO THE PLAYER (without auto-playing it)
-------------------------------------------------------------------------- */
function loadSong(index) {
  const song = songs[index];

  songTitle.textContent = song.title;
  songArtist.textContent = song.artist;

  // Try the local file path first; if it fails to load, fall back to the
  // online demo track/image so the player still works out of the box.
  audio.src = song.src;
  audio.onerror = () => {
    audio.onerror = null; // prevent infinite loop if fallback also fails
    audio.src = song.fallbackSrc;
  };

  coverImg.src = song.cover;
  coverImg.onerror = () => {
    coverImg.onerror = null;
    coverImg.src = song.fallbackCover;
  };

  highlightActiveSong(index);
}

/* --------------------------------------------------------------------------
   6. PLAY / PAUSE
-------------------------------------------------------------------------- */
function playSong() {
  isPlaying = true;
  audio.play();
  playIcon.classList.remove("fa-play");
  playIcon.classList.add("fa-pause");
  playBtn.classList.add("playing");
}

function pauseSong() {
  isPlaying = false;
  audio.pause();
  playIcon.classList.remove("fa-pause");
  playIcon.classList.add("fa-play");
}

function togglePlay() {
  isPlaying ? pauseSong() : playSong();
}

/* --------------------------------------------------------------------------
   7. NEXT / PREVIOUS
-------------------------------------------------------------------------- */
function nextSong() {
  currentSongIndex = (currentSongIndex + 1) % songs.length;
  loadSong(currentSongIndex);
  playSong();
}

function prevSong() {
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  loadSong(currentSongIndex);
  playSong();
}

/* --------------------------------------------------------------------------
   8. PROGRESS BAR (update + seek)
-------------------------------------------------------------------------- */
// Runs continuously while the song plays, updating the bar + time labels.
audio.addEventListener("timeupdate", () => {
  const { currentTime, duration } = audio;
  const progressPercent = (currentTime / duration) * 100 || 0;

  progressBar.value = progressPercent;
  // Update the CSS variable used to color the "played" portion of the bar
  progressBar.style.setProperty("--progress", `${progressPercent}%`);

  currentTimeEl.textContent = formatTime(currentTime);
  totalDurationEl.textContent = formatTime(duration);
});

// Let the user click/drag the progress bar to seek to a new position.
progressBar.addEventListener("input", () => {
  const seekTime = (progressBar.value / 100) * audio.duration;
  audio.currentTime = seekTime;
});

/* --------------------------------------------------------------------------
   9. VOLUME CONTROL
-------------------------------------------------------------------------- */
volumeBar.addEventListener("input", () => {
  audio.volume = volumeBar.value;
});

/* --------------------------------------------------------------------------
   10. AUTOPLAY NEXT SONG WHEN CURRENT ONE ENDS
-------------------------------------------------------------------------- */
audio.addEventListener("ended", () => {
  nextSong();
});

/* --------------------------------------------------------------------------
   11. BUILD THE PLAYLIST UI
-------------------------------------------------------------------------- */
function renderPlaylist() {
  playlistEl.innerHTML = ""; // clear first

  songs.forEach((song, index) => {
    const li = document.createElement("li");
    li.classList.add("playlist-item");
    li.setAttribute("data-index", index);

    li.innerHTML = `
      <img src="${song.cover}" onerror="this.src='${song.fallbackCover}'" alt="${song.title} cover" />
      <div class="track-info">
        <h4>${song.title}</h4>
        <p>${song.artist}</p>
      </div>
    `;

    // Clicking a playlist item plays that song
    li.addEventListener("click", () => {
      currentSongIndex = index;
      loadSong(currentSongIndex);
      playSong();
    });

    playlistEl.appendChild(li);
  });
}

/* --------------------------------------------------------------------------
   12. HIGHLIGHT THE CURRENTLY PLAYING SONG IN THE PLAYLIST
-------------------------------------------------------------------------- */
function highlightActiveSong(index) {
  // Remove "active" class + equalizer icon from all items first
  document.querySelectorAll(".playlist-item").forEach((item) => {
    item.classList.remove("active");
    const eq = item.querySelector(".eq-icon");
    if (eq) eq.remove();
  });

  // Add it back to the currently selected song
  const activeItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
  if (activeItem) {
    activeItem.classList.add("active");

    // Add a small animated equalizer icon next to the active track
    const eq = document.createElement("div");
    eq.classList.add("eq-icon");
    eq.innerHTML = "<span></span><span></span><span></span>";
    activeItem.appendChild(eq);
  }
}

/* --------------------------------------------------------------------------
   13. EVENT LISTENERS FOR CONTROL BUTTONS
-------------------------------------------------------------------------- */
playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);

/* --------------------------------------------------------------------------
   14. INITIALIZE THE PLAYER ON PAGE LOAD
-------------------------------------------------------------------------- */
renderPlaylist();
loadSong(currentSongIndex);
audio.volume = volumeBar.value;
