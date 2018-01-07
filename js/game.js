/* global TA */
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
	if (el.attachEvent) el.attachEvent('on'+type, handler);
	else el.addEventListener(type, handler);
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
// Convert "#x3y5" identifier into [3,5] point array:
const unwrap = (id) => id.slice(1).split("y").map(n => +n);

// Aliases
var d = document;
d.e = d.createElement;
d.q = d.querySelector;
d.qa = d.querySelectorAll;
d.b = d.body;
var $ga = d.q("#ga");
var $msg = d.q("#msg");
var st = setTimeout;
var C = 'classList';

// Unicode icons:
const PLANTS = ["🎄","🌲","🌳","🌵"];
const NUMS = ["0⃣","1⃣","2⃣","️3⃣"];
const TRANSP = [
	"rgba(130,180,110,0.7)", "rgba(150,180,110,0.7)", "rgba(130,160,110,0.7)"
];
// Text
const TEXT = {	// key : [Name, Movement, Attack, Special, value]
	"mine": ["Mineshroom", "None"],
	"qoblin": ["Goblin", "One step in 4 possible directions."],
	"fireskull": ["Hothead", "Moves in 2x1 dog-legs, 8 possible directions"],
	"priest": ["Priest", "Moves up to 6 steps on diagonals only"],
	"golem": ["Golem","Moves up to 4 steps in the 4 non-diagonal directions"],
	"necro": ["Necromancer", "Unlimited movement in 8 directions"],
	"iceman": ["Ice Demon", "Moves 1 step in all 8 directions"]
};
const TYPES = ["mine","qoblin","fireskull","priest","golem","necro","iceman"];
//const QUOTAS = [2,4,2,2,2,1,1];
const baseSquad = "mine,mine,qoblin,qoblin,qoblin,qoblin,fireskull,fireskull,priest,priest,golem,golem,necro,iceman".split(",");

var gm;		// place-, move-, ai
var units = [];
var selectedUnit;
var depots = {0: [], 1: []};
var guid = 0;
var myTurn = false;
var myMoves = [];	// holds up to 3 ids per turn, then cleared
var placed = [];	// holds up to 3 ids per turn, then cleared

// Class representing a game piece
class Unit {
	constructor(type, team=0, x=null, y=null) {
		this.type = type;
		this.id = type + guid++;
		this.team = team;
		this.facing = (team) ? 'nn' : 'ss';
		this.x = x;
		this.y = y;
		this.xy = [x,y];
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
		units.push(this);
		depots[this.team].push(this);
		this.frozen = 0;	// available
		// To board?
		if (x !== null && y !== null) this.placeAt([x,y]);
		this.vMoves = false;
		return this;
	}

	// Wire up the listeners for clicking or hovering this unit:
	_addEventListeners() {
		// Add interaction behaviours:
		this.el.addEventListener('click', (e) => {
			e.stopPropagation();

			// Ignore mines, allow walk-ons:
			if (gm.startsWith('move') && this.type == 'mine') this.el.parentNode.click();
			// Disallow moving twice:
			else if (myMoves.includes(this.id) || gm == 'move-'+this.id) this.rotate();
			else {
				// Highlight the valid cells we can move to:
				selectedUnit = this;
				UI.setMode('move-'+this.id);
				this.vMoves = this.vMoves || this._validMoves();
				b.highlight(this.vMoves);
			}
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
		var vMoves;
		// NOTE: inefficient to calc all these options when only 1 or 2 needed for a given type
		var orth4 = this._addTo([[0,1],[1,0],[0,-1],[-1,0]]);
		var diag4 = this._addTo([[1,1],[-1,-1],[1,-1],[-1,1]]);
		var doglegs = this._addTo([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]);
		var orthAll = b.cells.filter(c => c[0] == this.x || c[1] == this.y);
		var diagAll = b.cells.filter(c => Math.abs(c[0] - this.x) == Math.abs(c[1] - this.y));
		var orthAllLtd = orthAll.filter(c => b.manhattan(c, this.xy) < 6);
		var diagAllLtd = diagAll.filter(c => b.manhattan(c, this.xy) < 12);

		switch(this.type) {
			case 'mine': return [];
			case 'qoblin': vMoves = orth4; break;
			case 'fireskull': vMoves = doglegs; break;
			case 'priest': vMoves = diagAllLtd; break;
			case 'golem': vMoves = orthAllLtd; break;
			case 'necro': vMoves = orthAll.concat(diagAll); break;
			case 'iceman': vMoves = orth4.concat(diag4); break;
		}
		// Allow same-cell interactions:
		return vMoves.concat([this.xy]);
	}

	// Put unit in board square. Also check how to handle what is there:
	placeAt(point, spawned=false) {
		var [x,y] = point;
		var sqr = d.q("#x"+x+"y"+y);
		sqr.appendChild(this.el);
		this.el.style.opacity = 1;
		this.x = x;
		this.y = y;
		this.xy = [x,y];

		if (spawned) {
			depots[this.team].splice(depots[this.team].indexOf(this), 1);
			placed.push(this.id);
			this.fx('flash');
		}
		else {
			// Kill tree:
			if (sqr.firstChild && sqr.firstChild.id.startsWith('tree')) sqr.firstChild.remove();

			// What units are here?
			var obsts = b.at(point).filter(o => o.id !== this.id);
			// Mines go boom:
			if (obsts.some(o => o.type == 'mine') && this.type != 'fireskull') {
				var mine = obsts.filter(o => o.type == 'mine')[0];
				mine.explode(1);
				this.remove();
				return;
			}
			// Capture the enemy:
			if (obsts.some(o => o.team !== this.team)) {
				console.log("fight at", point, "vs", obsts);
				obsts[0].remove();
				return;
			}
		}

		// Done
		b.unHighlight();
		if (this.xy) this.vMoves = this._validMoves();
		return this;
	}

	// Rotate through 4 sprites:
	rotate() {
		if (this.type == 'mine') return;
		var seq = ['ss','ww','nn','ee'];
		var old = this.facing;
		var nu = seq[(seq.indexOf(old) + 1) % 4];
		this.face(nu);
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
			this._flyTo(dest, 600, () => {
				this._finishMove();
			});
		}
		else {
			// Calculate animation path, must go square by square:
			var route = b.findRoute(this.xy, dest);
			var stepsTaken = 0;
			console.log(route);
			// Walk loop:
			var step = function() {
				if (route.length > 0) {
					// Check next cell, who is there?
					var nextCell = route.shift(),
						obsts = b.at(nextCell);
					if (obsts.some(o => o.team === this.team && o.type != 'mine')) {
						// path blocked
						console.log("blocked at", nextCell);
						this._finishMove(stepsTaken > 0);	// only log if steps
					}
					else {
						stepsTaken++;
						console.log('step', stepsTaken);
						this._stepTo(nextCell, step);
					}
				}
				else {
					// No more route...
					console.log('Route completed.');
					this._finishMove();
				}
			}.bind(this);
			step();
		}
	}

	// Admin when movement & combat is completed:
	_finishMove(logIt=true) {
		console.log('_finishMove');
		b.unHighlight();
		this.vMoves = this._validMoves();
		this.face(this.team ? 'nn' : 'ss');
		if (logIt) this.logMove();
	}

	// Move to an adjacent square:
	// Chain these to move longer distances
	_stepTo(dest, cb) {
		this._flyTo(dest, 300, cb);
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
		TA.animateCSS(
			clone, 'left', 'px', cx, zx,
			duration, 'linear'
		);
		TA.animateCSS(
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

	// Simulate a fight between 2 units; apply damage:
	melee(enemy) {
		this.remove();
	}

	// Sound & anim for death:
	explode() {
		// CSS animation for blur
		this.fx('explode', 900, () => {
			this.remove();
		});
	}

	// Send unit back to the depot:
	remove() {
		d.q('#depot').appendChild(this.el);
		depots[this.team].push(this);
		this.x = null;
		this.y = null;
		this.xy = null;
		this.frozen = 5;
	}

	// Apply visual effect by adding & removing animation class:
	fx(name, t=1000, cb) {
		this.el[C].add(name);
		st(() => {
			this.el[C].remove(name);
			if (cb) cb();
		}, t);
	}

	// Log that this unit moved, so it can't again in this turn:
	logMove() {
		myMoves.push(this.id);
		if (myTurn) {
			UI.drawTools();
			UI.setMode();
		}
		// Third logging is what triggers the switch of play
		if (myMoves.length == 3 ) endTurn();
	}
}


// Singleton class representing the game board
class Board {
	// Create the board HTML element:
	constructor(width, height=width) {
		this.w = width;
		this.h = height;
		this.cells = [];
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
						div.style.background = "#7B8E23";
					}
				}

				div.style.zIndex = x + y;	// (0,0) will be furthest away square
				// Apply random colour change to each cell:
				this.cells.push([x,y]);
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

	// Check what's in a square - returns array of Units:
	at(point) {
		var [x,y] = point;
		return units.filter(u => u.x === x && u.y === y);
	}

	// Give a group of squares 'valid' class
	highlight(cells) {
		console.log(cells);
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

	// Get Manhattan distance between two points:
	manhattan(a,z) {
		var dx = z[0]-a[0],
			dy = z[1]-a[1];
		return Math.abs(dx) + Math.abs(dy);
	}

	// Auto-Spawn a number of units for one team:
	spawnUnits(team, num) {
		var spawns = d.qa(".team"+team+"spawn");
		// Get num unfrozen units from this team's depot:
		depots[team].filter(u => !u.frozen).shuffle().slice(0,num)
		.forEach(u => {
			// Find an empty spawnable cell:
			do {
				var xy = unwrap(Array.from(spawns.values()).random().id);
			} while (b.at(xy).length > 0);
			// Place unit:
			u.placeAt(xy, true);
		});
		console.log("Spawned this turn:", placed);
	}

	// Hurt an individual cell's units:
	damageCell(point, hurt) {
		// Find units, damage them:
		var $div = d.q("#x"+point[0]+"y"+point[1]);
		$div[C].add('invert');
		st(() => { $div[C].remove('invert'); }, 1000);

		var units = b.at(point);
		units.forEach(u => u.hurt(hurt));
	}
}


// Utility class for drawing and managing UI state
class UI {
	static drawTools(team=0) {
		// Count units not on the board:
		var depotCounts = TYPES.map(type => depots[team].filter(u => u.type == type && !u.frozen).length);
		// Write the numbers in:
		d.qa("#tools li").forEach((li, i) => {
			var n = depotCounts[i];
			li.lastChild.innerHTML = n;
			if (n < 1) li[C].add('disabled');
			else li[C].remove('disabled');
		});
		d.q("#moves").innerHTML = NUMS[3 - myMoves.length]+" MOVES";
	}

	static setMode(mode) {
		console.info(`setMode(${mode})`);
		// Clear all classes:
		while (d.b[C].length > 0) d.b[C].remove(d.b[C][0]);
		gm = mode || "";
		// Add the new class:
		if (mode) d.b[C].add(mode);
		d.q("#mode").innerHTML = gm;
		b.unHighlight();
	}

	static msg(offset, text, scale, target=$msg, clear=true) {
		if (clear) target.innerHTML = "";
		var $p = d.e("p");
		$p.innerHTML = text;
		target.style.top = offset;
		target.appendChild($p);
		return $p;
	}
}


// Singleton class for handling AI team & moves
class AI {
	constructor() {
		this.team = [];
		// Make 14 (non-board) units:
		for (var t of baseSquad) {
			this.team.push(new Unit(t,1));
		}
		return this;
	}

	startTurn() {
		// Placing phase
		this.placeUnits();
		// Units on board:
		// Choose a piece. Necro > Priest > Skull > Golem > Iceman > Goblin > Mine
		var toMove = this.team.filter(u => u.x && u.type != 'mine').shuffle().slice(0,3);
		// Moving phase:
		console.log(toMove);	// ok
		st(() => { this.movePiece(toMove[0]); }, 1500);
		st(() => { this.movePiece(toMove[1]); }, 3500);
		st(() => { this.movePiece(toMove[2]); }, 5500);
		// fallback in case fewer than 3 moves were logged:
		st(() => { if (!myTurn) endTurn(); }, 7500);
	}

	placeUnits() {
		// Place new units while possible:
		b.spawnUnits(1, Math.min(14 - depots[1].length, [1,2].random()));
	}

	movePiece(u) {
		// Usually Melee if we have company:
		if (b.at(u.xy).length > 1) u.placeAt(u.xy); //&& rand() > .2
		u.moveTo(this.chooseMove(u));
	}

	chooseMove(unit) {
		return unit._validMoves().random();
	}
}


function endTurn() {
	console.log('endTurn()');
	b.unHighlight();
	// Reset place/move/atts:
	placed = [];
	myMoves = [];
	// Countdown clocks on depot units decrement:
	Object.values(depots).forEach(depot => {
		for (var du of depot) {
			if (du.frozen > 0) du.frozen--;
		}
	});
	UI.drawTools();

	// Next player's turn:
	myTurn = !myTurn;
	if (myTurn) {
		UI.setMode();
		UI.msg("100px", "Your turn", 4);
	}
	else {
		UI.setMode('ai');
		UI.msg("600px", "Satan is thinking...", 5);
		opp.startTurn();
	}
}


// Create everything:
var b = new Board(11);
// Team 0's players:
for (var t of baseSquad) new Unit(t,0);
// AI's players:
var opp = new AI();
b.spawnUnits(1,7);
b.spawnUnits(0,7);
// Update:
UI.drawTools();
endTurn();

// Tools behaviours:
d.qa("#tools i").forEach(el => {
	el.addEventListener('mouseover', () => {
		var c = el.classList[0],
			txt = TEXT[c];
		d.q("#info").innerHTML = `
			<u>${txt[0]}</u><br>
			<u>Movement:</u> ${txt[1]}<br>
			<i class="${c}"><s></s></i>
		`;
	});
	el.addEventListener('mouseout', () => { d.q("#info").innerHTML = ""; });
	el.addEventListener('click', () => {
		if (el.parentNode[C].contains('disabled')) return;	// classList.contains() - specific method
		if (placed.length >= 2) return;
		var type = el.classList[0];
		UI.setMode('place-'+type);
		selectedUnit = depots[0].filter(u => u.type == type)[0];
	});
});
// Behaviours on cells:
live('.valid', 'click', (evt) => {
	var tid = (evt.target.id.startsWith('x')) ? evt.target.id : evt.target.parentNode.id;
	var targ = unwrap(tid);
	console.log(selectedUnit.id, 'directed to', tid);

	if (b.manhattan(selectedUnit.xy, targ) === 0) {
		// Same-cell melee:
		console.log('SAME CELL!!');
		if (evt.target[C].contains('team1')) selectedUnit.placeAt(targ);	// triggers melee
	}
	// Standard move:
	else selectedUnit.moveTo(targ);

	// Cleanup:
	selectedUnit = null;
	UI.setMode();
	b.unHighlight();
});
// Click to place new units:
live('.team0spawn', 'click', (evt) => {
	if (gm.startsWith('place-')) {
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
