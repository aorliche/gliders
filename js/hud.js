// Functions for drawing the hud
export {Label, Bar, HumberList};

class Label {
	constructor(params) {
		this.text = params.text;
		this.font = params.font;
		this.x = params.x;
		this.y = params.y;
	}

	draw(ctx) {
		ctx.font = this.font;
		ctx.fillStyle = 'white';
		ctx.fillText(this.text, this.x, this.y);
	}
}

class Bar {
	constructor(params) {
		this.label = params.label;
		this.x = params.x;
		this.y = params.y;
		this.width = params.width;
		this.height = params.height;
		this.min = params.min;
		this.max = params.max;
		this.incr = params.incr ?? null;
		this.value = params.value;
	}

	draw(ctx) {
		this.label.draw(ctx);
		this.strokeStyle = 'white';
		this.strokeWidth = 1;
		ctx.strokeRect(this.x, this.y, this.width, this.height);

		const x0 = this.x + 2;
		const x1 = this.x + this.width - 2;
		const y0 = this.y + 2;
		const y1 = this.y + this.height - 2;
			
		ctx.fillStyle = 'white';

		if (this.incr) {
			const delta = (x1 - x0) / (this.max - this.min + 1);
			const deltaFilled = delta - 2;

			for (let i = this.min; i <= this.value; i++) {
				const x = x0 + (i - this.min) * delta;
				ctx.fillRect(x, y0, deltaFilled, y1 - y0);
			}
		} else {
			const x = x0 + (this.value - this.min) * (x1 - x0) / (this.max - this.min);
			ctx.fillRect(x0, y0, x - x0, y1 - y0);
		}
	}
}

class HumberList {
	constructor(params) {
		this.label = params.label;
		this.x = params.x;
		this.y = params.y;
		this.font = params.font;
		this.humbers = [];
		this.checkerFn = params.checkerFn;
		this.goal = params.goal;
		this.origText = this.label.text;
	}

	get correct() {
		// Check how many correct humbers we have
		let nCorrect = 0;
		for (let i = 0; i < this.humbers.length; i++) {
			if (this.checkerFn(this.humbers, i)) {
				nCorrect++;
			}
		}
		return nCorrect;
	}

	draw(ctx) {
		this.label.text = `${this.origText} (${this.correct}/${this.goal})`;
		this.label.draw(ctx);
		ctx.font = this.font;
		let x = this.x;
		let y = this.y;
		for (let i = 0; i < this.humbers.length; i++) {
			const humber = this.humbers[i];
			const humberStr = String.fromCodePoint(0x5500 + Math.floor(humber/ 10)*16 + humber % 10);
			if (this.checkerFn(this.humbers, i)) {
				ctx.fillStyle = 'white';
			} else {
				ctx.fillStyle = '#8888ff';
			}
			ctx.fillText(humberStr, x, y);
			const tm = ctx.measureText(humberStr);
			x += tm.width + 5;
		}
	}
}
