const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioElement = document.getElementById('audioSource');
const canvas = document.getElementById('visualizerCanvas');
const ctx = canvas.getContext('2d');

const audioUpload = document.getElementById('audioUpload');
const playPauseBtn = document.getElementById('playPauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const bassGlow = document.getElementById('bassGlow');
const appContainer = document.querySelector('.app-container');

let audioSourceNode = null;
let analyserNode = null;
let isAudioSetup = false;
let animationFrameId = null;

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

audioUpload.addEventListener('change', function() {
    const files = this.files;
    if (files.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        audioElement.src = e.target.result;
        playPauseBtn.disabled = false;
        playPauseBtn.textContent = "PLAY";
    };
    fileReader.readAsDataURL(files[0]);
});

function setupWebAudio() {
    if (isAudioSetup) return;

    audioSourceNode = audioContext.createMediaElementSource(audioElement);
    analyserNode = audioContext.createAnalyser();
    
    audioSourceNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);

    analyserNode.fftSize = 256; 
    analyserNode.smoothingTimeConstant = 0.82;
    isAudioSetup = true;
}

playPauseBtn.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    setupWebAudio();

    if (audioElement.paused) {
        audioElement.play();
        playPauseBtn.textContent = "PAUSE";
        renderVisualizationLoop();
    } else {
        audioElement.pause();
        playPauseBtn.textContent = "PLAY";
        cancelAnimationFrame(animationFrameId);
    }
});

volumeSlider.addEventListener('input', (e) => {
    audioElement.volume = e.target.value;
});

function renderVisualizationLoop() {
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyserNode.getByteFrequencyData(dataArray);

        // Dark background trail fill effect
        ctx.fillStyle = 'rgba(4, 4, 12, 0.18)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.2;
        let barHeight;
        let x = 0;

        // Bass Tracker
        let bassSum = 0;
        for(let i = 0; i < 6; i++) {
            bassSum += dataArray[i];
        }
        let bassAverage = bassSum / 6;

        // Dynamic Neon Glow Pulse mapping
        if (bassAverage > 140) {
            bassGlow.style.opacity = `${(bassAverage - 140) / 115}`;
            bassGlow.style.transform = `translate(-50%, -50%) scale(${1 + (bassAverage / 255) * 0.4})`;
        } else {
            bassGlow.style.opacity = '0';
        }

        // Draw audio wave bars
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 1.25;

            // Smoothly morph color between pink, purple, and cyan based on amplitude
            const r = Math.min(255, 127 + (barHeight * 0.5));
            const g = Math.min(255, i * 4);
            const b = Math.min(255, 200 + (barHeight * 0.2));

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            
            // Draw standard reflection block mirrors
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 3, barHeight);
            x += barWidth;
        }
    }
    
    draw();
}

fullscreenBtn.addEventListener('click', () => {
    appContainer.classList.toggle('fullscreen-mode');
    setTimeout(resizeCanvas, 150);
    fullscreenBtn.textContent = appContainer.classList.contains('fullscreen-mode') ? "EXIT FULL SCREEN" : "FULL SCREEN";
});

audioElement.addEventListener('ended', () => {
    playPauseBtn.textContent = "PLAY";
    cancelAnimationFrame(animationFrameId);
});