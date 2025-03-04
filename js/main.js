import { testSupport, onResults } from "./posehandler.js";
import { setupUIControls, getFollowMode } from "./uicontrols.js";

window.addEventListener('load', () => {
  testSupport([{ client: 'Chrome' }]);
  setupUIControls();
  
  const videoElement = document.getElementsByClassName('input_video')[0];
  const canvasElement = document.getElementsByClassName('output_canvas')[0];
  const canvasCtx = canvasElement.getContext('2d');
  const controlsElement = document.getElementsByClassName('control-panel')[0];
  
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
  
  const PoseClass = window.mpPose && window.mpPose.Pose ? window.mpPose.Pose : window.Pose;
  if (!PoseClass) {
    console.error("The Pose class is not registered globally. Please ensure that the MediaPipe Pose script is loaded correctly.");
    return;
  }
  
  const version = PoseClass.VERSION || "0.5.1635988162";
  
  const options = {
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${version}/${file}`
  };
  
  const pose = new PoseClass(options);
  
  pose.onResults((results) => {
    const followMode = getFollowMode();
    onResults(results, canvasCtx, canvasElement, fpsControl, grid, followMode);
  });
  
  const camera = new Camera(videoElement, {
    onFrame: async () => { await pose.send({ image: videoElement }); },
    width: 1280, height: 720,
  });
  camera.start();

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
