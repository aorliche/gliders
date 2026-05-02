import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { $, $$, rotateAboutPoint, randInt, randFloat } from './utils.js';

// Constants
const HUMBER_SPIN_DIV = 400;
const TURN_DIV = 50;
const START_SPEED = 0.02;
const MIN_SPEED = START_SPEED;
const MAX_SPEED = 5*START_SPEED;

class Humber {
	constructor(a, b, geometries, x, y, z, scene) {
		this.a = parseInt(a);
		this.b = parseInt(b);
		this.ab = this.a*10 + this.b;
		this.x = x;
		this.y = y;
		this.z = z;
		const geomA = geometries[a].clone();
		const geomB = geometries[b].clone();
		geomA.translate(0, 1, 0.5);
		geomB.translate(0, -1, -0.5);
		const geom = BufferGeometryUtils.mergeGeometries([geomA, geomB]);
		const material = new THREE.MeshPhongMaterial({
			emissive: 0xff0000,
		});
		this.mesh = new THREE.Mesh(geom, material);
		this.mesh.position.set(x, y, z);
		scene.add(this.mesh);
		/*const edges = new THREE.EdgesGeometry(geom);
		this.lines = new THREE.LineSegments(
			edges,
			new THREE.LineBasicMaterial({
				color: 0x0000ff,
				linewidth: 3,
			}),
		);
		this.lines.position.set(x, y, z);
		scene.add(this.lines);*/
	}

	tick() {
		rotateAboutPoint(
			this.mesh,
			this.mesh.position.clone(),
			new THREE.Vector3(0, 1, 0),
			Math.PI/HUMBER_SPIN_DIV,
		)
		/*rotateAboutPoint(
			this.lines,
			this.lines.position.clone(),
			new THREE.Vector3(0, 1, 0),
			Math.PI/HUMBER_SPIN_DIV,
		)*/
	}
}

window.addEventListener('load', e => {
	// Load geometries
	const loader = new STLLoader();
	let numModels = 0;
	let geometriesLoaded = 0;

	const geoKeys = [...Array(10).keys()].map(n => {
		return n.toString();
	});
	geoKeys.push('PigFace');
	const geometries = {};

	function isLoaded() {
		return numModels > 0 && numModels == geometriesLoaded;
	}

	function loadModel(name) {
		const path = `../geometries/${name}.stl`;
		numModels++;
		loader.load(path, geom => {
			geom.center();
			geom.rotateX(3*Math.PI/2);
			geometries[name] = geom;
			geometriesLoaded++;
		});
	}

	geoKeys.forEach(name => {
		loadModel(name);
	});

	// Set up environment
	const canvas = $('#glider-canvas');
	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		canvas
	});

	// Create scene and camera
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(
		110, 
		canvas.width / canvas.height, 
		0.1, 
		1000
	);
	camera.position.x = 5;

	let cameraTarget = new THREE.Vector3(0, 0, 0);
	let cameraUp = new THREE.Vector3(0, 1, 0);
	let cameraSide = new THREE.Vector3(0, 0, 1);

	camera.lookAt(cameraTarget);

	// Humbers
	const humbers = [];

	// Animation loop
	let added = false;
	let speed = START_SPEED;
	function animate(time) {
		if (!isLoaded()) {
			return;
		}
		if (!added) {
			for (let i=0; i < 20; i++) {
				const a = randInt(0, 9).toString();
				const b = randInt(0, 9).toString();
				const x = randFloat(-100, 100);
				const y = randFloat(-10, 10);
				const z = randFloat(-100, 100);
				const humb = new Humber(a, b, geometries, x, y, z, scene);
				let tooClose = false;
				for (let j=0; j<humbers.length; j++) {
					if (humbers[j].mesh.position.distanceTo(humb.mesh.position) < 5) {
						tooClose = true;
						break;
					}
				}
				if (tooClose) {
					i--;
					continue;
				}
				humbers.push(humb);
			}
			added = true;

			// Light
			const light = new THREE.DirectionalLight(0xffffff, 3);
			light.position.set(5, 0, 5);
			scene.add(light);

			// Grounded skybox
			/*const height = 15, radius = 100;
			const skybox = new GroundedSkybox( envMap, height, radius );
			skybox.position.y = height;
			scene.add(skybox);*/
		}
		humbers.forEach(h => h.tick());

		// Translate camera
		const cameraFwd = cameraTarget.clone();
		cameraFwd.sub(camera.position);
		cameraFwd.multiplyScalar(1/cameraFwd.length());
		cameraFwd.multiplyScalar(speed);
		cameraTarget.add(cameraFwd);
		const pos = camera.position;
		camera.position.set(pos.x + cameraFwd.x, pos.y + cameraFwd.y, pos.z + cameraFwd.z);
		camera.lookAt(cameraTarget);

		renderer.render(scene, camera);
	}

	renderer.setAnimationLoop(animate);

	// Navigation
	document.addEventListener('keydown', e => {
		const cameraFwd = cameraTarget.clone();
		cameraFwd.sub(camera.position);
		cameraFwd.multiplyScalar(1/cameraFwd.length());
		let delta;
		switch (e.key) {
			case 'w': 
				cameraFwd.applyAxisAngle(cameraSide, -Math.PI/TURN_DIV);
				cameraTarget = camera.position.clone().add(cameraFwd);
				camera.lookAt(cameraTarget);
				cameraUp.applyAxisAngle(cameraSide, -Math.PI/TURN_DIV);
				break;
			case 's':
				cameraFwd.applyAxisAngle(cameraSide, Math.PI/TURN_DIV);
				cameraTarget = camera.position.clone().add(cameraFwd);
				camera.lookAt(cameraTarget);
				cameraUp.applyAxisAngle(cameraSide, Math.PI/TURN_DIV);
				break;
			case 'a':
				cameraFwd.applyAxisAngle(cameraUp, Math.PI/TURN_DIV);
				cameraTarget = camera.position.clone().add(cameraFwd);
				camera.lookAt(cameraTarget);
				cameraSide.applyAxisAngle(cameraUp, Math.PI/TURN_DIV);
				break;
			case 'd':
				cameraFwd.applyAxisAngle(cameraUp, -Math.PI/TURN_DIV);
				cameraTarget = camera.position.clone().add(cameraFwd);
				camera.lookAt(cameraTarget);
				cameraSide.applyAxisAngle(cameraUp, -Math.PI/TURN_DIV);
				break;
			case 'ArrowUp':
				speed += 0.01;
				if (speed > MAX_SPEED) speed = MAX_SPEED;
				break;
			case 'ArrowDown':
				speed -= 0.01;
				if (speed < MIN_SPEED) speed = MIN_SPEED;
				break;
		}

	});

});
