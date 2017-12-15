/* global pixCanv, Viper, TinyAnimate, jsfxr */
/* eslint-env browser */
/* eslint-disable eqeqeq, no-sparse-arrays */

Array.prototype.random = function() {
	return this[Math.floor(Math.random() * this.length)];
};
// helper for enabling IE 8 event bindings
function addEvent(el, type, handler) {
	if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler);
}
// live binding helper using matchesSelector
function live(selector, event, callback, context) {
	addEvent(context || document, event, function(e) {
		var found, el = e.target || e.srcElement;
		while (el && el.matches && el !== context && !(found = el.matches(selector))) el = el.parentElement;
		if (found) callback.call(el, e);
	});
}
// naive array comparator:
function arrEq(a1,a2) {
    /* WARNING: arrays must not contain {objects} or behavior may be undefined */
	return JSON.stringify(a1)==JSON.stringify(a2);
}

// Aliases
var d = document;
d.e = d.createElement;
d.q = d.querySelector;
d.qa = d.querySelectorAll;
d.b = d.body;
d.b.c = d.b.classList;
var $ga = d.q("#ga");

// Unicode icons:
//const PIECES = ["🤖","👻","😈","👹","🦄","🐲","🐍","💣","🕸️","🏂"];
const PLANTS = ["🎄","🌲","🌳","🌵"];
//const WEAP = ["🔪","🗡️","🔫","⛏️","⛸️"];
//const FX = ["💥","🔥"];
//const DIRS = ["⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️"];

// Text
const TEXT = {
	"mine": "Mine. If armed, will detonate when anything steps on it.",
	"goblin": "Goblin. Can melee attack one square ahead in the direction he is facing.",
	"fireskull": "Fire Skull. Moves in 2x1 doglegs, jumping over other units to attack its target.",
	"priest": "Priest. Moves only on diagonals. Continues to where you tell him, regardless of enemies.",
	"golem": "Golem. Can move in 4 directions (not diagonals), but only 4 steps. Prefers to stay still and use his machine gun.",
	"necro": "Necromancer. Unlimited movement in 8 directions. Will only kill one enemy per turn.",
	"iceman": "Ice Man. Heavily armoured, he can move or attack 1 square in 8 directions."
};

const COLOURS = [
	"#6B8E23","#7B8E23","#5B8E33","#6B7E13",
	"rgba(130,180,110,0.7)", "rgba(150,180,110,0.7)", "rgba(130,160,110,0.7)"
];

const baseSquad = "mine,mine,iceman,necro,golem,golem,priest,priest,goblin,goblin,goblin,goblin,fireskull,fireskull".split(",");

var cells = [];
var units = [];
var gameMode = null;
var selectedUnit = null;
var depots = {0: [], 1: []};
var guid = 0;

// Sounds
var sounds = {
	click: "1,,0.22,0.46,,0.9,0.86,-0.6,-1,-0.6681,,-1,,,-1,,-0.0014,0.1729,0.95,0.8999,,,0.2367,0.5",
	move: "2,0.26,0.69,0.1216,0.39,0.31,,-0.0999,0.0099,0.79,0.3,-0.949,-0.6922,0.5664,0.23,0.6269,-0.2367,0.2199,0.9831,0.7356,0.3795,0.0111,,0.5",
	slash: "1,,0.0648,,0.2896,0.5191,,-0.3743,,,,,,,,,,,1,,,0.0127,,0.5",
	shoot: "",
	explode: "3,.07,.43,.29,.48,.179,,-.26,,,,,,,,,.1895,.16,1,,,,,.5",
	spawn: "0,0.41,0.35,0.26,0.37,0.54,,-0.62,0.3999,,,-0.4885,,0.29,0.0735,0.8163,0.043,,0.9,0.4399,0.39,0.15,0.813,0.5",

	play: function(name) {
		var player = new Audio();
		player.src = jsfxr(sounds[name].split(",").map(s => parseFloat(s))); // asfxr string must be passed as array
		player.play();
	}
};

function swapClass(old, nu, el) {
	el.classList.remove(old);
	el.classList.add(nu);
}

// eslint-disable-next-line
function endTurn() {
	Board.unHighlight();
	// AI's turn
}

const unwrap = (id) => id.slice(1).split("y").map(n => +n);

class Unit {
	constructor(type, team=0, x=null, y=null) {
		this.type = type;
		this.id = type + guid++;
		this.team = team;
		this.facing = (team == 1) ? 'nn' : 'ss';
		this.x = x;
		this.y = y;
		// DOM element:
		this.el = d.e('i');
		this.el.setAttribute("id", this.id);
		this.el.classList.add(type);
		this.el.classList.add('team'+team);
		this.el.classList.add(this.facing);
		if (team === 0) this._addEventListeners();
		// Register:
		units.push(this);
		depots[this.team].push(this);
		// To board:
		if (x !== null && y !== null) this.placeAt([x,y]);
		this.vMoves = false;

		return this;
	}

	// Wire up the listeners for clicking or hovering this unit:
	_addEventListeners() {
		// Add interaction behaviours:
		this.el.addEventListener('mouseover', () => {
			if (gameMode == 'move') {
				this.vMoves = this.vMoves || this._validMoves();
				Board.highlight(this.vMoves);
			}
		});
		this.el.addEventListener('click', (e) => {
			e.stopPropagation();
			if (gameMode == 'rotate') this.rotate();
			if (gameMode == 'move') {
				selectedUnit = this;
				UI.setMode('move-'+this.id);	// causes highlight to remain
			}
			if (gameMode == 'explode') this.explode();
		});
		this.el.addEventListener('mouseout', () => {
			if (gameMode == 'move') Board.unHighlight();
		});
		return this;
	}

	// Add this unit's [x,y] to each member of an array of points:
	_addTo(points) {
		return points.map(p => [this.x+p[0], this.y+p[1]]);
	}

	// Calculate all valid squares this piece can move to from here:
	_validMoves() {
		// NOTE: inefficient to calc all these options when only 1 or 2 needed for a given type
		var orth4 = this._addTo([[0,1],[1,0],[0,-1],[-1,0]]);
		var diag4 = this._addTo([[1,1],[-1,-1],[1,-1],[-1,1]]);
		var doglegs = this._addTo([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]);
		var orthAll = cells.filter(c => c[0] == this.x || c[1] == this.y);
		var orthAllLtd = orthAll.filter(c => Math.abs(c[0] - this.x) < 4 && Math.abs(c[1] - this.y) < 4);
		var diagAll = cells.filter(c => Math.abs(c[0] - this.x) == Math.abs(c[1] - this.y));

		switch(this.type) {
			case 'mine': return [];
			case 'goblin': return orth4;
			case 'fireskull': return doglegs;
			case 'priest': return diagAll;
			case 'golem': return orthAllLtd;
			case 'necro': return orthAll.concat(diagAll);
			case 'iceman': return orth4.concat(diag4);
		}
	}

	// Put unit in board square:
	placeAt(point) {
		var [x,y] = point;
		d.q("#x"+x+"y"+y).appendChild(this.el);
		this.el.style.opacity = 1;
		sounds.play('spawn');
		this.x = x;
		this.y = y;
		depots[this.team].splice(depots[this.team].indexOf(this),1);

		// Done
		this.vMoves = this._validMoves();
		return this;
	}

	// Animate square-by-square towards destination:
	moveTo(dest) {
		if (this.type == 'fireskull') return this._flyTo(dest);
		// Calculate animation path, must go square by square:
		// Interpolate route:
		var route = Board.findRoute([this.x,this.y], dest);	// BUG
		console.log(route);
		// Walk loop:
		var step = function() {
			if (route.length > 0) this._stepTo(route.shift(), step);
		}.bind(this);
		step();

		// Done
		this.vMoves = this._validMoves();
		return this;
	}

	// Move to an adjacent square:
	// Chain these to move longer distances
	_stepTo(dest, cb) {
		sounds.play('move');
		//Viper({
		//}).start();
		this.placeAt(dest);
		if (cb) setTimeout(cb, 500);
	}

	// Animate to destination directly, as the crow flies, ignoring obstacles:
	_flyTo(dest) {
		var orientation = ""; // TODO

		// Clone el to dest first:
		var clone = this.cloneToAnim();
		// Calclate final x/y:
		var cx = (this.x + 0.5) * 50,
			cy = (this.y + 0.5) * 50;	// CELL WIDTH
		var zx = (dest[0] + 0.5) * 50,
			zy = (dest[1] + 0.5) * 50;
		// Then animate 2 transforms:
		TinyAnimate.animateCSS(
			clone, 'top', 'px', cy, zy,
			600, 'linear',
			// when done:
			() => {
				this.placeAt(dest);
				clone.parentNode.removeChild(clone);
			}
		);
		TinyAnimate.animateCSS(
			clone, 'left', 'px', cx, zx, 600
		);
	}

	cloneToAnim() {
		var clone = this.el.cloneNode();
		d.q("#animLayer").appendChild(clone);
		clone.style.left = (this.x + 0.5) * 50 + "px";
		clone.style.top = (this.y + 0.5) * 50 + "px";
		this.el.style.opacity = 0; // hide original
		return clone;
	}

	target(x,y) {
		this.targeting = [x,y];
		Board.markCell(x,y, 'targeted');
	}

	attack(point) {
		var [x,y] = point;	// eslint-disable-line
		// Animation?
		// stats battle ATT/DEF
	}

	rotate() {
		if (this.type == 'mine') return;
		var seq = ['ss','ww','nn','ee'];
		var old = this.facing;
		var nu = seq[(seq.indexOf(old) + 1) % 4];
		console.log(nu);
		swapClass(old, nu, this.el);
		sounds.play('click');
		this.facing = nu;
		return this;
	}

	explode() {
		// Animate blur
		Viper({
			object: {b:0},
			property: 'b',
			to: 20,
			duration: 950,
			transition: Viper.Transitions.sine.out,
			start: () => sounds.play('explode'),
			update: (o) => {
				this.el.style.filter = `blur(${o.b}px)`;
			},
			finish: () => this.remove()
		}).start();
	}

	remove() {
		d.q('#depot').appendChild(this.el);
		depots[this.team].push(this);
	}
}

class Board {
	// Create the board HTML element:
	static build(width, height=width) {
		// Build board:
		for (var y=0; y<height; y++) {
			for (var x=0; x<width; x++) {
				var div = d.e("div");
				if (x !== y && Math.random() > 0.85) div.innerHTML = `<b>${PLANTS.random()}</b>`;
				$ga.appendChild(div);
				div.setAttribute("id", "x"+x+"y"+y);
				if (x < 5 && y < 5) div.classList.add('team0spawn');
				if (x > width - 6 && y > height - 6) div.classList.add('team1spawn');
				div.style.zIndex = x + y;	// (0,0) will be furthest away square
				// Apply random colour change to each cell:
				div.style.background = COLOURS.random();
				//var b = (x+y+100) / 100;
				//div.style.filter = `brightness(${b})`;	// gets inherited by children
				cells.push([x,y]);

				//var canv = document.createElement('canvas');
				//canv.width = 32;
				//canv.height = 32;
				//var ctx = canv.getContext('2d');
				//ctx.font = '32px serif';
				//ctx.fillText(WEAP[0], 10, 50);
				//ctx.fillText(PIECES[0], 10, 50);
			}
		}
		// Add anim layer
		var anim = d.e('aside');
		anim.setAttribute("id", "animLayer");
		$ga.appendChild(anim);
	}

	// Apply a class to a cell:
	static markCell(x,y,className) {
		d.q("#x"+x+"y"+y).classList.add(className);
	}

	// TODO: unMarkCells

	// Give a group of squares 'valid' class
	static highlight(cells) {
		cells.forEach(c => d.q("#x"+c[0]+"y"+c[1]).classList.add('valid'));
	}

	// Clear 'valid' classes from squares
	static unHighlight() {
		d.qa("div.valid").forEach(el => el.classList.remove('valid'));
	}

	// Figure out which squares to visit to get from A to B (ortho or diag):
	static findRoute(a,z) {
		if (arrEq(a,z)) return [];
		var route = [];

		var dx = z[0]-a[0],
			dy = z[1]-a[1];
		// Normalise:		// [5,-5]	=> [1,-1]
		if (dx !== 0) dx /= Math.abs(dx);
		if (dy !== 0) dy /= Math.abs(dy);
		console.log(dx, dy);	// -1, 0, 1
		// Increment:
		while (!arrEq(a,z)) {
			a[0] += dx;
			a[1] += dy;
			route.push(a.slice(0));
		}
		return route;
	}

	// TODO: make non-static class
}

class UI {
	static drawTools() {
		// Count units not on the board:
		var depotCounts = [
			2 - d.qa("#ga .mine.team0").length,
			4 - d.qa("#ga .goblin.team0").length,
			2 - d.qa("#ga .fireskull.team0").length,
			2 - d.qa("#ga .priest.team0").length,
			2 - d.qa("#ga .golem.team0").length,
			1 - d.qa("#ga .necro.team0").length,
			1 - d.qa("#ga .iceman.team0").length
		];
		// Write the numbers in:
		d.qa("#tools li").forEach((li, i) => {
			var n = depotCounts[i];
			li.lastChild.innerHTML = n;
			if (n < 1) li.classList.add('disabled');
		});
	}

	static setMode(mode, piece="") {
		while (d.b.c.length > 0) d.b.c.remove(d.b.c[0]);
		if (!mode) return;
		/* Possible modes:
		place-[type]
		rotate
		move
		move-[id]
		arm
		'' (to clear mode)
		*/
		if (mode == 'place') {
			mode += "-"+piece;
			selectedUnit = depots[0].filter(u => u.type == piece)[0];
		}
		d.b.c.add(mode);
		console.log(mode);
		gameMode = mode;
		//messaging.clearMessages();
	}
}

class AI {
	constructor() {
		for (var t of baseSquad) {
			new Unit(t,1);
		}
		return this;
	}

	placeUnits() {
		var spawns = d.qa(".team1spawn");
		units.filter(u => u.team == 1).forEach(u => {
			// Place randomly in spawn area;
			u.placeAt(unwrap(Array.from(spawns.values()).random().id));	// TODO avoid occupied spawnPts
		});
	}
}

// Create everything:
Board.build(11);
for (var t of baseSquad) {
	new Unit(t,0);
}
UI.drawTools();

// AI:
var opp = new AI();
opp.placeUnits();

// Tools behaviours:
d.qa("#tools i").forEach(el => {
	el.addEventListener('mouseover', () => { d.q("#toolstip").innerHTML = TEXT[el.classList[0]]; });
	el.addEventListener('mouseout', () => { d.q("#toolstip").innerHTML = ""; });
	el.addEventListener('click', () => { UI.setMode('place', el.classList[0]); });
});

// Behaviours on cells:
live('.valid', 'click', (evt) => {
	console.log(selectedUnit.id, 'directed to', evt.target.id);
	selectedUnit.moveTo(unwrap(evt.target.id));
	selectedUnit = null;
	UI.setMode();
	Board.unHighlight();
	console.log('done');
});
live('.team0spawn', 'click', (evt) => {
	if (gameMode.startsWith('place-')) {
		// Check spawn validity:
		selectedUnit.placeAt(unwrap(evt.target.id));
		selectedUnit = null;
		UI.setMode();
		UI.drawTools();
	}
});

// Text
d.b.appendChild(pixCanv('The quick, brown fox jumps over a lazy dog. 123:456:7890'));
