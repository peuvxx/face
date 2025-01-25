const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
let drawing = false;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // faceapi가 로드되었는지 확인
    if (typeof faceapi === 'undefined') {
      throw new Error('faceapi is not defined. Ensure that face-api.js is properly loaded.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    // 모델 로드
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
    console.log('모델 로드 완료');

    detectFace();
    detectHands();
  } catch (err) {
    console.error('초기화 오류:', err);
  }
});

async function detectFace() {
  const displaySize = { width: window.innerWidth, height: window.innerHeight };
  canvas.width = displaySize.width;
  canvas.height = displaySize.height;

  setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 초기화

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      resizedDetections.forEach(detection => {
        const landmarks = detection.landmarks;
        const nose = landmarks.getNose(); // 코 좌표
        const leftEye = landmarks.getLeftEye(); // 왼쪽 눈 좌표
        const rightEye = landmarks.getRightEye(); // 오른쪽 눈 좌표
        const mouth = landmarks.getMouth(); // 입 좌표

        drawSquare(nose[3], 20, 'magenta'); // 코 위 네모
        drawSquare(leftEye[0], 15, 'magenta'); // 왼쪽 눈 위 네모
        drawSquare(rightEye[0], 15, 'magenta'); // 오른쪽 눈 위 네모
        drawSquare(mouth[3], 25, 'magenta'); // 입 위 네모
      });
    } catch (err) {
      console.error('얼굴 감지 오류:', err);
    }
  }, 100);
}

function drawSquare(position, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    position.x * canvas.width - size / 2,
    position.y * canvas.height - size / 2,
    size,
    size
  );
}

function detectHands() {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
  
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  
    hands.onResults((results) => {
      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks) => {
          const indexFingerTip = landmarks[8]; // 검지 끝 좌표
          drawHandSquare(indexFingerTip);
        });
      }
    });
  
    // Camera 객체 사용
    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 1280,
      height: 720,
    });
  
    camera.start();
  }
  
  function drawHandSquare(position) {
    ctx.fillStyle = 'cyan';
    ctx.fillRect(
      position.x * canvas.width - 10,
      position.y * canvas.height - 10,
      20,
      20
    );
  }
  

// 마우스 이벤트로 네모 그리기
canvas.addEventListener('mousedown', () => (drawing = true));
canvas.addEventListener('mouseup', () => (drawing = false));
canvas.addEventListener('mousemove', (e) => {
  if (drawing) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.fillStyle = 'cyan';
    ctx.fillRect(x - 10, y - 10, 20, 20);
  }
});
