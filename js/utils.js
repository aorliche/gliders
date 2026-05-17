export { $, $$, randInt, randFloat, chooseRandom, rotateAboutPoint };

const $ = q => document.querySelector(q);
const $$ = q => [...document.querySelectorAll(q)];

// https://stackoverflow.com/questions/42812861/three-js-pivot-point
// obj - your object (THREE.Object3D or derived)
// point - the point of rotation (THREE.Vector3)
// axis - the axis of rotation (normalized THREE.Vector3)
// theta - radian value of rotation
// pointIsWorld - boolean indicating the point is in world coordinates (default = false)
function rotateAboutPoint(obj, point, axis, theta, pointIsWorld = false){

	if(pointIsWorld){
		obj.parent.localToWorld(obj.position); // compensate for world coordinate
	}

	obj.position.sub(point); // remove the offset
	obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
	obj.position.add(point); // re-add the offset

	if(pointIsWorld){
		obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
	}

	obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

function randInt(from, to) {
	const diff = to-from+1;
	return from + Math.floor(Math.random()*diff);
}

function randFloat(from, to) {
	const diff = to-from+1;
	return from + Math.random()*diff;
}

function chooseRandom(array) {
	return array[randInt(0, array.length-1)];
}
