// Functions for drawing the hud
export {Label, Bar, HumberList, CounterLabel, Button, DamageOverlay};

class Label {
	constructor(params) {
		this.text = params.text;
		this.font = params.font;
		this.x = params.x;
		this.y = params.y;
		this.color = params.color ?? 'white';
	}

	draw(ctx) {
		ctx.font = this.font;
		ctx.fillStyle = this.color;
		ctx.fillText(this.text, this.x, this.y);
	}
}

class CounterLabel extends Label {
	constructor(params) {
		super(params);
		this.baseText = this.text;
		this._count = params.count ?? 0;
		this.makeText();
	}

	get count() {
		return this._count;
	}

	set count(val) {
		this._count = val;
		this.makeText();
	}

	makeText() {
		this.text = this.baseText + " " + this._count.toString();
	}
}

class Button {
	constructor(params) {
		this.label = params.label;
		this.labelColorSav = this.label.color;
		this.color = params.color;
		this.colorSav = this.color;
		this.x = params.x;
		this.y = params.y;
		this.w = params.w;
		this.h = params.h;
		this.click = params.click;
		this.hovering = false;
	}

	mousemove(p) {
		if (p.x < this.x || 
			p.x > this.x + this.w || 
			p.y < this.y ||
			p.y > this.y + this.h) {
			if (this.hovering) {
				this.mouseout();
			}
		} else {
			this.label.color = this.colorSav;
			this.color = this.labelColorSav;
			this.hovering = true;
		}
	}

	mouseout(p) {
		this.label.color = this.labelColorSav;
		this.color = this.colorSav;
	}

	draw(ctx) {
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x, this.y, this.w, this.h);
		ctx.strokeStyle = this.label.color;
		ctx.strokeRect(this.x, this.y, this.w, this.h);
		this.label.draw(ctx);
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

class DamageOverlay {
	constructor(params) {
		this.w = params.w;
		this.h = params.h;
		this.len = params.len;
		this.cooldown = params.cooldown ?? 0;
	}

	draw(ctx) {
		if (this.cooldown <= 0) {
			return;
		}

		const g1 = ctx.createLinearGradient(0, this.h/2, this.len, this.h/2);
		const g2 = ctx.createLinearGradient(this.w, this.h/2, this.w-this.len, this.h/2);
		const g3 = ctx.createLinearGradient(this.w/2, 0, this.w/2, this.len);
		const g4 = ctx.createLinearGradient(this.w/2, this.h, this.w/2, this.h-this.len);

		[g1, g2, g3, g4].forEach(g => {
			g.addColorStop(0, "rgba(255,0,0,0.5)");
			g.addColorStop(1, "transparent");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, this.w, this.h);
		});
	}

	tick() {
		if (this.cooldown > 0) {
			this.cooldown--;
		}
	}
}
