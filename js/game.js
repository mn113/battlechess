/* eslint-env browser */
/* eslint-disable eqeqeq */

Array.prototype.random = function() {
	return this[Math.floor(Math.random() * this.length)];
};
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
	"queen": "Necromancer. Unlimited movement in 8 directions. Will only kill one enemy per turn.",
	"king": "Ice Demon. Heavily armoured, he can move or attack 1 square in 8 directions."
};

var cells = [];
var units = [];

// Build board:
for (var y=0; y<11; y++) {
	for (var x=0; x<11; x++) {
		var div = document.createElement("div");
		var canv = document.createElement('canvas');
		canv.width = 32;
		canv.height = 32;
		if (x !== y && Math.random() > 0.85) div.innerHTML = `<b>${PLANTS.random()}</b>`;
		$ga.appendChild(div);
		div.setAttribute("id", "x"+x+"y"+y);
		div.style.zIndex = x + y;	// (0,0) will be furthest away square
		// Apply random colour change to each cell:
		var h = 30 - Math.ceil(60 * Math.random());
		var b = (x+y+100) / 100;
		div.style.filter = `hue-rotate(${h}deg) brightness(${b})`;	// gets inherited by children
		//var ctx = canv.getContext('2d');
		//ctx.font = '32px serif';
		//ctx.fillText(WEAP[0], 10, 50);
		//ctx.fillText(PIECES[0], 10, 50);
		cells.push([x,y]);
	}
}

// Tooltips:
d.qa("#tools i").forEach(el => {
	el.addEventListener('mouseover', () => { d.q("#toolstip").innerHTML = TEXT[el.classList[0]]; } );
	el.addEventListener('mouseout', () => { d.q("#toolstip").innerHTML = ""; } );
	el.addEventListener('click', () => { setMode('place', el.classList[0]); } );
});

function piece(className, team=0) {
	return d.e('i').addClass(className);
}

function placeAt(x, y, type, team) {
	d.q("#x"+x+"y"+y).appendChild(piece(type, team));
}

function setMode(mode, piece="") {
	while (d.b.c.length > 0) d.b.c.remove(d.b.c[0]);
	/* Possible modes:
	place-mine, place-goblin, place-fireskull, place-priest, place-golem, place-queen, place-ice
	rotate
	arm
	*/
	if (mode == 'place') mode += "-"+piece;
	d.b.c.add(mode);
	console.log(mode);
	//gameMode = mode;
	//messaging.clearMessages();
}

function markCell(x,y,className) {
	d.q("#x"+x+"y"+y).classList.add(className);
}

function highlightPath(x1,y1,x2,y2, piece) {
	// TODO: interpolate the set of cells based on distance and direction:
	var cells = [];

	if (piece == 'goblin') cells = [[x1,y1],[x2,y2]];
	if (piece == 'priest') return;
}

class Unit {
	constructor(type, el, x=null, y=null, team=0) {
		this.type = type;
		this.el = el;
		this.x = x;
		this.y = y;
		this.team = team;
		units.push(this);
		return this;
	}

	placeAt(x,y) {
		d.q("#x"+x+"y"+y).appendChild(this);
	}

	_addTo(points) {
		var me = this;
		return points.map(p => [me.x+p[0], this.y+p[1]]);
	}

	validMoves() {
		var orth4 = this._addTo([[0,1],[1,0],[0,-1],[-1,0]]);
		var diag4 = this._addTo([[1,1],[-1,-1],[1,-1],[-1,1]]);
		var doglegs = this._addTo([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]);
		var orthAll = cells.filter(c => c[0] == this.x || c[1] == this.y);
		var diagAll = cells.filter(c => Math.abs(c[0] - this.x) == Math.abs(c[1] - this.y));

		switch(this.type) {
			case 'mine': return [];
			case 'goblin': return orth4;
			case 'fireskull': return doglegs;
			case 'priest': return diagAll;
			case 'golem': return orthAll;	// TODO: limit to 4
			case 'necro': return orthAll.concat(diagAll);
			case 'iceman': return orth4.concat(diag4);
		}
	}

	moveTo(x,y) {
		// Calculate animation path
	}

	target(x,y) {
		this.targeting = [x,y];
		markCell(x,y, 'targeted');
	}

	attack(x,y) {
		// Animation?
		// stats battle ATT/DEF
	}

	explode() {
		// Animate blur
		// Play sound
		// Remove back to depot
	}
}

placeAt(0,0,'mine');
placeAt(1,1,'mine');
placeAt(3,3,'king');
placeAt(4,4,'queen');
placeAt(4,5,'golem');
placeAt(5,4,'golem');
placeAt(5,6,'priest');
placeAt(6,5,'priest');
placeAt(5,8,'goblin');
placeAt(6,7,'goblin');
placeAt(7,6,'goblin');
placeAt(8,5,'goblin');
placeAt(7,8,'fireskull');
placeAt(8,7,'fireskull');
