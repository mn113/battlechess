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
	el[C].remove(old);
	el[C].add(nu);
}

// Aliases
var d = document;
d.e = d.createElement;
d.q = d.querySelector;
d.qa = d.querySelectorAll;
d.b = d.body;
d.b.c = d.b.classList;
var $ga = d.q("#ga");
var st = setTimeout;
var C = 'classList';

// Unicode icons:
//const PIECES = ["🤖","👻","😈","👹","🦄","🐲","🐍","💣","🕸️","🏂"];
const PLANTS = ["🎄","🌲","🌳","🌵"];
//const WEAP = ["🔪","🗡️","🔫","⛏️"];
const SPESH = ["💥","🛡️","⛸️","⚫","🔮","⚕️","💢"];
//const FX = [,"🔥"];
const FLAG = "🚩";
const NUMS = ["0⃣","1⃣","2⃣","️3⃣"];
// Text
const TEXT = {	// key : [Name, Movement, Attack, Special]
	"mine": ["Mineshroom", "None", "Explodes when stepped on", "N/A", "Triggers a big explosion with more damage"],
	"qoblin": ["Goblin", "One step in 4 possible directions.", "Fisticuffs (weak)", "weak", "Can raise his shield to block 50% of damage"],
	"fireskull": ["Hothead", "Moves in 2x1 dog-legs, 8 possible directions", "Fiery Bite (average)", "weak", "None, but can float past obstacles"],
	"priest": ["Priest", "Moves only on diagonals", "Bad Habit (weak)", "average", "Can rush through a line of enemies, slashing them all"],
	"golem": ["Golem","Moves up to 4 steps in the 4 non-diagonal directions", "Rocky Rumble (average)", "strong", "Can spit a rock with decent range and damage"],
	"necro": ["Necromancer", "Unlimited movement in 8 directions", "Dance of Death (strong)", "average", "Can cast a healing spell on units surrounding her"],
	"iceman": ["Ice Demon", "Moves 1 step in all 8 directions", "Ice Punch (strong)", "strong", "His jump causes a damaging earthquake"]
};

const COLOURS = [
	"#6B8E23","#7B8E23","#5B8E33","#6B7E13"
];
const TRANSP = [
	"rgba(130,180,110,0.7)", "rgba(150,180,110,0.7)", "rgba(130,160,110,0.7)"
];


const baseSquad = "mine,mine,qoblin,qoblin,qoblin,qoblin,fireskull,fireskull,priest,priest,golem,golem,necro,iceman".split(",");

var cells = [];
var units = [];
var gameMode;		// place-, move-, spesh, ai
var selectedUnit;
var depots = {0: [], 1: []};
var guid = 0;
var myTurn = true;
var myMoves = 1;

// Sounds
var sounds = {
	click: "1,,0.22,0.46,,0.9,0.86,-0.6,-1,-0.6681,,-1,,,-1,,-0.0014,0.1729,0.95,0.8999,,,0.2367,0.5",
	move: "1,0.59,0.35,0.668,0.23,0.18,0.06,-0.16,-0.2199,0.8737,0.4244,-0.1009,0.0259,0.5304,-0.0402,0.4732,0.3296,0.2235,0.8581,-0.38,0.0049,0.0367,-0.0439,0.5",
	fly: "3,0.99,0.58,0.3,1,0.69,0.3924,0.02,0.02,,,-0.18,,,-0.0116,0.92,-0.2199,0.56,0.9994,-0.1999,0.5882,0.1433,-0.0205,0.5",
	slash: "1,,0.0648,,0.2896,0.5191,,-0.3743,,,,,,,,,,,1,,,0.0127,,0.5",
	slash2: "1,0.08,0.24,0.33,0.17,0.69,0.39,-0.2199,-0.0554,0.0247,0.0023,,,0.266,0.017,,-0.0534,0.0995,1,-0.0799,0.03,0.91,0.12,0.5",
	shoot: "",
	hurt: "1,,0.0704,,0.1996,0.5761,,-0.4487,,,,,,,,,,,1,,,,,0.5",
	boom: "3,.07,.43,.29,.48,.179,,-.26,,,,,,,,,.1895,.16,1,,,,,.5",
	timer: "0,0.08,0.41,0.5,0.53,0.46,,0.78,0.96,,,,,,,0.61,,,0.33,0.6399,,0.93,0.6799,0.5",
	spawn: "0,0.51,0.12,,0.58,0.68,0.41,-0.4599,0.74,,,0.06,,0.29,0.0735,0.8,-0.14,0.26,0.9,0.4399,0.39,0.15,0.813,0.5",
	reverse: "0,0.1074,0.2,,0.3412,0.903,0.106,-0.3157,,,,,,0.85,-0.435,0.3178,0.2343,-0.4811,0.95,-0.18,0.7763,0.4521,-0.0117,0.5",
	jump: "",

	play: function(name) {
		var player = new Audio();
		player.src = jsfxr(sounds[name].split(",").map(s => parseFloat(s))); // asfxr string must be passed as array
		player.play();
	}
};

// eslint-disable-next-line
function endTurn() {
	b.unHighlight();
	// +1 health for all!
	for (var u of units) {
		if (u.hp < u.def) u.hp++;
	}
	// AI's turn
	myTurn = !myTurn;
	// Reset place/move/atts
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
		// Combat attributes:
		var c = type.charAt(0);
		this.att = {m:5,q:5,f:7,p:6,g:7,n:8,i:9}[c];
		this.hp = this.def = {m:0,q:5,f:5,p:6,g:9,n:7,i:10}[c];
		// DOM element:
		this.el = d.e('i');
		this.inner = d.e('s');	// for fx transforms
		this.el.appendChild(this.inner);
		this.el.setAttribute("id", this.id);
		this.el[C].add(type);
		this.el[C].add('team'+team);
		this.el[C].add(this.facing);
		if (team === 0) this._addEventListeners();
		// Register:
		if (typeof team == 'number') {
			units.push(this);
			depots[this.team].push(this);
			// To board:
			if (x !== null && y !== null) this.placeAt([x,y]);
			this.vMoves = false;
		}
		return this;
	}

	// Wire up the listeners for clicking or hovering this unit:
	_addEventListeners() {
		// Add interaction behaviours:
		this.el.addEventListener('mouseover', () => {
			if (gameMode == 'move-'+this.id) {
				//this.vMoves = this.vMoves || this._validMoves();
				//b.highlight(this.vMoves);
			}
		});

		this.el.addEventListener('click', (e) => {
			e.stopPropagation();
			sounds.play('click');
			if (gameMode == 'rotate') this.rotate();
			if (gameMode == 'move-'+this.id) this.rotate();
			else {
				// Highlight the valid cells we can move to:
				selectedUnit = this;
				UI.setMode('move-'+this.id);
				this.vMoves = this.vMoves || this._validMoves();
				b.highlight(this.vMoves);
				this.showHealthBar();
			}
		});

		this.el.addEventListener('mouseout', () => {
			//if (gameMode == 'move-'+this.id) b.unHighlight();
		});
		return this;
	}

	// Add this unit's [x,y] to each member of an array of points:
	_addTo(points) {
		return points
		.map(p => [this.x+p[0], this.y+p[1]])
		.filter(p => (p[0] >= 0 && p[1] >= 0 && p[0] < b.w && p[1] < b.h));	// avoid o-o-b
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
			case 'qoblin': return orth4;
			case 'fireskull': return doglegs;
			case 'priest': return diagAll;
			case 'golem': return orthAllLtd;
			case 'necro': return orthAll.concat(diagAll);
			case 'iceman': return orth4.concat(diag4);
		}
	}

	// Put unit in board square. Also check how to handle what is there:
	placeAt(point, spawned=false) {
		var [x,y] = point;
		var sqr = d.q("#x"+x+"y"+y);
		sqr.appendChild(this.el);
		this.el.style.opacity = 1;
		this.x = x;
		this.y = y;

		if (spawned) {
			depots[this.team].splice(depots[this.team].indexOf(this),1);
		}
		else {
			// Kill tree:
			if (sqr.firstChild && sqr.firstChild.id.startsWith('tree')) sqr.firstChild.remove();

			// What is here?
			var obstIds = b.at(point),
				obsts = obstIds
				.map(id => units.find(u => u.id == id))
				.filter(o => typeof o == 'object');
			console.log(point, obsts);
			// Mines go boom:
			if (obsts.some(o => o.type == 'mine') && this.type !== 'qoblin') {
				var mine = obsts.filter(o => o.type == 'mine')[0];
				mine.explode(1);
				this.hurt(mine.att);
			}
			// Fight the enemy:
			if (obsts.some(o => o.team !== this.team)) {
				console.log("fight at", point, "vs", obsts);
				var enemy = obsts.filter(o => o.team !== this.team)[0];
				this.melee(enemy);
			}
		}

		// Done
		b.unHighlight();
		this.vMoves = this._validMoves();
		return this;
	}

	rotate() {
		if (this.type == 'mine') return;
		var seq = ['ss','ww','nn','ee'];
		var old = this.facing;
		var nu = seq[(seq.indexOf(old) + 1) % 4];
		this.face(nu);
		sounds.play('click');
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
			sounds.play('fly');
			this._flyTo(dest);
		}
		else {
			// Calculate animation path, must go square by square:
			var route = b.findRoute([this.x,this.y], dest);
			console.log(route);
			// Walk loop:
			var step = function() {
				if (route.length > 0) {
					// Check next cell, who is there?
					var nextCell = route.shift(),
						obstIds = b.at(nextCell),
						obsts = obstIds.map(id => units.find(u => u.id == id)).filter(o => typeof o == 'object');
					console.log(nextCell, obsts);

					if (obsts.some(o => o.team === this.team)) {
						// path blocked
						console.log("blocked at", nextCell);
						return;
					}
					else this._stepTo(nextCell, step);
				}
			}.bind(this);
			step();
		}
		// Done		// BUG: CODE NEVER REACHED?
		UI.setMode();
		b.unHighlight();
		this.vMoves = this._validMoves();
		this.face(this.team == 0 ? 'ss' : 'nn');
		console.log('Done with moveTo');
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
		var clone = this.el.cloneNode(true);
		clone.id += 'c';
		d.q("#animLayer").appendChild(clone);
		clone.style.left = (this.x + 0.5) * 50 + "px";
		clone.style.top = (this.y + 0.5) * 50 + "px";
		this.el.style.opacity = 0; // hide original
		return clone;
	}

	melee(enemy) {
		console.log(enemy);
		var att1 = this.att + [-1,1].random(),
			def1 = this.def,
			att2 = enemy.att,
			def2 = enemy.def;
		console.log(att1, def1, att2, def2);

		// Reversal?
		if (Math.random() > 0.83) {
			sounds.play('reverse');
			this.hurt(att2);
		}
		else {
			enemy.hurt(att1);
		}
	}

	hurt(amount) {
		this.hp -= amount;
		this.fx('flash');
		sounds.play('hurt');
		this.showHealthBar();
		// Death if too low, maxed if too high:
		if (this.hp < 0) st(() => { this.remove(); }, 750);
		else if (this.hp > this.def) this.hp == this.def;
	}

	showHealthBar() {
		if (this.type == 'mine') return;
		var pct = 25 * Math.ceil(4 * this.hp / this.def);		// limit percentages to 25,50,75,100
		var $bar = d.e("figure");
		$bar[C].add('p'+pct);
		$bar.innerHTML = this.id + " p" + pct;
		this.el.appendChild($bar);

		st(function() {
			$bar.remove();
		}, 1750);
	}

	explode() {
		sounds.play('boom');
		// CSS animation for blur
		this.fx('exploding', 900, () => {
			this.remove();
		});
	}

	remove() {
		d.q('#depot').appendChild(this.el);
		depots[this.team].push(this);
		this.hp = this.def;
	}

	// Applies visual effect by adding & removing animation class
	fx(name, t=1000, cb) {
		this.el[C].add(name);
		st(() => {
			this.el[C].remove(name);
			if (cb) cb();
		}, t);
	}

	doSpecial(target) {
		switch(this.type) {
			case 'mine':
				// BIG boom 3x3 instant
				sounds.play('timer');
				this.fx('grow', 1000, () => {
					this.explode();
					b.damage3x3([this.x,this.y], 6);
				});
				break;

			case 'qoblin':
				// add shield class
				this.el[C].add("shield");
				break;

			case 'priest':
				this.moveTo(target);	// special exemption
				break;

			case 'golem':
				// spit rock to target - requires validmoves & targeting cursor
				// TODO
				break;

			case 'necro':
				// healing spell 3x3 instant
				sounds.play('spell');
				this.fx('spell', 1000, () => {
					b.damage3x3([this.x,this.y], -2);
				});
				break;

			case 'iceman':
				// jump stomp 3x3 instant
				//sounds.play('jump');
				this.fx('jump', 1200, () => {
					sounds.play('boom');
					b.jiggle();
					b.damage3x3([this.x,this.y], 3);
				});
				break;
		}
	}
}


class Board {
	// Create the board HTML element:
	constructor(width, height=width) {
		this.w = width;
		this.h = height;
		// Build board:
		for (var y=0; y<height; y++) {
			for (var x=0; x<width; x++) {
				var div = d.e("div");
				$ga.appendChild(div);
				div.setAttribute("id", "x"+x+"y"+y);
				// Add things:
				if (x < 5 && y < 5)
					div[C].add('team0spawn');
				else if (x > width - 6 && y > height - 6)
					div[C].add('team1spawn');
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
		d.q("#x"+x+"y"+y)[C].add(className);
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
		cells.forEach(c => d.q("#x"+c[0]+"y"+c[1])[C].add('valid'));
	}

	// Clear 'valid' classes from squares
	unHighlight() {
		d.qa("div.valid").forEach(el => el[C].remove('valid'));
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
		//console.log(dx, dy);	// -1, 0, 1
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
			u.placeAt(xy, true);
		});
	}

	damage3x3(centre, hurt) {
		// Find 9 cells:
		var area = new Unit('iceman', null, centre[0], centre[1])._validMoves();
		// Damage them all:
		for (var sq of area) b.damageCell(sq, hurt);
	}

	damageCell(point, hurt) {
		// Find occupants:
		var ids = b.at(point);
		// Find units, damage them:
		ids.filter(id => !id.startsWith('tree'))
		.map(id => units.find(u => u.id == id).hurt(hurt));
	}

	jiggle() {
		var f = d.q("#fx");
		f[C].add('jiggle');
		st(() => { f[C].remove('jiggle'); }, 1000);
	}
}


class UI {
	static drawTools() {
		// Count units not on the board:
		var depotCounts = [
			2 - d.qa("#ga .mine.team0").length,
			4 - d.qa("#ga .qoblin.team0").length,
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
			if (n < 1) li[C].add('disabled');
		});
		d.q("#moves").innerHTML = NUMS[myMoves]+" MOVES";
	}

	static setMode(mode) {
		console.info('setMode(',mode,')');
		// Clear all classes:
		while (d.b.c.length > 0) d.b.c.remove(d.b.c[0]);
		gameMode = mode;
		// Add the new class:
		if (mode) d.b.c.add(mode);
		d.q("#mode").innerHTML = mode || "";
		b.unHighlight();
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
// AI's players:
var opp = new AI();
b.placeUnits(1,7);
b.placeUnits(0,7);
// Update:
UI.drawTools();


// Tools behaviours:
d.qa("#tools i").forEach(el => {
	el.addEventListener('mouseover', () => {
		var c = el.classList[0],
			txt = TEXT[c];
		d.q("#info").innerHTML = `
			<u>${txt[0]}</u><br>
			<u>Movement:</u> ${txt[1]}<br>
			<u>Melee Attack:</u> ${txt[2]}<br>
			<u>Defence:</u> ${txt[3]}<br>
			<u>Special:</u> ${txt[4]}
			<i class="${c}"><s></s></i>
		`;
	});
	el.addEventListener('mouseout', () => { d.q("#info").innerHTML = ""; });
	el.addEventListener('click', () => {
		sounds.play('click');
		if (el.parentNode[C].contains('disabled')) return;
		var type = el.classList[0];
		UI.setMode('place-'+type);
		selectedUnit = depots[0].filter(u => u.type == type)[0];
	});
});

// Behaviours on cells:
live('.valid', 'click', (evt) => {
	sounds.play('click');
	var tid = (evt.target.id.startsWith('x')) ? evt.target.id : evt.target.parentNode.id;
	console.log(selectedUnit.id, 'directed to', tid);
	selectedUnit.moveTo(unwrap(tid));
	selectedUnit = null;
	UI.setMode();
	b.unHighlight();
});
live('.team0spawn', 'click', (evt) => {
	sounds.play('click');
	if (gameMode.startsWith('place-')) {
		sounds.play('spawn');
		selectedUnit.placeAt(unwrap(evt.target.id), true);
		selectedUnit = null;
		UI.setMode();
		UI.drawTools();
	}
});
// Unset mode every time non-unit clicked:
live('#ga', 'click', () => {
	console.log('top-level mode unset');
	UI.setMode();
});

// Text
d.b.appendChild(pixCanv('The quick, brown fox jumps over a lazy dog. 123:456:7890'));
