/* global pixCanv, TinyAnimate, jsfxr */
/* eslint-env browser */
/* eslint-disable eqeqeq, no-sparse-arrays */

// Helpers
Array.prototype.random = function() {
	return this[Math.floor(Math.random() * this.length)];
};
Array.prototype.shuffle = function() {
	for (let i = this.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[this[i], this[j]] = [this[j], this[i]];
	}
	return this;
};
// helper for enabling IE 8 event bindings
function addEvent(el, type, handler) {
	if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler);
}
// live binding helper using matchesSelector
function live(selector, event, callback, context) {
	addEvent(context || d, event, function(e) {
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
// element class replacer
function swapClass(old, nu, el) {
	el.classList.remove(old);
	el.classList.add(nu);
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
//const WEAP = ["🔪","🗡️","🔫","⛏️"];
const SPESH = ["💥","🛡️","⛸️","⚫","🔮","💢"];
//const FX = [,"🔥"];
//const DIRS = ["⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️"];

// Text
const TEXT = {	// key : [Name, Movement, Attack, Special]
	"mine": ["Mineshroom", "None", "Explodes when anything steps on it", "Triggers a big explosion with more damage"],
	"goblin": ["Goblin", "One step in 4 possible directions.", "Melee (weak)", "Can raise his shield to block 50% of damage"],
	"fireskull": ["Hothead", "Moves in 2x1 doglegs, 8 possible directions", "Melee (average)", "None, but can float past obstacles"],
	"priest": ["Priest", "Moves only on diagonals", "Melee (weak)", "Can rush through a line of enemies, slashing them all"],
	"golem": ["Golem","Moves up to 4 steps in the 4 non-diagonal directions", "Melee (average)", "Can spit a rock with decent range and damage"],
	"necro": ["Necromancer", "Unlimited movement in 8 directions", "Melee (strong)", "Can cast a healing spell on units surrounding her"],
	"iceman": ["Ice Demon", "Moves 1 step in all 8 directions", "Melee (strong)", "His jump causes a damaging earthquake"]
};

const COLOURS = [
	"#6B8E23","#7B8E23","#5B8E33","#6B7E13"
];
const TRANSP = [
	"rgba(130,180,110,0.7)", "rgba(150,180,110,0.7)", "rgba(130,160,110,0.7)"
];

const baseSquad = "mine,mine,goblin,goblin,goblin,goblin,fireskull,fireskull,priest,priest,golem,golem,necro,iceman"
.split(",");

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

// eslint-disable-next-line
function endTurn() {
	b.unHighlight();
	// AI's turn
}

const unwrap = (id) => id.slice(1).split("y").map(n => +n);

class Unit {
	constructor(type, team=0, x=null, y=null) {
		this.type = type;
		this.id = type + guid++;
		this.team = team;
		this.facing = (team == 0) ? 'ss' : 'nn';
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
				b.highlight(this.vMoves);
			}
		});
		this.el.addEventListener('click', (e) => {
			e.stopPropagation();
			if (gameMode == 'rotate') this.rotate();
			if (gameMode == 'move') {
				// Highlight the valid cells we can move to:
				selectedUnit = this;
				UI.setMode('move-'+this.id);	// causes highlight to remain
			}
			if (gameMode == 'explode') this.explode();
			if (gameMode == 'health') this.showHealthBar(this.id, 100);
		});
		this.el.addEventListener('mouseout', () => {
			if (gameMode == 'move') b.unHighlight();
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

	// Face a given direction:
	face(dir) {
		swapClass(this.facing, dir, this.el);
		this.facing = dir;
	}

	// Animate square-by-square towards destination:
	moveTo(dest) {
		// Orientation:
		var dx = dest[0] - this.x,
			dy = dest[1] - this.y,
			angle = (360 / 6.283) * Math.atan2(dy,dx);
		var dir = (angle >= 0 && angle <= 90) ? 'ss'
				: (angle <= -90 && angle >= -180) ? 'nn'
				: (angle > 90 && angle < 180) ? 'ww'
				: (angle < 0 && angle > -90) ? 'ee' : 'unknown';
		console.log(angle, dir);
		this.face(dir);

		if (this.type == 'fireskull') {
			this._flyTo(dest);
		}
		else {
			// Calculate animation path, must go square by square:
			var route = b.findRoute([this.x,this.y], dest);
			console.log(route);
			// Walk loop:
			var step = function() {
				// If enemy, fight him

				// TODO
				if (route.length > 0) this._stepTo(route.shift(), step);
			}.bind(this);
			step();
		}
		// Done
		this.vMoves = this._validMoves();
		this.face(this.team == 0 ? 'ss' : 'nn');
		return this;
	}

	// Move to an adjacent square:
	// Chain these to move longer distances
	_stepTo(dest, cb) {
		sounds.play('move');
		this._flyTo(dest, 300, cb);
		//if (cb) setTimeout(cb, 315);
	}

	// Animate to destination directly, as the crow flies, ignoring obstacles:
	_flyTo(dest, duration=600, cb) {
		// Clone el to dest first:
		var clone = this._cloneToAnim();
		// Calculate final x/y:
		var cx = (this.x + 0.5) * 50,
			cy = (this.y + 0.5) * 50;	// CELL WIDTH
		var zx = (dest[0] + 0.5) * 50,
			zy = (dest[1] + 0.5) * 50;

		// Then animate 2 simultaneous transforms for top & left:
		TinyAnimate.animateCSS(
			clone, 'left', 'px', cx, zx,
			duration, 'linear'
		);
		TinyAnimate.animateCSS(
			clone, 'top', 'px', cy, zy,
			duration, 'linear',
			// when done:
			() => {
				this.placeAt(dest);
				clone.parentNode.removeChild(clone);
				if (cb) cb();
			}
		);
	}

	// Clone the element to the animation layer, so it can move freely
	// around the board before returning to a square:
	_cloneToAnim() {
		var clone = this.el.cloneNode();
		d.q("#animLayer").appendChild(clone);
		clone.style.left = (this.x + 0.5) * 50 + "px";
		clone.style.top = (this.y + 0.5) * 50 + "px";
		this.el.style.opacity = 0; // hide original
		return clone;
	}

	target(x,y) {
		this.targeting = [x,y];
		b.markCell(x,y, 'targeted');
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

	showHealthBar(text, percentage = 50) {		// limit percentages to 25,50,75
		var $bar = d.e("figure");
		$bar.classList.add('percent'+percentage);
		$bar.innerHTML = text;
		this.el.appendChild($bar);

		setTimeout(function() {
			$bar.remove();
		}, 1500);
	}

	explode() {
		// Animate blur
		this.el.classList.add('exploding');
		sounds.play('explode');
		setTimeout(() => {
			this.remove();
			this.el.classList.remove('exploding');
		}, 900);
	}

	remove() {
		d.q('#depot').appendChild(this.el);
		depots[this.team].push(this);
	}
}


class Board {
	// Create the board HTML element:
	constructor(width, height=width) {
		// Build board:
		for (var y=0; y<height; y++) {
			for (var x=0; x<width; x++) {
				var div = d.e("div");
				$ga.appendChild(div);
				div.setAttribute("id", "x"+x+"y"+y);
				// Add things:
				if (x < 5 && y < 5)
					div.classList.add('team0spawn');
				else if (x > width - 6 && y > height - 6)
					div.classList.add('team1spawn');
				else {
					div.style.background = TRANSP.random();
					if (Math.random() > 0.5) {
						div.innerHTML = `<b id="tree${guid++}">${PLANTS.random()}</b>`;
						div.style.background = COLOURS.random();
					}
				}

				div.style.zIndex = x + y;	// (0,0) will be furthest away square
				// Apply random colour change to each cell:
				cells.push([x,y]);
			}
		}
		// Add anim layer
		var animLayer = d.e('aside');
		animLayer.setAttribute("id", "animLayer");
		$ga.appendChild(animLayer);
		return this;
	}

	// Apply a class to a cell:
	markCell(x,y,className) {
		d.q("#x"+x+"y"+y).classList.add(className);
	}

	// TODO: unMarkCells

	// Check what's in a square - returns array of ids:
	at(point) {
		var [x, y] = point;
		var nodes = d.q("#x"+x+"y"+y).childNodes;
		return Array.from(nodes).map(n => n.id);
	}

	// Give a group of squares 'valid' class
	highlight(cells) {
		cells.forEach(c => d.q("#x"+c[0]+"y"+c[1]).classList.add('valid'));
	}

	// Clear 'valid' classes from squares
	unHighlight() {
		d.qa("div.valid").forEach(el => el.classList.remove('valid'));
	}

	// Figure out which squares to visit to get from A to B (ortho or diag):
	findRoute(a,z) {
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

	placeUnits(team, num) {
		var spawns = d.qa(".team"+team+"spawn");
		// Get num units from this team:
		units
		.filter(u => u.team == team)
		.shuffle()
		.slice(0,num)
		.forEach(u => {
			// Find an empty spawnable cell:
			do {
				var xy = unwrap(Array.from(spawns.values()).random().id);
			} while (b.at(xy).length > 0);
			// Place unit:
			u.placeAt(xy);
		});
	}

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
}


// Create everything:
var b = new Board(11);
// Team 0's players:
for (var t of baseSquad) new Unit(t,0);
// Update:
UI.drawTools();
// AI:
var opp = new AI();
b.placeUnits(1,5);
b.placeUnits(0,5);


// Tools behaviours:
d.qa("#tools i").forEach(el => {
	el.addEventListener('mouseover', () => {
		var txt = TEXT[el.classList[0]];
		d.q("#toolstip").innerHTML = `
			<u>${txt[0]}</u><br>
			<u>Movement:</u> ${txt[1]}<br>
			<u>Attack:</u> ${txt[2]}<br>
			<u>Special:</u> ${txt[3]}
		`;
	});
	el.addEventListener('mouseout', () => { d.q("#toolstip").innerHTML = ""; });
	el.addEventListener('click', () => { UI.setMode('place', el.classList[0]); });
});

// Behaviours on cells:
live('.valid', 'click', (evt) => {
	console.log(selectedUnit.id, 'directed to', evt.target.id);
	selectedUnit.moveTo(unwrap(evt.target.id));
	selectedUnit = null;
	UI.setMode();
	b.unHighlight();
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
