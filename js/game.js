/* global pixCanv, soundEffect, Viper */
/* eslint-env browser */
/* eslint-disable eqeqeq */

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

const colours = ["#6B8E23","#7B8E23","#5B8E33","#6B7E13", "rgba(130,180,110,0.7)", "rgba(150,180,110,0.7)", "rgba(130,160,110,0.7)"];

const baseSquad = "mine,mine,iceman,necro,golem,golem,priest,priest,goblin,goblin,goblin,goblin,fireskull,fireskull".split(",");

var cells = [];
var units = [];
var gameMode = null;
var selectedUnit = null;
var depots = {0: [], 1: []};
var guid = 0;

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
		// Register:
		units.push(this);
		depots[this.team].push(this);
		// To board:
		if (x !== null && y !== null) this.placeAt([x,y]);
		return this;
	}

	placeAt(point) {
		var [x,y] = point;
		d.q("#x"+x+"y"+y).appendChild(this.el);
		this.x = x;
		this.y = y;
		var t = this.team;
		depots[t].splice(depots[t].indexOf(this),1);
	}

	_addTo(points) {
		return points.map(p => [this.x+p[0], this.y+p[1]]);
	}

	validMoves() {
		// NOTE: inefficient to calc all these when only 1 or 2 needed
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

	moveTo(point) {
		var [x,y] = point;
		// Calculate animation path
		console.log('moveTo: x',x,'y',y);
		// TODO
		this.placeAt([x,y]);
		return this;
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
			start: null,
			update: (o) => {
				this.el.style.filter = `blur(${o.b}px)`;
			},
			finish: () => this.remove()
		}).start();
		// Play sound

	}

	remove() {
		d.q('#depot').appendChild(this.el);
		depots[this.team].push(this);
	}
}

class Board {
	static markCell(x,y,className) {
		d.q("#x"+x+"y"+y).classList.add(className);
	}

	static highlight(cells) {
		console.log('hi',cells);
		cells.forEach(c => d.q("#x"+c[0]+"y"+c[1]).classList.add('valid'));
	}

	static unHighlight() {
		console.log('unhi');
		d.qa("div.valid").forEach(el => el.classList.remove('valid'));
	}

	static build(width, height=width) {
		// Build board:
		for (var y=0; y<height; y++) {
			for (var x=0; x<width; x++) {
				var div = document.createElement("div");
				if (x !== y && Math.random() > 0.85) div.innerHTML = `<b>${PLANTS.random()}</b>`;
				$ga.appendChild(div);
				div.setAttribute("id", "x"+x+"y"+y);
				if (x < 5 && y < 5) div.classList.add('team0spawn');
				if (x > width - 6 && y > height - 6) div.classList.add('team1spawn');
				div.style.zIndex = x + y;	// (0,0) will be furthest away square
				// Apply random colour change to each cell:
				div.style.background = colours.random();
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

// Attach behaviours to units: (COULD BE DONE ON CREATION?)
d.qa("#ga i").forEach(el => {
	// Find instance:
	var u = units.filter(u => u.id == el.id)[0];
	// Add interaction behaviours:
	el.addEventListener('click', () => {
		if (gameMode == 'rotate') u.rotate();
		if (gameMode == 'move') {
			selectedUnit = u;
			UI.setMode('move-'+u.id);	// causes highlight to remain
		}
		if (gameMode == 'explode') u.explode();
	});
	el.addEventListener('mouseover', () => {
		if (gameMode == 'move') Board.highlight(u.validMoves());
	});
	el.addEventListener('mouseout', () => {
		if (gameMode == 'move') Board.unHighlight();	// TODO cache vm for this xy?
	});
});

// Behaviours on cells:
live('.valid', 'click', (evt) => {
	console.log(selectedUnit.id, 'directed to', evt.target.id);
	selectedUnit.moveTo(unwrap(evt.target.id));
	selectedUnit = null;
	UI.setMode();
	Board.unHighlight();
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

d.b.appendChild(pixCanv('The quick, brown fox jumps over a lazy dog. 123:456:7890'));

soundEffect(
    1046.5,           //frequency
    0,                //attack
    0.3,              //decay
    "sawtooth",       //waveform
    0.2,              //Volume
    -0.8,             //pan
    0,                //wait before playing
    1200,             //pitch bend amount
    false,            //reverse bend
    0,                //random pitch range
    25,               //dissonance
    [0.2, 0.2, 2000], //echo array: [delay, feedback, filter]
    undefined         //reverb array: [duration, decay, reverse?]
);
