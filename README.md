# Introduction
- This project utilizes MediaPipe and A-Frame to render joints in a virtual environment in real time.
- Mediapipe is a body-tracking framework developed by Google. [More information about mediapipe](https://developers.google.com/mediapipe)

## Demo Video
Watch the video to see smoother real-time pose estimation.

![Image](https://github.com/user-attachments/assets/da229835-2309-4ef2-b1f8-be291aac1657)

## Real-Time Pose Estimation: Accuracy vs. Efficiency
- Under the constraint of a single RGB image, all pose estimation models can accurately predict 2D (x, y) coordinates. However, reconstructing the z-axis is inherently ambiguous. 
- Lightweight pose estimation models, such as MediaPipe, often suffer from reduced accuracy and consistency.
- Meanwhile, accuracy-focused models are too heavy, making them less practical for real-world applications.
- This project aims to find an optimal balance between the accuracy and computational cost of pose estimation models. Furthermore, it enhances scalability for real-time applications.

## Solution Approach
- In this project, the z-coordinate predicted by lightweight pose estimation models (MediaPipe) is treated as noise and filtered using a Kalman filter to improve stability and accuracy.
- The Kalman filter is an algorithm that estimates the true state of a system by recursively filtering out noise from observed data. It is widely used in real-time tracking applications to improve accuracy and stability.
- In the Kalman filter, state transition is a key factor, and defining this function properly plays a crucial role in determining the filter's performance.
- This project uses a Kalman filter state transition function that incorporates a smoothing transition method while enforcing projection constraints based on predefined joint lengths, ensuring gradual and stable updates with a maximum step size constraint.

# Project Overview
### Joint Information
- #### MediaPipe Joint Information
![Image](https://github.com/user-attachments/assets/21b50d65-89d6-48bc-b6af-3cd2a9c0f65c)

- #### Selected Joints Information 
![Image](https://github.com/user-attachments/assets/fbcaaf9f-c392-42f1-8888-ea22458c664b)

This project selects only the minimal set of joints necessary to identify the user's posture.

### KalmanFilter: State Transition

- The range of motion of human joints can be defined using a sphere equation when certain parts are fixed. In this case, assuming that the x and y coordinates are relatively accurate, we can approximate the length parameter r and infer that 𝑧^2 = 𝑟^2−𝑥^2−𝑦^2. Based on this sphere equation, the state transition is defined.
- However, since the z-coordinate has two possible solutions, and MediaPipe is not always accurate in determining the front-back relationship of joints, its predictions become less reliable near the sphere's boundary. To address this, smoothing is applied by dividing the solution into the 3/4 and 1/4 positions.
- Additionally, if x and y violate the physical constraint by being defined outside the radius r, a projection condition is enforced.
- Finally, clamping is applied to ensure that the estimated values remain within valid limits, preventing unrealistic deviations.
- Since joint lengths can vary from person to person, appropriate adjustments are necessary. One possible approach is to upload an image with the arms and legs fully extended and calculate the 2D Euclidean distances.

### Filtering Chain and Post-Processing

- A separate Kalman filter is created for each joint, and the filtered values are propagated until no additional connected joints remain from the waist center. The facial skeleton applies an independent filter.
- To prevent synchronization issues caused by varying filtering speeds across joints, the filtering chain updates all joints within a single frame before rendering them in the virtual environment.
- As a post-processing step, remapping is applied to ensure that the predefined joint lengths are maintained within the 3D virtual environment.
- The average update time for each joint within a single frame is 4ms, causing little to no noticeable latency.

### Kalman Filter: State Transition & Batch Update (Pseudo Code)

![Image](https://github.com/user-attachments/assets/db2a38cc-9678-4c9c-925a-fe0e539f3300)

# Getting Started
- This project does not require any additional library installations. Simply download the project and run index.html using Live Server or via npm.
- Click the 'Follow Skeleton' button while running the project to enable the third-person camera, allowing it to track and follow the skeleton.

