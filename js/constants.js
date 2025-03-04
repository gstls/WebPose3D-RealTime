// Joint lengths and internal mapping constants
export const r1  = 0.19;  // Right wrist → Right elbow
export const r2  = 0.21;  // Right elbow → Right shoulder
export const r3  = 0.53;  // Right shoulder → Right waist
export const r4  = 0.19;  // Left wrist → Left elbow
export const r5  = 0.21;  // Left elbow → Left shoulder
export const r6  = 0.53;  // Left shoulder → Left waist
export const r7  = 0.40;  // Right waist → Right knee
export const r8  = 0.32;  // Right knee → Right ankle
export const r9  = 0.40;  // Left waist → Left knee
export const r10 = 0.32;  // Left knee → Left ankle
export const r11 = 0.11;  // (Half of the waist) → Distance from hip to center

// Internal joint index and MediaPipe landmark index mapping (Total: 13 joints)
// Internal indices:  
// 0: Face, 1: Left shoulder, 2: Right shoulder, 3: Left elbow, 4: Right elbow,
// 5: Left wrist, 6: Right wrist, 7: Left hip, 8: Right hip, 9: Left knee, 
// 10: Right knee, 11: Left ankle, 12: Right ankle

export const mapping = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

// Parent-child correction order (Based on internal indices)

export const order = [0, 7, 8, 1, 9, 3, 11, 5, 2, 10, 4, 12, 6];

// Connection lines (Based on internal indices)

export const connectionsInternal = [
  [6, 4],
  [4, 2],
  [2, 1],
  [1, 3],
  [3, 5],
  [2, 8],
  [1, 7],
  [8, 7],
  [8, 10],
  [7, 9],
  [10, 12],
  [9, 11]
];
