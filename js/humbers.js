import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { $, $$, rotateAboutPoint, randInt, randFloat, chooseRandom } from './utils.js';
import { Label, Bar, HumberList, CounterLabel, Button, DamageOverlay } from './hud.js';
import { Sounds } from './sounds.js';

// Constants
const HUMBER_SPIN_DIV = 400;
const TURN_DIV = 200;
const SPEED_MULT = 0.01;
const START_SPEED = 5;
const MIN_SPEED = 2;
const MAX_SPEED = 20;
const PROJ_COOLDOWN = 10;
const PROJ_TICK_LIFETIME = 500;
const PROJ_SPEED_MULT = 0.5;
const HUMBER_INIT_HEALTH = 10;
const GLIDER_INIT_HEALTH = 5;
const GLIDER_SPEED_MULT = 0.1;
const GLIDER_TURN_DIV = 500;
const GLIDER_COOLDOWN = 100;
const PLAYER_INIT_HEALTH = 20;
const HEAL_INCREMENT = 5;

// Enemy
class Glider {
	constructor(geometries, x, y, z, scene) {
		const geom = geometries['Glider'].clone();
		const material = new THREE.MeshPhongMaterial({
			emissive: 0x8833ff,
		});
		this.mesh = new THREE.Mesh(geom, material);
		this.mesh.position.set(x, y, z);
		scene.add(this.mesh);
		const theta = randFloat(-Math.PI, Math.PI);
		rotateAboutPoint(
			this.mesh,
			this.mesh.position.clone(),
			new THREE.Vector3(0, 1, 0),
			theta,
		);
		// Create the forward vector as a mesh that can be rotated
		const forward = new THREE.Vector3(1, 0, 0);
		forward.add(this.mesh.position);
		const forwardGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
		const forwardMaterial = new THREE.MeshBasicMaterial({});
		this.forwardMesh = new THREE.Mesh(forwardGeom, forwardMaterial);
		this.forwardMesh.position.set(forward.x, forward.y, forward.z);
		rotateAboutPoint(
			this.forwardMesh,
			this.mesh.position.clone(),
			new THREE.Vector3(0, 1, 0),
			theta,
		);
		this.defaultTurnAngle = Math.random() > 0.5 ? 1 : -1;
		this.defaultTurnAngle *= Math.PI/GLIDER_TURN_DIV;
		// Stats
		this.health = GLIDER_INIT_HEALTH;
		this.attacking = false;
		this.cooldown = 0;
		this.resetMaterialTick = 0;
	}

	hit() {
		this.health--;
		this.mesh.material.emissive.setHex(0x33ff33);
		this.resetMaterialTick = 10;
	}

	// Rotate X tilts on its side (never use)
	// Rotate Y rotates around (patrolling)
	// Rotate Z tilts up and down (positive = tilt up) (not used)
	// Actually none of these are used
	// Turn about local Y axis unless attacking the player, in which case go straight
	tick() {
		const fwd = this.forwardMesh.position.clone();
		const pos = this.mesh.position.clone();
		fwd.sub(pos);
		fwd.multiplyScalar(1/fwd.length());
		fwd.multiplyScalar(GLIDER_SPEED_MULT);
		this.mesh.position.add(fwd);
		this.forwardMesh.position.add(fwd);
		// Turn
		if (!this.attacking) {
			rotateAboutPoint(
				this.mesh,
				this.mesh.position.clone(),
				new THREE.Vector3(0, 1, 0),
				this.defaultTurnAngle,
			)
			rotateAboutPoint(
				this.forwardMesh,
				this.mesh.position.clone(),
				new THREE.Vector3(0, 1, 0),
				this.defaultTurnAngle,
			)
		}
		if (this.cooldown > 0) {
			this.cooldown--;
		}
		if (this.resetMaterialTick > 0) {
			this.resetMaterialTick--;
			if (this.resetMaterialTick == 0) {
				this.mesh.material.emissive.setHex(0x8833ff);
			}
		}
	}
}

class PigFace {
	constructor(geometries, x, y, z, scene) {
		const geom = geometries['PigFace'];
		const material = new THREE.MeshPhongMaterial({
			emissive: 0xff0000,
		});
		this.mesh = new THREE.Mesh(geom, material);
		this.mesh.position.set(x, y, z);
		scene.add(this.mesh);
		this.health = HUMBER_INIT_HEALTH;
	}

	hit() {
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

class Humber {
	constructor(a, b, geometries, x, y, z, scene) {
		this.a = parseInt(a);
		this.b = parseInt(b);
		this.ab = this.a*10 + this.b;
		this.x = x; // not used... I think...
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
		this.resetMaterialTick = 0;
	}

	hit() {
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
	constructor(p, dp, scene, fromPlayer) {
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
		this.fromPlayer = fromPlayer ?? false;
	}

	tick() {
		this.p.add(this.dp);
		this.mesh.position.set(this.p.x, this.p.y, this.p.z);
		this.ticks++;
		if (this.ticks > PROJ_TICK_LIFETIME && this.mesh.parent) {
			this.mesh.geometry.dispose();
			this.mesh.material.dispose();
			this.mesh.parent.remove(this.mesh);
			this.remove = true;
		}
	}
}

class Level {
	constructor(params) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		ctx.font = '36px Arial';
		const tm = ctx.measureText(params.text);
		this.label = new Label({
			text: params.text, 
			x: params.width/2 - tm.width/2, 
			y: params.y,
			font: '36px Arial',
		});
		this.checkerFn = params.checkerFn;
		this.spawnerFn = params.spawnerFn;
		this.goal = params.goal;
	}

	draw(ctx) {
		this.label.draw(ctx);
	}
}

class DeadLabel {
	constructor(params) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		ctx.font = '36px Arial';
		const tm = ctx.measureText(params.text);
		this.label = new Label({
			text: params.text, 
			x: params.width/2 - tm.width/2, 
			y: params.y,
			font: '36px Arial',
		});
	}

	draw(ctx) {
		this.label.draw(ctx);
	}
}

const fibs = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 27, 29, 31, 37, 41, 43, 47, 51, 53, 
	57, 59, 61, 67, 71, 73, 79, 83, 87, 89, 91, 97];
const powersOfTwo = [1, 2, 4, 8, 16, 32, 64];
const triangulars = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91];
const fourFactors = [16, 24, 32, 36, 40, 48, 54, 56, 60, 64, 72, 80, 81, 84, 88, 90, 96, 98];

const levelStore = {
	'even': new Level({
		text: 'Acquire 10 Even Humbers',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			return humbers[idx] % 2 == 0;
		},
		spawnerFn: (humbers, geometries, scene) => {
			const a = randInt(0, 9).toString();
			const b = randInt(0, 9).toString();
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
	'odd': new Level({
		text: 'Acquire 10 Odd Humbers',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			return humbers[idx] % 2 == 1;
		},
		spawnerFn: (humbers, geometries, scene) => {
			const a = randInt(0, 9).toString();
			const b = randInt(0, 9).toString();
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
	'perfectSquares': new Level({
		text: 'Acquire 10 Perfect Squares',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			const humb = humbers[idx];
			const sqrt = Math.round(Math.sqrt(humb));
			return sqrt*sqrt == humb;
		},
		spawnerFn: (humbers, geometries, scene) => {
			let a,b;
			// Perfect square
			if (Math.random() > 0.5) {
				const n = randInt(0, 9);
				const nn = n*n;
				a = Math.floor(nn/10).toString();
				b = (nn%10).toString();
			// Random number
			} else {
				a = randInt(0, 9).toString();
				b = randInt(0, 9).toString();
			}
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
	'primes': new Level({
		text: 'Acquire 10 Primes',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			const humb = humbers[idx];
			return primes.includes(humb);
		},
		spawnerFn: (humbers, geometries, scene) => {
			let a,b;
			// Prime
			if (Math.random() > 0.5) {
				const n = chooseRandom(primes);
				a = Math.floor(n/10).toString();
				b = (n%10).toString();
			// Random number
			} else {
				a = randInt(0, 9).toString();
				b = randInt(0, 9).toString();
			}
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
	'fibs': new Level({
		text: 'Acquire 10 Fibonacci Numbers',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			const humb = humbers[idx];
			return fibs.includes(humb);
		},
		spawnerFn: (humbers, geometries, scene) => {
			let a,b;
			// Fibonacci
			if (Math.random() > 0.5) {
				const n = chooseRandom(fibs);
				a = Math.floor(n/10).toString();
				b = (n%10).toString();
			// Random number
			} else {
				a = randInt(0, 9).toString();
				b = randInt(0, 9).toString();
			}
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
	'powersOfTwo': new Level({
		text: 'Acquire 10 Powers of Two',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			const humb = humbers[idx];
			return powersOfTwo.includes(humb);
		},
		spawnerFn: (humbers, geometries, scene) => {
			let a,b;
			// Power of two
			if (Math.random() > 0.5) {
				const n = chooseRandom(powersOfTwo);
				a = Math.floor(n/10).toString();
				b = (n%10).toString();
			// Random number
			} else {
				a = randInt(0, 9).toString();
				b = randInt(0, 9).toString();
			}
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
	triangulars: new Level({
		text: 'Acquire 10 Triangular Numbers',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			const humb = humbers[idx];
			return triangulars.includes(humb);
		},
		spawnerFn: (humbers, geometries, scene) => {
			let a,b;
			// Triangular
			if (Math.random() > 0.5) {
				const n = chooseRandom(triangulars);
				a = Math.floor(n/10).toString();
				b = (n%10).toString();
			// Random number
			} else {
				a = randInt(0, 9).toString();
				b = randInt(0, 9).toString();
			}
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
	fourFactors: new Level({
		text: 'Acquire 10 Numbers With Four Prime Factors',
		width: 1000,
		y: 100,
		checkerFn: (humbers, idx) => {
			const humb = humbers[idx];
			return fourFactors.includes(humb);
		},
		spawnerFn: (humbers, geometries, scene) => {
			let a,b;
			// Four factors
			if (Math.random() > 0.5) {
				const n = chooseRandom(fourFactors);
				a = Math.floor(n/10).toString();
				b = (n%10).toString();
			// Random number
			} else {
				a = randInt(0, 9).toString();
				b = randInt(0, 9).toString();
			}
			const x = randFloat(-200, 200);
			const y = randFloat(-20, 20);
			const z = randFloat(-200, 200);
			const humb = new Humber(a, b, geometries, x, y, z, scene);
			return humb;
		},
		goal: 10,
	}),
};

const levels = [
	levelStore['even'], 
	levelStore['odd'],
	levelStore['perfectSquares'],
	levelStore['primes'],
	levelStore['fibs'],
	levelStore['powersOfTwo'],
	levelStore['triangulars'],
	levelStore['fourFactors'],
];

window.addEventListener('load', e => {
	// Load sounds
	const sounds = new Sounds();
	sounds.load('blaster', './../sound/blaster.wav');
	sounds.load('explosion', './../sound/explosion.wav');
	sounds.load('crash', './../sound/crash.mp3');

	// Load geometries
	const loader = new STLLoader();
	let numModels = 0;
	let geometriesLoaded = 0;

	const geoKeys = [...Array(10).keys()].map(n => {
		return n.toString();
	});
	geoKeys.push('PigFace');
	geoKeys.push('Glider');
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

	// Level
	let levelIdx = 0;

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
		min: 1,
		max: PLAYER_INIT_HEALTH,
		incr: true,
		value: PLAYER_INIT_HEALTH,
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
			return levels[levelIdx].checkerFn(humbers, idx);
		},
		goal: levels[levelIdx].goal,
	});
	const gliderKills = new CounterLabel({
		text: 'Gliders Killed: ',
		font: '20px Arial',
		x: 820,
		y: canvas.height - 20,
		count: 0,
	});
	const levelLabel = new CounterLabel({
		text: 'Level: ',
		font: '20px Arial',
		x: 710,
		y: canvas.height - 20,
		count: 1,
	});
	const nextLevelButton = new Button({
		label: new Label({
			text: 'Next Level',
			font: '20px Arial',
			x: 880,
			y: 33,
			color: 'white',
		}),
		color: '#8888ff',
		x: 872,
		y: 10,
		w: 112,
		h: 35,
		click: (p) => {
			if (p.x < nextLevelButton.x || 
				p.x > nextLevelButton.x + nextLevelButton.w || 
				p.y < nextLevelButton.y ||
				p.y > nextLevelButton.y + nextLevelButton.h) {
				return;
			}
			nextLevel();
		},
	});
	const pauseButton = new Button({
		label: new Label({
			text: 'Pause',
			font: '20px Arial',
			x: 780,
			y: 33,
			color: 'white',
		}),
		color: '#ff6666',
		x: 763,
		y: 10,
		w: 95,
		h: 35,
		click: (p) => {
			if (p.x < pauseButton.x || 
				p.x > pauseButton.x + pauseButton.w || 
				p.y < pauseButton.y ||
				p.y > pauseButton.y + pauseButton.h) {
				return;
			}
			if (!paused) {
				paused = true;
				pauseButton.label.text = 'Unpause';
				pauseButton.label.x = 770;
			} else {
				paused = false;
				pauseButton.label.text = 'Pause';
				pauseButton.label.x = 780;
			}
		},
	});
	const playAudioButton = new Button({
		label: new Label({
			text: 'Stop Audio',
			font: '20px Arial',
			x: 640,
			y: 33,
			color: 'white',
		}),
		color: '#ff6666',
		x: 630,
		y: 10,
		w: 118,
		h: 35,
		click: (p) => {
			if (p.x < playAudioButton.x || 
				p.x > playAudioButton.x + playAudioButton.w || 
				p.y < playAudioButton.y ||
				p.y > playAudioButton.y + playAudioButton.h) {
				return;
			}
			if (playingAudio) {
				playAudioButton.label.text = 'Play Audio';
				playingAudio = false;
			} else {
				playAudioButton.label.text = 'Stop Audio';
				playingAudio = true;
			}
		}
	});
	const damageOverlay = new DamageOverlay({
		w: canvas.width,
		h: canvas.height,
		len: 100,
		cooldown: 0,
	});
	const deadLabel = new DeadLabel({
		text: 'You have died!',
		width: 1000,
		y: 250,
	});
	const playAgainButton = new Button({
		label: new Label({
			text: 'Play Again',
			font: '28px Arial',
			x: 430,
			y: 300,
			color: 'white',
		}),
		color: '#8888ff',
		x: 422,
		y: 270,
		w: 150,
		h: 40,
		click: (p) => {
			if (p.x < playAgainButton.x || 
				p.x > playAgainButton.x + playAgainButton.w || 
				p.y < playAgainButton.y ||
				p.y > playAgainButton.y + playAgainButton.h) {
				return;
			}
			dead = false;
			healthBar.value = PLAYER_INIT_HEALTH;
			levelIdx = levels.length-1;
			nextLevel();
			damageOverlay.cooldown = 0;
			gliderKills.count = 0;
		}
	});

	// Actors
	let humbers = [];
	const projectiles = [];
	const gliders = [];
	const faces = [];

	// Keyboard
	// We don't necessarily have to init every key that is paid attention to
	// For example 'p': pause
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

	function nextLevel() {
		levelIdx = (levelIdx+1) % levels.length;
		levelLabel.count = levelIdx+1;
		humberList.humbers = [];
		humberList.goal = levels[levelIdx].goal;
		// Re-initialize humbers according to new level
		humbers.forEach(h => {
			h.mesh.geometry.dispose();
			h.mesh.material.dispose();
			h.mesh.parent.remove(h.mesh);
		});
		humbers = [];
		for (let i=0; i < 40; i++) {
			const humb = levels[levelIdx].spawnerFn(humbers, geometries, scene);
			humbers.push(humb);
		}
	}

	// Animation loop
	let added = false;
	let speed = START_SPEED;
	let paused = false;
	let projCooldown = 0;
	let dead = false;
	let playingAudio = true;

	function animate(time) {
		if (!isLoaded()) {
			return;
		}
		if (!added) {
			// Add gliders
			for (let i=0; i<15; i++) {
				const glider = new Glider(
					geometries,
					randFloat(-200, 200),
					randFloat(-20, 20),
					randFloat(-200, 200),
					scene,
				);
				gliders.push(glider);
			}

			// Initial humbers
			for (let i=0; i < 40; i++) {
				const humb = levels[levelIdx].spawnerFn(humbers, geometries, scene);
				humbers.push(humb);
			}

			// Initial pig faces
			for (let i=0; i < 15; i++) {
				const face = new PigFace(
					geometries, 
					randFloat(-200, 200),
					randFloat(-20, 20),
					randFloat(-200, 200),
					scene,
				);
				faces.push(face);
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
		if (!paused && !dead) {
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
					// Play sound
					if (playingAudio) {
						sounds.play('explosion');
					}
					// Create another humber
					const humb = levels[levelIdx].spawnerFn(humbers, geometries, scene);
					humbers.push(humb);
					// Update score
					humberList.humbers.push(h.ab);
					// Update level
					if (humberList.correct == humberList.goal) {
						nextLevel();
						break;
					}
					continue;
				}
				h.tick();
			}

			// Tick Pig Faces
			for (let i=0; i<faces.length; i++) {
				const f = faces[i];
				if (f.remove) {
					faces.splice(i, 1);
					i--;
					f.mesh.geometry.dispose();
					f.mesh.material.dispose();
					f.mesh.parent.remove(f.mesh);
					// Play sound
					if (playingAudio) {
						sounds.play('explosion');
					}
					// Create another face
					const face = new PigFace(
						geometries, 
						randFloat(-200, 200),
						randFloat(-20, 20),
						randFloat(-200, 200),
						scene,
					);
					faces.push(face);
					continue;
				}
				f.tick();
			}

			// Tick gliders
			for (let i=0; i<gliders.length; i++) {
				const g = gliders[i];
				g.tick();
				// Check remove
				if (g.remove) {
					gliders.splice(i, 1);
					i--;
					g.mesh.geometry.dispose();
					g.mesh.material.dispose();
					g.mesh.parent.remove(g.mesh);
					g.forwardMesh.geometry.dispose();
					g.forwardMesh.material.dispose();
					// g.forwardMesh is not added to scene
					// Create a new glider
					const glider = new Glider(
						geometries,
						randFloat(-200, 200),
						randFloat(-20, 20),
						randFloat(-200, 200),
						scene,
					);
					gliders.push(glider);
					// Explode
					if (playingAudio) {
						sounds.play('explosion');
					}
					continue;
				}
				// Fire if facing player
				// Glider forward unit vector
				const gliderFwd = g.forwardMesh.position.clone();
				gliderFwd.sub(g.mesh.position);
				gliderFwd.multiplyScalar(1/gliderFwd.length());
				// Player forward unit vector
				const cameraFwd = cameraTarget.clone();
				cameraFwd.sub(camera.position);
				cameraFwd.multiplyScalar(1/cameraFwd.length()); 
				// Vector from player to glider
				const gliderPos = g.mesh.position.clone();
				gliderPos.sub(camera.position);
				gliderPos.multiplyScalar(1/gliderPos.length());
				// Dot products
				// Gliders will only shoot when you are facing them and they are facing you
				const facingDot = gliderFwd.dot(cameraFwd);
				const posDot = gliderFwd.dot(gliderPos);
				if (facingDot < -0.8 && posDot < -0.8) {
					g.attacking = true;
					// Fire projectile
					// Note negative sign
					if (g.cooldown == 0) {
						const projTickVec = gliderPos.clone();
						projTickVec.multiplyScalar(-PROJ_SPEED_MULT);
						const proj = new Projectile(
							g.mesh.position.clone(), 
							projTickVec, 
							scene, 
							false
						);
						projectiles.push(proj);
						g.cooldown = GLIDER_COOLDOWN;
						// play sound
						if (playingAudio) {
							sounds.play('blaster');
						}
					}
				} else {
					g.attacking = false;
				}
			}

			// Check for collisions with projectiles
			for (let i=0; i<projectiles.length; i++) {
				const p = projectiles[i];
				if (p.fromPlayer) {
					// Pig faces
					for (let j=0; j<faces.length; j++) {
						const f = faces[j];
						if (p.mesh.position.distanceTo(f.mesh.position) < 2.5) {
							if (p.mesh.parent) {
								p.mesh.geometry.dispose();
								p.mesh.material.dispose();
								p.mesh.parent.remove(p.mesh);
							}
							p.remove = true;
							f.hit();
							if (f.health <= 0) {
								f.remove = true;
								healthBar.value += HEAL_INCREMENT;
								if (healthBar.value > healthBar.max) {
									healthBar.value = healthBar.max;
								}
							}
						}
					}
					// Humbers
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
					// Gliders
					for (let j=0; j<gliders.length; j++) {
						const g = gliders[j];
						if (p.mesh.position.distanceTo(g.mesh.position) < 2.5) {
							if (p.mesh.parent) {
								p.mesh.geometry.dispose();
								p.mesh.material.dispose();
								p.mesh.parent.remove(p.mesh);
							}
							p.remove = true;
							g.hit();
							if (g.health <= 0) {
								g.remove = true;
								gliderKills.count++;
							}
						}
					}
				} else {
					// From gliders
					if (p.mesh.position.distanceTo(camera.position) < 2) {
						if (p.mesh.parent) {
							p.mesh.geometry.dispose();
							p.mesh.material.dispose();
							p.mesh.parent.remove(p.mesh);
						}
						p.remove = true;
						healthBar.value--;
						if (healthBar.value == 0) {
							dead = true;
						}
						// Display to user
						damageOverlay.cooldown = 20;
						// Sound
						if (playingAudio) {
							sounds.play('crash');
						}
					}
				}
			}

			// Tick damage overlay
			damageOverlay.tick();

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
					const proj = new Projectile(cameraDown, projTickVec, scene, true);
					projectiles.push(proj);
					projCooldown = PROJ_COOLDOWN;
					// Play blaster
					if (playingAudio) {
						sounds.play('blaster');
					}
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

		damageOverlay.draw(ctx); // should go first
		speedBar.draw(ctx);
		healthBar.draw(ctx);
		humberList.draw(ctx);
		levels[levelIdx].draw(ctx);
		gliderKills.draw(ctx);
		levelLabel.draw(ctx);
		nextLevelButton.draw(ctx);
		pauseButton.draw(ctx);
		playAudioButton.draw(ctx);

		if (dead) {
			deadLabel.draw(ctx);
			playAgainButton.draw(ctx);
		}
	}

	renderer.setAnimationLoop(animate);

	document.addEventListener('keydown', e => {
		// Don't want to have input while paused
		// But also want the ability to unpause
		if (paused) {
			if (e.key === 'p') {
				//paused = false;
				pauseButton.click({x: pauseButton.x+1, y: pauseButton.y+1});
			}
			return;
		}
		if (e.key == 'p') {
			//paused = true;
			pauseButton.click({x: pauseButton.x+1, y: pauseButton.y+1});
		}
		// Regular keyboard inputs
		keyDownMap[e.key] = true;
	});

	document.addEventListener('keyup', e => {
		keyDownMap[e.key] = false;
	});

	canvas.addEventListener('click', e => {
		const p = {x: e.offsetX, y: e.offsetY};
		pauseButton.click(p);
		playAudioButton.click(p);
		if (dead) {
			playAgainButton.click(p);
		} else {
			nextLevelButton.click(p);
		}
	});

	canvas.addEventListener('mousemove', e => {
		const p = {x: e.offsetX, y: e.offsetY};
		nextLevelButton.mousemove(p);
		pauseButton.mousemove(p);
		playAudioButton.mousemove(p);
		if (dead) {
			playAgainButton.mousemove(p);
		}
	});

	canvas.addEventListener('mouseout', () => {
		nextLevelButton.mouseout();
		pauseButton.mouseout();
		playAudioButton.mouseout();
		playAgainButton.mouseout();
	});

});
