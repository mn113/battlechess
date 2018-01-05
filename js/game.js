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
// Convert "#x3y5" identifier into [3,5] point array:
const unwrap = (id) => id.slice(1).split("y").map(n => +n);

// Aliases
var d = document;
d.e = d.createElement;
d.q = d.querySelector;
d.qa = d.querySelectorAll;
d.b = d.body;
d.b.c = d.b.classList;
var $ga = d.q("#ga");
var $fx = d.q("#fx");
var $msg = d.q("#msg");
var st = setTimeout;
var C = 'classList';
var rand = Math.random;

// Unicode icons:
//const PIECES = ["🤖","👻","😈","👹","🦄","🐲","🐍","💣","🕸️","🏂"];
//const WEAP = ["🔪","🗡️","🔫","⛏️"];
const PLANTS = ["🎄","🌲","🌳","🌵"];
//const SPESH = ["💥","🛡️","⛸️","⚫","🔮","⚕️","💢"];
const NUMS = ["0⃣","1⃣","2⃣","️3⃣"];
const COLOURS = [
	"#6B8E23","#7B8E23","#5B8E33","#6B7E13"
];
const TRANSP = [
	"rgba(130,180,110,0.7)", "rgba(150,180,110,0.7)", "rgba(130,160,110,0.7)"
];

// Text
const TEXT = {	// key : [Name, Movement, Attack, Special, value]
	"mine": ["Mineshroom", "None", "Explodes when stepped on", "N/A", "Triggers a big explosion with more damage", -3],
	"qoblin": ["Goblin", "One step in 4 possible directions.", "weak", "weak", "Can raise his shield to block 50% of damage", 1],
	"fireskull": ["Hothead", "Moves in 2x1 dog-legs, 8 possible directions", "average", "weak", "None, but can float past obstacles", 3],
	"priest": ["Priest", "Moves up to 6 steps on diagonals only", "weak", "average", "Can rush through a line of enemies, slashing them all", 3],
	"golem": ["Golem","Moves up to 4 steps in the 4 non-diagonal directions", "average", "strong", "Can spit a rock with decent range and damage", 5],
	"necro": ["Necromancer", "Unlimited movement in 8 directions", "strong", "average", "Can cast a healing spell on units surrounding her", 9],
	"iceman": ["Ice Demon", "Moves 1 step in all 8 directions", "strong", "strong", "His jump causes a damaging earthquake", -1],
	"flag": ["Flag", "Capture this!", "Defend this!", null, null, 99]
};
const TYPES = ["mine","qoblin","fireskull","priest","golem","necro","iceman"];
const QUOTAS = [2,4,2,2,2,1,1];
const baseSquad = "mine,mine,qoblin,qoblin,qoblin,qoblin,fireskull,fireskull,priest,priest,golem,golem,necro,iceman".split(",");
// TODO: zip TYPES & QUOTAS to make baseSquad

var gameMode;		// place-, move-, spesh, ai
var units = [];
var selectedUnit;
var depots = {0: [], 1: []};
var guid = 0;
var myTurn = false;
var myMoves = [];	// holds up to 3 ids per turn, then cleared
var placed = [];	// holds up to 3 ids per turn, then cleared

// Sounds
var sounds = {
	spawn:	"0,0.51,0.12,,0.58,0.68,0.41,-0.4599,0.74,,,0.06,,0.29,0.0735,0.8,-0.14,0.26,0.9,0.4399,0.39,0.15,0.813,0.5",
	click:	"1,,0.22,0.46,,0.9,0.86,-0.6,-1,-0.6681,,-1,,,-1,,-0.0014,0.1729,0.95,0.8999,,,0.2367,0.5",
	move:	"1,0.59,0.35,0.668,0.23,0.18,0.06,-0.16,-0.2199,0.8737,0.4244,-0.1009,0.0259,0.5304,-0.0402,0.4732,0.3296,0.2235,0.8581,-0.38,0.0049,0.0367,-0.0439,0.5",
	fly:	"3,0.99,0.58,0.3,1,0.69,0.3924,0.02,0.02,,,-0.18,,,-0.0116,0.92,-0.2199,0.56,0.9994,-0.1999,0.5882,0.1433,-0.0205,0.5",
	slash:	"1,,0.0648,,0.2896,0.5191,,-0.3743,,,,,,,,,,,1,,,0.0127,,0.5",
	slash2: "1,0.08,0.24,0.33,0.17,0.69,0.39,-0.2199,-0.0554,0.0247,0.0023,,,0.266,0.017,,-0.0534,0.0995,1,-0.0799,0.03,0.91,0.12,0.5",
	hurt:	"1,,0.0704,,0.1996,0.5761,,-0.4487,,,,,,,,,,,1,,,,,0.5",
	reverse:"0,0.1074,0.2,,0.3412,0.903,0.106,-0.3157,,,,,,0.85,-0.435,0.3178,0.2343,-0.4811,0.95,-0.18,0.7763,0.4521,-0.0117,0.5",
	timer:	"0,0.08,0.41,0.5,0.53,0.46,,0.78,0.96,,,,,,,0.61,,,0.33,0.6399,,0.93,0.6799,0.5",
	boom:	"3,.07,.43,.29,.48,.179,,-.26,,,,,,,,,.1895,.16,1,,,,,.5",
	bigboom:"3,0.2404,0.2415,0.0454,0.8159,0.5223,,-0.2005,-0.2372,,0.1818,-0.4207,-0.9964,0.0629,0.0449,,-0.0105,-0.3839,0.9771,0.1777,-0.4885,0.0005,-0.3639,0.41",
	jump:	"0,,0.23,,0.2242,0.33,,0.2217,,,,,,0.3816,,,,,1,,,0.0371,,0.5",
	spell:	"2,0.33,0.55,0.2503,0.2881,0.52,0.28,0.3999,0.1599,,,0.7,0.5334,-0.0897,-0.0773,0.77,-0.0418,0.0381,0.9892,0.1551,-0.2756,0.4,0.146,0.2",
	spit:	"2,,0.73,0.58,1,0.4,0.0188,-0.5,0.6599,,,,,0.6689,-0.5143,,,,1,,,0.1426,,0.2",

	play: function(name) {
		var player = new Audio();
		player.src = jsfxr(sounds[name].split(",").map(s => parseFloat(s))); // asfxr string must be passed as array
		player.play();
	}
};


// Class representing a game piece
class Unit {
	constructor(type, team=0, x=null, y=null) {
		this.type = type;
		this.id = type + guid++;
		this.team = team;
		this.facing = (team == 0) ? 'ss' : 'nn';
		this.x = x;
		this.y = y;
		this.xy = [x,y];
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
			this.frozen = 0;	// available
			// To board?
			if (x !== null && y !== null) this.placeAt([x,y]);
			this.vMoves = false;
		}
		return this;
	}

	// Wire up the listeners for clicking or hovering this unit:
	_addEventListeners() {
		// Add interaction behaviours:
		this.el.addEventListener('click', (e) => {
			e.stopPropagation();
			sounds.play('click');

			// Ignore mines, allow walk-ons:
			if (gameMode.startsWith('move') && this.type == 'mine') this.el.parentNode.click();
			// Disallow moving twice:
			else if (gameMode == 'move-'+this.id || myMoves.includes(this.id)) this.rotate();
			// Prepare for specials:
			else if (gameMode == 'spesh') {
				if (this.type == 'priest' || this.type == 'golem') {
					// Targeted specials:
					selectedUnit = this;
					UI.setMode('spesh-'+this.id);
					this.vMoves = this.vMoves || this._validMoves();
					b.highlight(this.vMoves);
				}
				else if (this.type == 'fireskull') UI.setMode();
				// Static special init:
				else this.doSpecial();
			}
			else {
				// Highlight the valid cells we can move to:
				selectedUnit = this;
				UI.setMode('move-'+this.id);
				this.vMoves = this.vMoves || this._validMoves();
				b.highlight(this.vMoves);
				this.showHealthBar();
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
			case 'mine': vMoves = []; break;
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

			// What is here?
			var obsts = b.at(point);
			//console.log(point, obsts);
			// Mines go boom:
			if (obsts.some(o => o.type == 'mine') && this.type != 'qoblin' && this.type != 'fireskull') {
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

	// Rotate through 4 sprites:
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
						if (stepsTaken > 0) this._finishMove();
					}
					else {
						stepsTaken++;
						console.log(stepsTaken, 'steps');
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
	_finishMove() {
		console.log('_finishMove');
		b.unHighlight();
		this.vMoves = this._validMoves();
		this.face(this.team == 0 ? 'ss' : 'nn');
		this.logMove();
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

	// Simulate a fight between 2 units; apply damage:
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

	// Take off HP and do necessary visuals & admin:
	hurt(amount) {
		this.hp -= amount;
		if (amount > 0) {
			// Death if too low:
			if (this.hp < 0) st(() => { this.remove(); }, 750);
			this.fx('flash');
			sounds.play('hurt');
		}
		else {
			// Maxed if too high:
			if (this.hp > this.def) this.hp == this.def;
		}
		this.showHealthBar();
	}

	// Briefly visualise unit's health:
	showHealthBar() {
		if (this.type == 'mine') return;
		var pct = 25 * Math.ceil(4 * this.hp / this.def);	// limit percentages to 25,50,75,100
		var $bar = d.e("figure");
		$bar[C].add('p'+pct);
		$bar.innerHTML = this.id + " p" + pct;
		this.el.appendChild($bar);

		st(function() {
			$bar.remove();
		}, 1750);
	}

	// Sound & anim for death:
	explode() {
		sounds.play('boom');
		// CSS animation for blur
		this.fx('exploding', 900, () => {
			this.remove();
		});
	}

	// Send unit back to the depot:
	remove() {
		d.q('#depot').appendChild(this.el);
		depots[this.team].push(this);
		this.hp = this.def;
		this.x = null;
		this.y = null;
		this.xy = null;
		this.frozen = 3;
	}

	// Applies visual effect by adding & removing animation class
	fx(name, t=1000, cb) {
		this.el[C].add(name);
		st(() => {
			this.el[C].remove(name);
			if (cb) cb();
		}, t);
	}

	// Execute or enable the special move:
	doSpecial(target) {
		var route;
		switch(this.type) {
			case 'mine':
				// BIG boom 3x3 instant
				sounds.play('timer');
				this.fx('grow', 1000, () => {
					this.explode();
					b.damage3x3(this.xy, 6);
				});
				break;

			case 'qoblin':
				// add shield class
				this.el[C].add("shield");	// FIXME
				break;

			case 'priest':
				route = b.findRoute(this.xy, target);
				this._flyTo(target, 600, () => {
					// Damage occupants en-route:
					for (var i = 0; i < route.length; i++) {
						b.damageCell(route[i], [4,4,3,3,2,2,1,1][i]);
					}
				});
				break;

			case 'golem':
				// spit rock to target - requires validmoves & targeting cursor
				route = b.findRoute(this.xy, target);
				var rock = d.e('b');
				rock.innerHTML = "⚫";
				d.q("#animLayer").appendChild(rock);
				rock.style.left = (this.x + 0.5) * 50 + "px";
				rock.style.top = (this.y + 0.5) * 50 + "px";

				// CODE FROM Unit._flyTo():
				// Calculate final x/y:
				var cx = (this.x + 0.5) * 50,
					cy = (this.y + 0.5) * 50;	// CELL WIDTH
				var zx = (target[0] + 0.5) * 50,
					zy = (target[1] + 0.5) * 50;

				// Then animate 2 simultaneous transforms for top & left:
				TinyAnimate.animateCSS(
					rock, 'left', 'px', cx, zx,
					999, 'linear'
				);
				TinyAnimate.animateCSS(
					rock, 'top', 'px', cy, zy,
					999, 'linear',
					// when done:
					() => {
						rock.parentNode.removeChild(rock);
						// Damage occupants en-route:
						for (var i = 0; i < route.length; i++) {
							b.damageCell(route[i], [4,4,3,3,2,2,1,1][i]);
						}
					}
				);

				break;

			case 'necro':
				// healing spell 3x3 instant
				sounds.play('spell');
				b.ringEffect(this.xy);
				this.fx('spell', 1000, () => {
					b.damage3x3(this.xy, -2);
				});
				break;

			case 'iceman':
				// jump stomp 3x3 instant
				//sounds.play('jump');
				this.fx('jump', 1200, () => {
					sounds.play('boom');
					b.jiggle();
					b.damage3x3(this.xy, 3);
				});
				break;
		}

		this.logMove();
	}

	// Log that this unit moved, so it can't again in this turn:
	logMove() {
		myMoves.push(this.id);
		UI.drawTools();
		UI.setMode();
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
						div.style.background = COLOURS.random();
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

	// Plant trees:
	treeify() {

	}

	// Put a flag in each team's area:
	putFlag(team, x, y) {
		var flag = d.e('b');
		flag.id = 'flag'+team;
		flag.innerHTML = "🚩";
		d.q("#x"+x+"y"+y).appendChild(flag);
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
		// Get num units from this team's depot:
		depots[team].shuffle().slice(0,num)
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

	// Assess value of units in a 3x3 box:
	valueAround(centre, callingTeam) {
		var area = new Unit('iceman', null, centre[0], centre[1])._validMoves();
		return area
		.map(m => b.at(m))
		.map(list => list.length > 0 ? list[0] : false)
		.map(u => u ? TEXT[u.type][5] * (u.team - 0.5) * (callingTeam - 0.5) : 0)
		.reduce((a,b) => a + b);	// positive value for friendly units, negative for enemies
	}

	// Hurt all units in a 3x3 box:
	damage3x3(centre, hurt) {
		// Find 9 cells:
		var area = new Unit('iceman', null, centre[0], centre[1])._validMoves();
		// Damage them all:
		for (var sq of area) b.damageCell(sq, hurt);
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

	// Global board effect:
	jiggle() {
		$fx[C].add('jiggle');
		st(() => { $fx[C].remove('jiggle'); }, 1000);
	}

	// Expanding circle effect:
	ringEffect(centre) {
		var ring = d.e('u');
		d.q("#animLayer").appendChild(ring);
		ring.style.left = (centre[0] + 0.5) * 50 + "px";
		ring.style.top  = (centre[1] + 0.5) * 50 + "px";
		ring[C].add("ring");
		ring[C].add("expanding");
		st(() => { ring.remove(); }, 1000);
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
			if (n < 1) {
				li[C].add('disabled');
			}
		});
		d.q("#moves").innerHTML = NUMS[3 - myMoves.length]+" MOVES";
	}

	static setMode(mode) {
		console.info(`setMode(${mode})`);
		if (mode == 'spesh' && gameMode == 'spesh') mode = '';	// toggle it off
		// Clear all classes:
		while (d.b.c.length > 0) d.b.c.remove(d.b.c[0]);
		gameMode = mode || "";
		// Add the new class:
		if (mode) d.b.c.add(mode);
		d.q("#mode").innerHTML = gameMode;
		b.unHighlight();
	}

	static msg(offset, text, scale) {
		$msg.innerHTML = "";
		$msg.appendChild(pixCanv(text, scale));
		$msg.style.top = offset+"px";
	}

	static title(w1,w2) {

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
		//st(() => { endTurn(); }, 7500);
	}

	placeUnits() {
		// Place new units until no longer possible:
		b.spawnUnits(1, Math.min(14 - depots[1].length, [1,2,3].random()));
	}

	movePiece(u) {
		var r = rand();

		// Usually Melee if we have company:
		console.log(b.at(u.xy));
		if (b.at(u.xy).length > 1) u.placeAt(u.xy); //&& rand() > .2

		var bestMove = this.chooseMove(u),
			localValue = b.valueAround(u.xy, u.team);
		// Sometimes choose special:
		// Local healing special:
		if (u.type == 'necro' && localValue > 1 && r > 0.8) {
			u.doSpecial();
		}
		// Local destructive special?
		else if ((u.type == 'iceman' || u.type == 'mine') && localValue < -1 && r > 0.8) {
			u.doSpecial();
		}
		// Targeted special:
		else if ((u.type == 'priest' || u.type == 'golem') && r > 0.8) {
			u.doSpecial(bestMove);
		}
		// Goblin special:
		else if (u.type != 'fireskull' && r > 0.8) {
			u.doSpecial();
		}
		// Default for all units:
		else {
			u.moveTo(bestMove);
		}
	}

	chooseMove(unit) {
		var moves = unit._validMoves().map(m => {
			// Distance from move terminus to flag:
			var heu = b.manhattan(m, unwrap(d.q("#flag0").parentNode.id));		// lower heu more desirable

			// Value of occupants:
			var occupants = b.at(m);
			if (occupants.length > 0) console.log(m, heu, occupants);

			if (occupants.length > 1) {
				return {cell: m, score: -99};
			}
			else if (occupants.length == 1) {
				var value = TEXT[occupants[0].type][5];		// higher means more desirable
				return {cell: m, score: value - heu};
			}
			else {
				return {cell: m, score: heu};
			}
		});
		moves.sort((a,b) => b.score - a.score);
		console.log(moves);
		return moves.slice(0,3).random().cell;	// pick one of 3 best moves

		// move on enemy flag if possible - YES (99 value)
		// filter to valid squares with an enemy - YES (values > 0)
		//  AND not blocked enroute - NO
		//   prioritise by enemy value - YES
		//    OR square which intersects flag's validMoves - TODO
		// Heuristic: manhattan to opp flag (don't retreat) - YES
		// Board valuation / target prices - YES
		// Fight enemy in own cell - TODO
		//
		// Priest: select move, then samurai it if r()
		// Golem:  select move, then spitball it
		// Necro:  check 3x3 for injured allies
		// Iceman: check 3x3 for enemy
	}
}


function endTurn() {
	console.log('endTurn()');
	b.unHighlight();
	// Reset place/move/atts:
	placed = [];
	myMoves = [];
	// +1 health for all!
	for (var u of units) {
		if (u.hp < u.def) u.hp++;
	}
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
		UI.msg(100, "Your turn", 4);
		console.log('idle...?');
		// Game should be idle now, waiting for clicks (BUG)
	}
	else {
		UI.setMode('ai');
		UI.msg(600, "Satan is thinking...", 5);
		opp.startTurn();
	}
}



// Create everything:
var b = new Board(11);
// Flags:
b.putFlag(0,0,0);
b.putFlag(1,10,10);
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
			<u>Melee Attack:</u> ${txt[2]}<br>
			<u>Defence:</u> ${txt[3]}<br>
			<u>Special:</u> ${txt[4]}
			<i class="${c}"><s></s></i>
		`;
	});
	el.addEventListener('mouseout', () => { d.q("#info").innerHTML = ""; });
	el.addEventListener('click', () => {
		sounds.play('click');
		if (el.parentNode[C].contains('disabled')) return;	// classList.contains() - specific method
		if (placed.length > 2) return;
		var type = el.classList[0];
		UI.setMode('place-'+type);
		selectedUnit = depots[0].filter(u => u.type == type)[0];
	});
});
// Behaviours on cells:
live('.valid', 'click', (evt) => {
	sounds.play('click');
	var tid = (evt.target.id.startsWith('x')) ? evt.target.id : evt.target.parentNode.id;
	var targ = unwrap(tid);
	console.log(selectedUnit.id, 'directed to', tid);

	if (b.manhattan(selectedUnit.xy, targ) === 0) {
		// Same-cell melee:
		console.log('SAME CELL!!');
		if (evt.target[C].contains('team1')) selectedUnit.placeAt(targ);	// triggers melee
	}
	else if (gameMode.startsWith('spesh') && ['priest','golem'].includes(selectedUnit.type)) {
		// Launch moving special:
		console.log('SPECIAL!');
		selectedUnit.doSpecial(targ);
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
