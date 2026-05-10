const $ = q => document.querySelector(q);
const $$ = q => [...document.querySelectorAll(q)];

window.addEventListener('load', () => {
	const canvas = $('#ground-canvas');
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#333399';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (let x=0; x<canvas.width; x += canvas.width/128) {
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.strokeStyle = 'white';
		ctx.stroke();
	}

	for (let y=0; y<canvas.height; y += canvas.height/128) {
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.strokeStyle = 'white';
		ctx.stroke();
	}
});
