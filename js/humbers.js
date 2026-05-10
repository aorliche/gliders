import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { $, $$, rotateAboutPoint, randInt, randFloat } from './utils.js';

// Constants
const HUMBER_SPIN_DIV = 400;
const TURN_DIV = 300;
const SPEED_MULT = 0.01;
const START_SPEED = 5;
const MIN_SPEED = 2;
const MAX_SPEED = 20;
const PROJECTILE_TICK_LIFETIME = 100;
const HUMBER_INIT_HEALTH = 20;

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
		this.health = HUMBER_INIT_HEALTH;
	}

	collide(proj) {
		const bbox = new THREE.Box3().setFromObject(this.mesh);
	}

	tick() {
		rotateAboutPoint(
			this.mesh,
			this.mesh.position.clone(),
			new THREE.Vector3(0, 1, 0),
			Math.PI/HUMBER_SPIN_DIV,
		)
	}
}

class Projectile {
	// p is a vector of current position
	// dp is a vector to add every tick to current position
	constructor(p, dp, scene) {
		this.p = p;
		this.dp = dp;
		const geom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
		const material = new THREE.MeshPhongMaterial({
			emissive: 0x8888ff,
		});
		this.mesh = new THREE.Mesh(geom, material);
		this.mesh.position.set(p.x, p.y, p.z);
		scene.add(this.mesh);
		this.ticks = 0;
		this.remove = false;
	}

	tick() {
		this.p.add(this.dp);
		this.mesh.position.set(this.p.x, this.p.y, this.p.z);
		this.ticks++;
		if (this.ticks > PROJECTILE_TICK_LIFETIME) {
			this.mesh.geometry.dispose();
			this.mesh.material.dispose();
			this.mesh.parent.remove(this.mesh);
			this.remove = true;
		}
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

	// Actors
	const humbers = [];
	const projectiles = [];
	let prevPos = null;

	// Animation loop
	let added = false;
	let speed = START_SPEED;
	let paused = false;
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

			// Light
			const light = new THREE.DirectionalLight(0xffffff, 3);
			light.position.set(-1000, 50, 0);
			scene.add(light);

			// Skybox
			const loader = new THREE.CubeTextureLoader();
			loader.setPath('../image/skybox/');
			const envMap = loader.load([
				'sideSun.png',
				'sideBack.png',
				'top.png',
				'bottom.png',
				'sideLeft.png',
				'sideRight.png',
			]);
			scene.background = envMap;

			// Ground with height map
			const texLoader = new THREE.TextureLoader();
			const heightMap = texLoader.load('../image/height-map.png');
			const groundTex = texLoader.load('../image/ground-texture.png');
			const groundGeo = new THREE.PlaneGeometry(1000, 1000, 128, 128);
			const groundMat = new THREE.MeshStandardMaterial({
				side: THREE.DoubleSide,
				map: groundTex,
				displacementMap: heightMap,
				displacementScale: 80,
			});
			const ground = new THREE.Mesh(groundGeo, groundMat);
			ground.rotation.x = -Math.PI/2;
			ground.position.y = -100;
			ground.receiveShadow = true;
			scene.add(ground);
		
			// Change added flag
			added = true;
		}

		// If we aren't paused
		if (!paused) {
			for (let i=0; i<projectiles.length; i++) {
				const p = projectiles[i];
				if (p.remove) {
					projectiles.splice(i, 1);
					i--;
					continue;
				} 
				p.tick();
			}
			humbers.forEach(h => h.tick());

			// Check for collisions with projectiles
			/*for (let i=0; i<projectiles.length; i++) {
				const p = projectiles[i];
				for (let j=0; j<humbers.length; j++) {
					const h = humbers[j];
					if (p.mesh.position.distanceTo(h.mesh.position) < 1) {
						p.remove = true;
						h.remove = true;
					}
				}
			}*/

			// Translate camera
			const cameraFwd = cameraTarget.clone();
			cameraFwd.sub(camera.position);
			cameraFwd.multiplyScalar(1/cameraFwd.length());
			cameraFwd.multiplyScalar(speed*SPEED_MULT);
			cameraTarget.add(cameraFwd);
			const pos = camera.position;
			camera.position.set(pos.x + cameraFwd.x, pos.y + cameraFwd.y, pos.z + cameraFwd.z);
			camera.lookAt(cameraTarget);
		}

		renderer.render(scene, camera);
	}

	renderer.setAnimationLoop(animate);

	document.addEventListener('mousemove', e => {
		// No inputs while paused
		if (paused) {
			prevPos = null;
			return;
		}
		if (!prevPos) {
			prevPos = new THREE.Vector2(e.clientX, e.clientY);
			return;
		}
		const dx = e.clientX - prevPos.x;
		const dy = e.clientY - prevPos.y;
		prevPos = new THREE.Vector2(e.clientX, e.clientY);

		// Motion in screen y
		let cameraFwd = cameraTarget.clone();
		cameraFwd.sub(camera.position);
		cameraFwd.multiplyScalar(1/cameraFwd.length());

		cameraFwd.applyAxisAngle(cameraSide, -Math.PI/TURN_DIV*dy);
		cameraTarget = camera.position.clone().add(cameraFwd);
		camera.lookAt(cameraTarget);
		cameraUp.applyAxisAngle(cameraSide, -Math.PI/TURN_DIV*dy);
	
		// Motion in screen x
		cameraFwd = cameraTarget.clone();
		cameraFwd.sub(camera.position);
		cameraFwd.multiplyScalar(1/cameraFwd.length());

		cameraFwd.applyAxisAngle(cameraUp, Math.PI/TURN_DIV*dx);
		cameraTarget = camera.position.clone().add(cameraFwd);
		camera.lookAt(cameraTarget);
		cameraSide.applyAxisAngle(cameraUp, Math.PI/TURN_DIV*dx);
	});

	// Navigation
	document.addEventListener('keydown', e => {
		// Don't want to have input while paused
		// But also want the ability to unpause
		if (paused) {
			if (e.key === 'p') {
				paused = false;
			}
			return;
		}
		const cameraFwd = cameraTarget.clone();
		cameraFwd.sub(camera.position);
		cameraFwd.multiplyScalar(1/cameraFwd.length());
		let delta;
		// Regular keyboard inputs
		switch (e.key) {
			case 'w':
				speed += 1;
				if (speed > MAX_SPEED) speed = MAX_SPEED;
				break;
			case 's':
				speed -= 1;
				if (speed < MIN_SPEED) speed = MIN_SPEED;
				break;
			case 'p':
				paused = !paused;
				break;
			case ' ':
				// We get confused in initial few moments of mouse control
				const cameraDown = cameraUp.clone();
				//cameraDown.negate();
				cameraDown.add(camera.position);
				const proj = new Projectile(cameraDown, cameraFwd.clone(), scene);
				projectiles.push(proj);
				break;
		}

	});

});
