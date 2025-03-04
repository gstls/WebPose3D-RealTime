import { r11, r6, r9, r5, r4, r3, r7, r10, r2, r1, r8 } from "./constants.js";

// Function to remap measured joint coordinates based on parent-child relationships
export function computeRemappedPositions(measuredPositions) {
  const kinMap = {
    0: { parent: null, length: 0 },   // Face (root)
    7: { parent: null, length: 0 },   // Left hip (special case)
    8: { parent: null, length: 0 },   // Right hip (special case)
    1: { parent: 7, length: r6 },     // Left shoulder (Parent: Left hip)
    9: { parent: 7, length: r9 },     // Left knee (Parent: Left hip)
    3: { parent: 1, length: r5 },     // Left elbow (Parent: Left shoulder)
    11: { parent: 9, length: r10 },   // Left ankle (Parent: Left knee)
    5: { parent: 3, length: r4 },     // Left wrist (Parent: Left elbow)
    2: { parent: 8, length: r3 },     // Right shoulder (Parent: Right hip)
    10: { parent: 8, length: r7 },    // Right knee (Parent: Right hip)
    4: { parent: 2, length: r2 },     // Right elbow (Parent: Right shoulder)
    12: { parent: 10, length: r8 },   // Right ankle (Parent: Right knee)
    6: { parent: 4, length: r1 }      // Right wrist (Parent: Right elbow)
  };

  let remappedPositions = new Array(measuredPositions.length);

  // Step 1: Process hips (indices 7, 8) first
  let leftHipMeasured = measuredPositions[7];
  let rightHipMeasured = measuredPositions[8];
  if (!leftHipMeasured || !rightHipMeasured) {
    return measuredPositions;
  }
  let center = {
    x: (leftHipMeasured.x + rightHipMeasured.x) / 2,
    y: (leftHipMeasured.y + rightHipMeasured.y) / 2,
    z: (leftHipMeasured.z + rightHipMeasured.z) / 2
  };
  let dx = rightHipMeasured.x - leftHipMeasured.x;
  let dy = rightHipMeasured.y - leftHipMeasured.y;
  let dz = rightHipMeasured.z - leftHipMeasured.z;
  let dMag = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dMag < 1e-6) { dx = 1; dy = 0; dz = 0; dMag = 1; }
  let unit = { x: dx / dMag, y: dy / dMag, z: dz / dMag };
  remappedPositions[7] = {
    x: center.x - unit.x * r11,
    y: center.y - unit.y * r11,
    z: center.z - unit.z * r11
  };
  remappedPositions[8] = {
    x: center.x + unit.x * r11,
    y: center.y + unit.y * r11,
    z: center.z + unit.z * r11
  };

  // Step 2: Process the remaining joints in parent-child order
  let orderWithoutHips = Object.keys(kinMap)
    .filter(idx => idx !== "7" && idx !== "8")
    .map(Number);
  for (let i = 0; i < orderWithoutHips.length; i++) {
    let idx = orderWithoutHips[i];
    if (!kinMap[idx] || kinMap[idx].parent === null) {
      remappedPositions[idx] = { ...measuredPositions[idx] };
    } else {
      let parentIdx = kinMap[idx].parent;
      let parentPos = remappedPositions[parentIdx] || measuredPositions[parentIdx];
      let measuredChild = measuredPositions[idx];
      let measuredParent = measuredPositions[parentIdx];
      let dx = measuredChild.x - measuredParent.x;
      let dy = measuredChild.y - measuredParent.y;
      let dz = measuredChild.z - measuredParent.z;
      let mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (mag < 1e-6) {
        remappedPositions[idx] = { x: parentPos.x, y: parentPos.y, z: parentPos.z };
      } else {
        let scale = kinMap[idx].length / mag;
        remappedPositions[idx] = {
          x: parentPos.x + dx * scale,
          y: parentPos.y + dy * scale,
          z: parentPos.z + dz * scale
        };
      }
    }
  }
  return remappedPositions;
}

/*
export function clampPositions(positions, previousPositions, maxStep = 0.15, smoothingFactor = 0.8) {
  // Return the positions as-is if there are no previous values
  if (!previousPositions) return positions;
  let clamped = [];
  for (let i = 0; i < positions.length; i++) {
    let current = positions[i];
    let prev = previousPositions[i] || { x: current.x, y: current.y, z: current.z };

    // Calculate the difference vector between the current and previous positions
    let diff = {
      x: current.x - prev.x,
      y: current.y - prev.y,
      z: current.z - prev.z
    };
    // Compute the magnitude of the difference vector
    let mag = Math.sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
    
    // If the total movement exceeds maxStep, proportionally scale it down
    if (mag > maxStep) {
      let scale = maxStep / mag;
      diff.x *= scale;
      diff.y *= scale;
      diff.z *= scale;
    }
    
    // Compute the target position (previous position + clamped difference)
    let target = {
      x: prev.x + diff.x,
      y: prev.y + diff.y,
      z: prev.z + diff.z
    };
    
    // Smoothly transition from the previous position to the target using linear interpolation
    let newPos = {
      x: prev.x + (target.x - prev.x) * smoothingFactor,
      y: prev.y + (target.y - prev.y) * smoothingFactor,
      z: prev.z + (target.z - prev.z) * smoothingFactor,
    };
    
    clamped.push(newPos);
  }
  return clamped;
}
*/
