const $ = q => document.querySelector(q);
const $$ = q => [...document.querySelectorAll(q)];

window.addEventListener('load', () => {
	const top = $('#top');
	const sideSun = $('#side-sun');
	const sideLeft = $('#side-left');
	const sideRight = $('#side-right');
	const bottom = $('#bottom');

	function drawStars(canvas) {
		const ctx = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;

		// Big stars
		for (let i=0; i<20; i++) {
			const x = Math.random() * width;
			const y = Math.random() * height;
			const radius = Math.random() * 2 + 2;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2 * Math.PI);
			ctx.fillStyle = 'white';
			ctx.fill();
		}

		// Small stars
		for (let i=0; i<50; i++) {
			const x = Math.random() * width;
			const y = Math.random() * height;
			const radius = Math.random() * 1 + 1;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2 * Math.PI);
			ctx.fillStyle = 'white';
			ctx.fill();
		}
		
	}

	let ctx = sideSun.getContext('2d');
	// Draw sun below horizon
	let grd = ctx.createRadialGradient(
		top.width / 2, 
		top.height + 200, 
		100, 
		top.width / 2, 
		top.height + 200, 
		top.height + 200
	);

	grd.addColorStop(0, 'white');
	grd.addColorStop(0.1, '#ffcccc');
	grd.addColorStop(1, '#111133');
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, top.width, top.height);

	// Top solid color
	ctx = top.getContext('2d');
	ctx.fillStyle = '#111133';
	ctx.fillRect(0, 0, top.width, top.height);

	// Sides continue sun gradient
	// Left
	ctx = sideLeft.getContext('2d');
	grd = ctx.createRadialGradient(
		sideLeft.width * 1.5,
		sideLeft.height + 200,
		100,
		sideLeft.width * 1.5,
		sideLeft.height + 200,
		sideLeft.height + 200
	);
	grd.addColorStop(0, 'white');
	grd.addColorStop(0.1, '#ffcccc');
	grd.addColorStop(1, '#111133');
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, sideLeft.width, sideLeft.height);

	// Right
	ctx = sideRight.getContext('2d');
	grd = ctx.createRadialGradient(
		-sideRight.width * 0.5,
		sideRight.height + 200,
		100,
		-sideRight.width * 0.5,
		sideRight.height + 200,
		sideRight.height + 200
	);
	grd.addColorStop(0, 'white');
	grd.addColorStop(0.1, '#ffcccc');
	grd.addColorStop(1, '#111133');
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, sideRight.width, sideRight.height);

	// Bottom
	ctx = bottom.getContext('2d');
	ctx.fillStyle = '#111133';
	ctx.fillRect(0, 0, bottom.width, bottom.height);

	drawStars(top);
	drawStars(sideSun);
	drawStars(sideLeft);
	drawStars(sideRight);
	/*drawStars(sideDark);
	drawStars(bottom);*/
});
