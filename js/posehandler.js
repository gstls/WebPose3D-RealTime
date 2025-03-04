import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";
import { ExtendedKalmanFilter, CURRENT_MEAS } from "./kalmanfilter.js";
import { computeRemappedPositions } from "./skeletonmapping.js";
import { mapping, connectionsInternal } from "./constants.js";
import { lerp } from "./mathutils.js";

let ekf = null;

// Check supported browsers (e.g., only support Chrome)
export function testSupport(supportedDevices) {
  const deviceDetector = new DeviceDetector();
  const detectedDevice = deviceDetector.parse(navigator.userAgent);
  let isSupported = false;
  for (const device of supportedDevices) {
    if (device.client !== undefined) {
      const re = new RegExp(`^${device.client}$`);
      if (!re.test(detectedDevice.client.name)) continue;
    }
    if (device.os !== undefined) {
      const re = new RegExp(`^${device.os}$`);
      if (!re.test(detectedDevice.os.name)) continue;
    }
    isSupported = true;
    break;
  }
  if (!isSupported) {
    alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, is not well supported at this time.`);
  }
}

// Callback function invoked when MediaPipe Pose results are received
// (canvasCtx, canvasElement, fpsControl, grid, followMode are passed from main.js)
export function onResults(results, canvasCtx, canvasElement, fpsControl, grid, followMode) {
  let skeletonEntity = document.getElementById('skeleton');
  if (!skeletonEntity) {
    skeletonEntity = document.createElement('a-entity');
    skeletonEntity.setAttribute('id', 'skeleton');
    document.querySelector('a-scene').appendChild(skeletonEntity);
  }

  // Global offset correction based on 2D image
  if (results.poseLandmarks) {
    const leftHip = results.poseLandmarks[23];
    const rightHip = results.poseLandmarks[24];
    const midX = leftHip && typeof leftHip.x === 'number' ? (leftHip.x + rightHip.x) / 2 : 0;
    const midY = leftHip && typeof leftHip.y === 'number' ? (leftHip.y + rightHip.y) / 2 : 0;
    let minX = 1.0, maxX = 0.0;
    results.poseLandmarks.forEach(lm => {
      if (lm && typeof lm.x === 'number' && !isNaN(lm.x)) {
        if (lm.x < minX) minX = lm.x;
        if (lm.x > maxX) maxX = lm.x;
      }
    });
    const personWidth = maxX - minX;
    const baseX = 2, baseY = 1, baseZ = -3;
    const scaleX = 6, scaleY = 6, scaleZ = -2, baselineWidth = 0.3;
    const offsetX = (midX - 0.5) * scaleX;
    const offsetY = (0.5 - midY) * scaleY;
    const offsetZ = (baselineWidth - personWidth) * scaleZ;
    let newSkeletonPos = { x: baseX + offsetX, y: baseY + offsetY, z: baseZ + offsetZ };

    if (window.lastSkeletonPos) {
      newSkeletonPos.x = lerp(window.lastSkeletonPos.x, newSkeletonPos.x, 0.6);
      newSkeletonPos.y = lerp(window.lastSkeletonPos.y, newSkeletonPos.y, 0.6);
      newSkeletonPos.z = lerp(window.lastSkeletonPos.z, newSkeletonPos.z, 0.2);
    }

    if (results.poseWorldLandmarks) {
      const leftAnkle = results.poseWorldLandmarks[27];
      const rightAnkle = results.poseWorldLandmarks[28];
      let leftAnkleLocalY = (leftAnkle && typeof leftAnkle.y === 'number' && !isNaN(leftAnkle.y)) ? leftAnkle.y * -1 : 0;
      let rightAnkleLocalY = (rightAnkle && typeof rightAnkle.y === 'number' && !isNaN(rightAnkle.y)) ? rightAnkle.y * -1 : 0;
      const leftAnkleWorldY = newSkeletonPos.y + leftAnkleLocalY;
      const rightAnkleWorldY = newSkeletonPos.y + rightAnkleLocalY;
      const lowestWorldAnkleY = Math.min(leftAnkleWorldY, rightAnkleWorldY);
      const groundLevel = -0.3;
      if (lowestWorldAnkleY < groundLevel) {
        newSkeletonPos.y += (groundLevel - lowestWorldAnkleY);
      }
    }
    skeletonEntity.setAttribute('position', `${newSkeletonPos.x} ${newSkeletonPos.y} ${newSkeletonPos.z}`);
    window.lastSkeletonPos = newSkeletonPos;
  }

  // EKF-based z correction
  if (results.poseWorldLandmarks) {
    let joints = [];
    for (let i = 0; i < mapping.length; i++) {
      let idx = mapping[i];
      let lm = results.poseWorldLandmarks[idx];
      let x = (lm && typeof lm.x === 'number' && !isNaN(lm.x)) ? lm.x : 0;
      let y = (lm && typeof lm.y === 'number' && !isNaN(lm.y)) ? lm.y : 0;
      let z = (lm && typeof lm.z === 'number' && !isNaN(lm.z)) ? lm.z : 0;
      joints.push([x, y, z]);
    }
    let refJoints = joints.map(j => j[2]);
    CURRENT_MEAS.joints = joints;
    CURRENT_MEAS.ref_joints = refJoints;

    if (!ekf) {
      ekf = new ExtendedKalmanFilter(13, 13);
      ekf.x = refJoints.slice();
    }
    ekf.predict(1.0);
    ekf.update(refJoints);
    window.filteredZ = ekf.x.slice();
  }

  // Skeleton rendering (with remapping applied; clamping is handled within the smoothing transition function)
  if (results.poseWorldLandmarks) {
    const poseLandmarks = results.poseWorldLandmarks;
    let measuredPositions = [];
    for (let i = 0; i < mapping.length; i++) {
      let lm = poseLandmarks[mapping[i]];
      let x = (lm && typeof lm.x === 'number' && !isNaN(lm.x)) ? lm.x : 0;
      let y = (lm && typeof lm.y === 'number' && !isNaN(lm.y)) ? lm.y : 0;
      // Use the EKF filtered z value
      let z = window.filteredZ ? (window.filteredZ[i] || 0) : 0;
      measuredPositions.push({ x, y, z });
    }
    // Perform remapping (individual joint movement limitations are handled in the smoothing state transition function)
    let remappedPositions = computeRemappedPositions(measuredPositions);

    // Clear previous skeleton entity
    while (skeletonEntity.firstChild) {
      skeletonEntity.removeChild(skeletonEntity.firstChild);
    }
    // Create spheres for each joint
    for (let i = 0; i < remappedPositions.length; i++) {
      const pos = remappedPositions[i];
      const landmarkEntity = document.createElement('a-entity');
      landmarkEntity.setAttribute('geometry', 'primitive: sphere; radius: 0.05');
      landmarkEntity.setAttribute('material', 'color: red');
      // Invert y and z for the A-Frame coordinate system
      landmarkEntity.setAttribute('position', `${pos.x} ${-pos.y} ${-pos.z}`);
      skeletonEntity.appendChild(landmarkEntity);
    }
    // Create connection lines between joints
    for (const conn of connectionsInternal) {
      const idxStart = conn[0], idxEnd = conn[1];
      let startPos = remappedPositions[idxStart];
      let endPos = remappedPositions[idxEnd];
      const lineEntity = document.createElement('a-entity');
      lineEntity.setAttribute('line', `start: ${startPos.x} ${-startPos.y} ${-startPos.z}; end: ${endPos.x} ${-endPos.y} ${-endPos.z}; color: white;`);
      skeletonEntity.appendChild(lineEntity);
    }
  } else {
    while (skeletonEntity.firstChild) {
      skeletonEntity.removeChild(skeletonEntity.firstChild);
    }
  }

  // Update canvas and UI
  document.body.classList.add('loaded');
  fpsControl.tick();
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.segmentationMask) {
    canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.globalCompositeOperation = 'source-out';
    canvasCtx.fillStyle = '#0000FF7F';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.globalCompositeOperation = 'source-over';
  } else {
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }

  if (results.poseLandmarks) {
    const allowedNeutral = [0];
    const allowedShoulderElbowWrist = [11, 13, 15, 12, 14, 16];
    const allowedLowerBody = [23, 25, 27, 24, 26, 28];

    const neutralLandmarks = allowedNeutral.map(i => results.poseLandmarks[i]);
    const shoulderElbowWristLandmarks = allowedShoulderElbowWrist.map(i => results.poseLandmarks[i]);
    const lowerBodyLandmarks = allowedLowerBody.map(i => results.poseLandmarks[i]);

    window.drawLandmarks(canvasCtx, neutralLandmarks, {
      visibilityMin: 0.65,
      color: 'white',
      fillColor: 'white'
    });
    window.drawLandmarks(canvasCtx, shoulderElbowWristLandmarks, {
      visibilityMin: 0.65,
      color: 'white',
      fillColor: 'rgb(255,138,0)'
    });
    window.drawLandmarks(canvasCtx, lowerBodyLandmarks, {
      visibilityMin: 0.65,
      color: 'white',
      fillColor: 'rgb(0,217,231)'
    });
  }

  canvasCtx.restore();

  const mpPose = window.mpPose || window.Pose;
  const landmarksLeft = mpPose && mpPose.POSE_LANDMARKS_LEFT ? Object.values(mpPose.POSE_LANDMARKS_LEFT) : [];
  const landmarksRight = mpPose && mpPose.POSE_LANDMARKS_RIGHT ? Object.values(mpPose.POSE_LANDMARKS_RIGHT) : [];

  if (results.poseWorldLandmarks) {
    grid.updateLandmarks(results.poseWorldLandmarks, mpPose.POSE_CONNECTIONS, [
      { list: landmarksLeft, color: 'LEFT' },
      { list: landmarksRight, color: 'RIGHT' },
    ]);
  } else {
    grid.updateLandmarks([]);
  }

  // Follow camera feature
  if (followMode && window.lastSkeletonPos) {
    let targetCamPos = {
      x: window.lastSkeletonPos.x,
      y: window.lastSkeletonPos.y,
      z: window.lastSkeletonPos.z + 2
    };
    const userCamera = document.getElementById('userCamera');
    if (userCamera) {
      let currentPos = userCamera.getAttribute('position');
      targetCamPos.x = lerp(currentPos.x, targetCamPos.x, 0.6);
      targetCamPos.y = lerp(currentPos.y, targetCamPos.y, 0.6);
      targetCamPos.z = lerp(currentPos.z, targetCamPos.z, 0.2);
      userCamera.setAttribute('position', `${targetCamPos.x} ${targetCamPos.y} ${targetCamPos.z}`);
    }
  }
}
