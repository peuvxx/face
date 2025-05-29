const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

let squares = [];
let tears = [];
let lastHandTime = Date.now();
const loadedImages = [];

function loadImages(count) {
  return Promise.all(
    Array.from({ length: count }, (_, i) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          console.log(`✅ loaded: image${i + 1}.jpg`);
          resolve(img);
        };
        img.onerror = () => {
          console.error(`❌ FAILED to load: image${i + 1}.jpg`);
          resolve(null); // null로 처리해서 에러 안 나게
        };
        img.src = `./images/image${i + 1}.jpg`;
      });
    })
  );
}

async function startApp() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
    console.log('📦 Face API 모델 로드 완료');

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onHandResults);

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
        detectFace();
      },
      width: 1280,
      height: 720,
    });

    camera.start();
    setInterval(updateCanvas, 1000 / 60);
  } catch (err) {
    console.error('🚨 Initialization error:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const images = await loadImages(10); // 이미지 10장만 로딩
  loadedImages.push(...images.filter(img => img !== null)); // 로딩 실패한 건 제외
  startApp();
});

async function detectFace() {
  const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  if (detections.length > 0) {
    const landmarks = detections[0].landmarks;
    const leftEye = getCenter(landmarks.getLeftEye());
    const rightEye = getCenter(landmarks.getRightEye());

    createTear(leftEye);
    createTear(rightEye);
  }
}

function createTear(eyeCenter) {
  tears.push({
    x: eyeCenter.x * canvas.width,
    y: eyeCenter.y * canvas.height,
    size: 8,
    dy: 2,
    opacity: 1,
  });
}

function updateCanvas() {
  const currentTime = Date.now();

  if (currentTime - lastHandTime > 3000) {
    for (let square of squares) {
      square.x += square.dx;
      square.y += square.dy;
      square.size *= 0.98;
    }
    squares = squares.filter((square) => square.size > 1);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let square of squares) {
    const img = square.image;
    if (!img || !img.complete || img.naturalWidth === 0) continue;

    ctx.drawImage(
      img,
      square.x - square.size / 2,
      square.y - square.size / 2,
      square.size,
      square.size
    );
  }

  for (let tear of tears) {
    ctx.fillStyle = `rgba(0, 150, 255, ${tear.opacity})`;
    ctx.beginPath();
    ctx.arc(tear.x, tear.y, tear.size, 0, Math.PI * 2);
    ctx.fill();

    tear.y += tear.dy;
    tear.opacity -= 0.01;
  }

  tears = tears.filter(tear => tear.opacity > 0);
}

function getCenter(points) {
  let sumX = 0, sumY = 0;
  for (let p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

let lastImageSpawnTime = 0;

function onHandResults(results) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const now = Date.now();

    // ✅ 200ms (0.2초)마다만 이미지 추가
    if (now - lastImageSpawnTime < 120) return;

    lastImageSpawnTime = now;

    const landmarks = results.multiHandLandmarks[0];
    const indexFingerTip = landmarks[8];

    lastHandTime = now;

    squares.push({
      x: indexFingerTip.x * canvas.width,
      y: indexFingerTip.y * canvas.height,
      size: 30 + Math.random() * 50,
      image: loadedImages[Math.floor(Math.random() * loadedImages.length)],
      dx: (Math.random() - 0.5) * 5,
      dy: (Math.random() - 0.5) * 5,
    });
  }
}
