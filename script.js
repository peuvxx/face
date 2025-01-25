const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

let squares = []; // 잔상 네모를 저장하는 배열
let lastHandTime = Date.now(); // 마지막으로 손이 감지된 시간
let currentColor = getRandomColor(); // 초기 색상 설정

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 1280,
      height: 720,
    });

    camera.start();

    // 화면 사방으로 흩어지는 애니메이션
    setInterval(updateSquares, 1000 / 60); // 60fps
  } catch (err) {
    console.error('Initialization error:', err);
  }
});

// 스페이스바로 색상 변경
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    currentColor = getRandomColor(); // 새로운 랜덤 색상 할당
    console.log('New color:', currentColor);
  }
});

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function onResults(results) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const indexFingerTip = landmarks[8]; // 검지 끝 좌표

    lastHandTime = Date.now(); // 손이 감지된 시간을 업데이트

    // 네모를 추가
    const square = {
      x: indexFingerTip.x * canvas.width,
      y: indexFingerTip.y * canvas.height,
      size: 20,
      color: currentColor, // 현재 색상 적용
      dx: (Math.random() - 0.5) * 5, // x축 이동 속도
      dy: (Math.random() - 0.5) * 5, // y축 이동 속도
    };
    squares.push(square);
  }
}

// 네모 업데이트 및 화면에 그리기
function updateSquares() {
  const currentTime = Date.now();

  if (currentTime - lastHandTime > 3000) {
    // 손이 사라진 후 3초가 지났다면 네모들이 흩어지기 시작
    for (let square of squares) {
      square.x += square.dx;
      square.y += square.dy;
      square.size *= 0.98; // 네모 크기를 줄이며 사라지게 함
    }
    squares = squares.filter((square) => square.size > 1); // 크기가 너무 작아지면 제거
  }

  // 캔버스 초기화
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 네모 다시 그리기
  for (let square of squares) {
    ctx.fillStyle = square.color;
    ctx.fillRect(square.x - square.size / 2, square.y - square.size / 2, square.size, square.size);
  }
}
