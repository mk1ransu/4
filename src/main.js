import * as THREE from 'three';
import { GUI } from 'lil-gui';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add fog to the scene
scene.fog = new THREE.FogExp2(0x99bbff, 0.05);  // Light blue fog with exponential falloff

// Create the water surface (plane geometry)
const waterGeometry = new THREE.PlaneGeometry(2, 2, 512, 512);
const waterMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    uniform float uTime;
    uniform float uBigWavesElevation;
    uniform vec2 uBigWavesFrequency;
    uniform float uBigWavesSpeed;
    uniform float uSmallWavesElevation;
    uniform float uSmallWavesFrequency;
    uniform float uSmallWavesSpeed;
    uniform float uSmallIterations;

    varying float vElevation;

    // Perlin noise function (cnoise) implementation
    float cnoise(vec3 P) {
      const vec3 G = vec3(0.030231, 0.070053, 0.010381); // A gradient for noise function
      vec3 p = floor(P + dot(P, vec3(0.3333333))) + G;
      return fract(sin(dot(p, vec3(12.9898, 78.233, 39.346))) * 43758.5453);
    }

    void main() {
      vec3 modelPosition = position;
      float elevation = sin(modelPosition.x * uBigWavesFrequency.x + uTime * uBigWavesSpeed) * 
                        sin(modelPosition.z * uBigWavesFrequency.y + uTime * uBigWavesSpeed) * 
                        uBigWavesElevation;

      for (float i = 1.0; i <= uSmallIterations; i++) {
        elevation -= abs(cnoise(vec3(modelPosition.xz * uSmallWavesFrequency * i, uTime * uSmallWavesSpeed)) * uSmallWavesElevation / i);
      }

      vElevation = elevation;

      vec4 mvPosition = modelViewMatrix * vec4(modelPosition, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uDepthColor;
    uniform vec3 uSurfaceColor;
    varying float vElevation;

    void main() {
      vec3 color = mix(uDepthColor, uSurfaceColor, vElevation);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  uniforms: {
    uTime: { value: 0 },
    uBigWavesElevation: { value: 0.15 },
    uBigWavesFrequency: { value: new THREE.Vector2(1, 1) },
    uBigWavesSpeed: { value: 0.75 },
    uSmallWavesElevation: { value: 0.15 },
    uSmallWavesFrequency: { value: 3 },
    uSmallWavesSpeed: { value: 0.2 },
    uSmallIterations: { value: 4 },
    uDepthColor: { value: new THREE.Color('#186691') },
    uSurfaceColor: { value: new THREE.Color('#9bd8ff') },
  },
});

const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2;
scene.add(water);

// Add a small ship (use a simple box geometry)
const shipGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.5);
const shipMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
const ship = new THREE.Mesh(shipGeometry, shipMaterial);
ship.position.y = 0.1;  // Position the ship on top of the water surface
scene.add(ship);

// Camera position
camera.position.set(0, 1, 3);

// Lighting
const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

// GUI for controls
const gui = new GUI();
const debugObject = {
  uBigWavesElevation: 0.15,
  uBigWavesFrequencyX: 1,
  uBigWavesFrequencyY: 1,
  uBigWavesSpeed: 0.75,
  uSmallWavesElevation: 0.15,
  uSmallWavesFrequency: 3,
  uSmallWavesSpeed: 0.2,
  uSmallIterations: 4,
};

gui.add(debugObject, 'uBigWavesElevation', 0, 1, 0.001).name('Big Waves Elevation');
gui.add(debugObject, 'uBigWavesFrequencyX', 0, 10, 0.001).name('Big Waves Freq X');
gui.add(debugObject, 'uBigWavesFrequencyY', 0, 10, 0.001).name('Big Waves Freq Y');
gui.add(debugObject, 'uBigWavesSpeed', 0, 4, 0.001).name('Big Waves Speed');
gui.add(debugObject, 'uSmallWavesElevation', 0, 1, 0.001).name('Small Waves Elevation');
gui.add(debugObject, 'uSmallWavesFrequency', 0, 30, 0.001).name('Small Waves Freq');
gui.add(debugObject, 'uSmallWavesSpeed', 0, 4, 0.001).name('Small Waves Speed');
gui.add(debugObject, 'uSmallIterations', 0, 5, 1).name('Small Iterations');

// Animation loop
const clock = new THREE.Clock();

function animate() {
  const elapsedTime = clock.getElapsedTime();
  waterMaterial.uniforms.uTime.value = elapsedTime;

  // Update wave parameters based on GUI controls
  waterMaterial.uniforms.uBigWavesFrequency.value.set(debugObject.uBigWavesFrequencyX, debugObject.uBigWavesFrequencyY);
  waterMaterial.uniforms.uBigWavesElevation.value = debugObject.uBigWavesElevation;
  waterMaterial.uniforms.uBigWavesSpeed.value = debugObject.uBigWavesSpeed;
  waterMaterial.uniforms.uSmallWavesElevation.value = debugObject.uSmallWavesElevation;
  waterMaterial.uniforms.uSmallWavesFrequency.value = debugObject.uSmallWavesFrequency;
  waterMaterial.uniforms.uSmallWavesSpeed.value = debugObject.uSmallWavesSpeed;
  waterMaterial.uniforms.uSmallIterations.value = debugObject.uSmallIterations;

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

animate();

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});