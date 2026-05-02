import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { $, $$, rotateAboutPoint } from './utils.js';

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
	}

	tick() {
		rotateAboutPoint(
			this.mesh,
			this.mesh.position.clone(),
			new THREE.Vector3(0, 1, 0),
			Math.PI/400,
		)
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
	function animate(time) {
		if (!isLoaded()) {
			return;
		}
		if (!added) {
			humbers.push(new Humber('4', '5', geometries, 3, 0, 3, scene));
			humbers.push(new Humber('1', '3', geometries, -3, 0, -3, scene));
			added = true;

			const light = new THREE.DirectionalLight(0xffffff, 3);
			light.position.set(5, 0, 5);
			scene.add(light);
		}
		humbers.forEach(h => h.tick());

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
				delta = cameraFwd.clone();
				delta.multiplyScalar(0.2);
				camera.position.add(delta);
				cameraTarget.add(delta);
				camera.lookAt(cameraTarget);
				break;
			case 's':
				delta = cameraFwd.clone();
				delta.multiplyScalar(0.2);
				camera.position.sub(delta);
				cameraTarget.sub(delta);
				camera.lookAt(cameraTarget);
				break;
			case 'a':
				delta = cameraSide.clone();
				delta.multiplyScalar(0.2);
				camera.position.add(delta);
				cameraTarget.add(delta);
				camera.lookAt(cameraTarget);
				break;
			case 'd':
				delta = cameraSide.clone();
				delta.multiplyScalar(0.2);
				camera.position.sub(delta);
				cameraTarget.sub(delta);
				camera.lookAt(cameraTarget);
				break;
		}

	});

	// Manual rotation
	$('#rotate-x').addEventListener('click', e => {
		e.preventDefault();
		geometries['PigFace'].rotation.x += Math.PI/4;
	});
	$('#rotate-y').addEventListener('click', e => {
		e.preventDefault();
		geometries['PigFace'].rotation.y += Math.PI/4;
	});
	$('#rotate-z').addEventListener('click', e => {
		e.preventDefault();
		geometries['PigFace'].rotation.z += Math.PI/4;
	});

	$('#zero-out').addEventListener('click', e => {
		e.preventDefault();
		const mesh = geometries['PigFace'];

		// Put center of mesh as (0,0,0)
		/*const box = new THREE.Box3().setFromObject(mesh);
		const dx = -(box.max.x - box.min.x)/2;
		const dy = -(box.max.y - box.min.y)/2;
		const dz = -(box.max.z - box.min.z)/2;
		mesh.position.set(dx, dy, dz);

		const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(dx*2, dy*2, dz*2), new THREE.MeshBasicMaterial({color: 0x00ff00}));
		scene.add(boxMesh);*/
	});

});
