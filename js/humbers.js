import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { $, $$, rotateAboutPoint, randInt, randFloat } from './utils.js';
import { Label, Bar, HumberList } from './hud.js';

// Constants
const HUMBER_SPIN_DIV = 400;
const TURN_DIV = 400;
const SPEED_MULT = 0.01;
const START_SPEED = 5;
const MIN_SPEED = 2;
const MAX_SPEED = 20;
const PROJ_COOLDOWN = 10;
const PROJ_TICK_LIFETIME = 200;
const PROJ_SPEED_MULT = 0.5;
const HUMBER_INIT_HEALTH = 10;

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

	hit(proj) {
		this.health--;
		this.mesh.material.emissive.setHex(0x33ff33);
		this.resetMaterialTick = 10;
	}

	tick() {
		if (this.resetMaterialTick > 0) {
			this.resetMaterialTick--;
			if (this.resetMaterialTick == 0) {
				this.mesh.material.emissive.setHex(0xff0000);
			}
		}
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
		if (this.ticks > PROJ_TICK_LIFETIME) {
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
		const path = `../geo/${name}.stl`;
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

	// HUD
	const hud = $('#hud-canvas');
	const ctx = hud.getContext('2d');
	const speedBar = new Bar({
		label: new Label({
			text: 'Speed', 
			font: '20px Arial', 
			x: 10, 
			y: canvas.height - 40,
		}),
		x: 10,
		y: canvas.height - 30,
		width: 200,
		height: 20,
		min: MIN_SPEED,
		max: MAX_SPEED,
		incr: true,
		value: START_SPEED,
	});
	const healthBar = new Bar({
		label: new Label({
			text: 'Health', 
			font: '20px Arial', 
			x: 240, 
			y: canvas.height - 40,
		}),
		x: 240,
		y: canvas.height - 30,
		width: 200,
		height: 20,
		min: 0,
		max: HUMBER_INIT_HEALTH,
		incr: true,
		value: HUMBER_INIT_HEALTH,
	});
	const humberList = new HumberList({
		label: new Label({
			text: 'Humbers Acquired', 
			font: '20px Arial', 
			x: 10, 
			y: 30,
		}),
		x: 10,
		y: 60,
		font: '24px HunimalSans',
		checkerFn: (humbers, idx) => {
			return humbers[idx] % 2 == 0;
		},
		goal: 10,
	});

	// Actors
	const humbers = [];
	const projectiles = [];
	
	// Keyboard
	const keyDownMap = {
		w: false,
		a: false,
		s: false,
		d: false,
		' ': false,
		ArrowUp: false,
		ArrowDown: false,
	}
	
	// Navigation
	function rotateUp(down) {
		const cameraFwd = cameraTarget.clone();
		cameraFwd.sub(camera.position);
		cameraFwd.multiplyScalar(1/cameraFwd.length());

		const mult = down ? -1 : 1;
				
		cameraFwd.applyAxisAngle(cameraSide, -Math.PI/TURN_DIV*mult);
		cameraTarget = camera.position.clone().add(cameraFwd);
		camera.lookAt(cameraTarget);
		cameraUp.applyAxisAngle(cameraSide, -Math.PI/TURN_DIV*mult);
	}
	
	function rotateLeft(right) {
		const cameraFwd = cameraTarget.clone();
		cameraFwd.sub(camera.position);
		cameraFwd.multiplyScalar(1/cameraFwd.length());

		const mult = right ? -1 : 1;

		cameraFwd.applyAxisAngle(cameraUp, Math.PI/TURN_DIV*mult);
		cameraTarget = camera.position.clone().add(cameraFwd);
		camera.lookAt(cameraTarget);
		cameraSide.applyAxisAngle(cameraUp, Math.PI/TURN_DIV*mult);
	}


	// Animation loop
	let added = false;
	let speed = START_SPEED;
	let paused = false;
	let projCooldown = 0;

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
			// Tick projectiles
			for (let i=0; i<projectiles.length; i++) {
				const p = projectiles[i];
				if (p.remove) {
					projectiles.splice(i, 1);
					i--;
					continue;
				} 
				p.tick();
			}

			// Tick humbers
			for (let i=0; i<humbers.length; i++) {
				const h = humbers[i];
				if (h.remove) {
					humbers.splice(i, 1);
					i--;
					h.mesh.geometry.dispose();
					h.mesh.material.dispose();
					h.mesh.parent.remove(h.mesh);
					// Update score
					humberList.humbers.push(h.ab);
					continue;
				}
				h.tick();
			}

			// Check for collisions with projectiles
			for (let i=0; i<projectiles.length; i++) {
				const p = projectiles[i];
				for (let j=0; j<humbers.length; j++) {
					const h = humbers[j];
					if (p.mesh.position.distanceTo(h.mesh.position) < 2.5) {
						if (p.mesh.parent) {
							p.mesh.geometry.dispose();
							p.mesh.material.dispose();
							p.mesh.parent.remove(p.mesh);
						}
						p.remove = true;
						h.hit();
						if (h.health <= 0) {
							h.remove = true;
						}
					}
				}
			}

			// Housekeeping
			if (projCooldown > 0) projCooldown--;

			// Take keyboard events
			if (keyDownMap['w']) {
				rotateUp();
			}
			if (keyDownMap['s']) {
				rotateUp(true);
			}
			if (keyDownMap['a']) {
				rotateLeft();
			}
			if (keyDownMap['d']) {
				rotateLeft(true);
			}
			if (keyDownMap['ArrowUp']) {
				speed += 1;
				if (speed > MAX_SPEED) speed = MAX_SPEED;
				speedBar.value = speed;
			}
			if (keyDownMap['ArrowDown']) {
				speed -= 1;
				if (speed < MIN_SPEED) speed = MIN_SPEED;
				speedBar.value = speed;
			}
			if (keyDownMap[' ']) {
				if (projCooldown <= 0) {
					const cameraDown = cameraUp.clone();
					cameraDown.negate();
					cameraDown.add(camera.position);
					const cameraFwd = cameraTarget.clone();
					cameraFwd.sub(camera.position);
					cameraFwd.multiplyScalar(1/cameraFwd.length());
					const projTickVec = cameraFwd.clone();
					projTickVec.multiplyScalar(PROJ_SPEED_MULT);
					const proj = new Projectile(cameraDown, projTickVec, scene);
					projectiles.push(proj);
					projCooldown = PROJ_COOLDOWN;
				}
			}

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

		// Draw the crosshair
		ctx.clearRect(0, 0, hud.width, hud.height);

		ctx.strokeStyle = 'white';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(canvas.width/2, canvas.height/2-15);
		ctx.lineTo(canvas.width/2, canvas.height/2+15);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(canvas.width/2-15, canvas.height/2);
		ctx.lineTo(canvas.width/2+15, canvas.height/2);
		ctx.stroke();

		speedBar.draw(ctx);
		healthBar.draw(ctx);
		humberList.draw(ctx);
	}

	renderer.setAnimationLoop(animate);

	document.addEventListener('keydown', e => {
		// Don't want to have input while paused
		// But also want the ability to unpause
		if (paused) {
			if (e.key === 'p') {
				paused = false;
			}
			return;
		}
		if (e.key == 'p') {
			paused = true;
		}
		// Regular keyboard inputs
		keyDownMap[e.key] = true;
	});

	document.addEventListener('keyup', e => {
		keyDownMap[e.key] = false;
	});

});
