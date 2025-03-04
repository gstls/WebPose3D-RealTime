import { testSupport, onResults } from "./posehandler.js";
import { setupUIControls, getFollowMode } from "./uicontrols.js";

// 외부 스크립트(예: mpPose, Camera, ControlPanel 등)가 모두 로드된 후 실행
window.addEventListener('load', () => {
  // 지원 브라우저 체크 (예: Chrome)
  testSupport([{ client: 'Chrome' }]);
  
  // UI 컨트롤 초기화 (Follow 모드 토글, 키 이벤트 등)
  setupUIControls();
  
  // DOM 요소 참조
  const videoElement = document.getElementsByClassName('input_video')[0];
  const canvasElement = document.getElementsByClassName('output_canvas')[0];
  const canvasCtx = canvasElement.getContext('2d');
  const controlsElement = document.getElementsByClassName('control-panel')[0];
  
  // 외부 스크립트에서 전역으로 제공하는 FPS, LandmarkGrid 등 사용
  const fpsControl = new FPS();
  
  const spinner = document.querySelector('.loading');
  spinner.ontransitionend = () => { spinner.style.display = 'none'; };

  const landmarkContainer = document.getElementsByClassName('landmark-grid-container')[0];
  const grid = new LandmarkGrid(landmarkContainer, {
    connectionColor: 0xCCCCCC,
    definedColors: [{ name: 'LEFT', value: 0xffa500 }, { name: 'RIGHT', value: 0x00ffff }],
    range: 2, fitToGrid: true, labelSuffix: 'm',
    landmarkSize: 2, numCellsPerAxis: 4, showHidden: false, centered: true,
  });

  let activeEffect = 'mask';
  
  // Pose 클래스 참조  
  // 먼저 window.mpPose와 window.Pose 중 존재하는 것을 사용
  const PoseClass = window.mpPose && window.mpPose.Pose ? window.mpPose.Pose : window.Pose;
  if (!PoseClass) {
    console.error("Pose 클래스가 전역에 등록되어 있지 않습니다. 미디어파이프 Pose 스크립트가 올바르게 로드되었는지 확인하세요.");
    return;
  }
  
  // PoseClass.VERSION이 정의되어 있지 않다면 기본 버전 문자열 사용
  const version = PoseClass.VERSION || "0.5.1635988162";
  
  const options = {
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${version}/${file}`
  };
  
  const pose = new PoseClass(options);
  
  pose.onResults((results) => {
    const followMode = getFollowMode();
    onResults(results, canvasCtx, canvasElement, fpsControl, grid, followMode);
  });
  
  // MediaPipe Camera 설정 (Camera는 window.Camera로 접근)
  const camera = new Camera(videoElement, {
    onFrame: async () => { await pose.send({ image: videoElement }); },
    width: 1280, height: 720,
  });
  camera.start();

  // Control Panel 설정 (ControlPanel, StaticText, Toggle, Slider 등은 전역으로 제공됨)
  new ControlPanel(controlsElement, {
    selfieMode: true,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    effect: 'background',
  })
  .add([
    new StaticText({ title: 'MediaPipe Pose' }),
    fpsControl,
    new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new Slider({ title: 'Model Complexity', field: 'modelComplexity', discrete: ['Lite', 'Full', 'Heavy'] }),
    new Toggle({ title: 'Smooth Landmarks', field: 'smoothLandmarks' }),
    new Toggle({ title: 'Enable Segmentation', field: 'enableSegmentation' }),
    new Toggle({ title: 'Smooth Segmentation', field: 'smoothSegmentation' }),
    new Slider({ title: 'Min Detection Confidence', field: 'minDetectionConfidence', range: [0, 1], step: 0.01 }),
    new Slider({ title: 'Min Tracking Confidence', field: 'minTrackingConfidence', range: [0, 1], step: 0.01 }),
    new Slider({ title: 'Effect', field: 'effect', discrete: { background: 'Background', mask: 'Foreground' } }),
  ])
  .on(x => {
    videoElement.classList.toggle('selfie', x.selfieMode);
    activeEffect = x['effect'];
    pose.setOptions(x);
  });
});
