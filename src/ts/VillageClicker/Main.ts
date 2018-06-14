import * as THREE from 'three';

const scene = new THREE.Scene();

const aspect = window.innerWidth / window.innerHeight;
const d = 5;

const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(scene.position);

const geometry = new THREE.BoxGeometry(1, 2, 1);

for (let i = 0; i < geometry.faces.length; i += 2) {
    const hex = Math.random() * 0xffffff;
    geometry.faces[i].color.setHex(hex);
    geometry.faces[i + 1].color.setHex(hex);
}

const material1 = new THREE.MeshStandardMaterial({ vertexColors: THREE.FaceColors, overdraw: 0.5 });

const cube = new THREE.Mesh(geometry, material1);
scene.add(cube);

const geometry2 = new THREE.PlaneBufferGeometry(200, 200);
geometry2.applyMatrix(new THREE.Matrix4().makeRotationX(- Math.PI / 2));

const material2 = new THREE.MeshBasicMaterial({ color: 0xe0e0e0, overdraw: 0.5 });

const plane = new THREE.Mesh(geometry2, material2);
scene.add(plane);

const light = new THREE.PointLight();
light.position.set(100, 100, 100);
scene.add(light);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

cube.rotation.x = 0;
const render = () => {
    cube.rotation.y += 0.05;
    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
};
render();

window.addEventListener('resize', (event: Event) => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
});
