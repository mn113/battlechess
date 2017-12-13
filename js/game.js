/* eslint-env browser */

Array.prototype.random = function() {
	return this[Math.floor(Math.random() * this.length)];
};
// Aliases
var d = document;
d.e = d.createElement;
d.q = d.querySelector;
d.qa = d.querySelectorAll;
var $ga = d.q("#ga");

// Unicode icons:
//const PIECES = ["🤖","👻","😈","👹","🦄","🐲","🐍","💣","🕸️","🏂"];
const PLANTS = ["🎄","🌲","🌳","🌵"];
//const WEAP = ["🔪","🗡️","🔫","⛏️","⛸️","💥","🔥"];
//const DIRS = ["⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️"];

// Text
const GT = {
	"mine": "Mine. If armed, will detonate when anything steps on it.",
	"goblin": "Goblin. Can melee attack one square ahead in the direction he is facing.",
	"fireskull": "Fire Skull. Moves in 2x1 doglegs, jumping over other units to attack its target.",
	"priest": "Priest. Moves only on diagonals. Continues to where you tell him, regardless of enemies.",
	"golem": "Golem. Can move in 4 directions (not diagonals), but only 4 steps. Prefers to stay still and use his machine gun.",
	"queen": "Queen. Unlimited movement in 8 directions. Will only kill one enemy per turn.",
	"king": "King. Heavily armoured, he can move or attack 1 square in 8 directions."
};

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
	}
}

// Tooltips:
d.qa("#toolbox i").forEach(el => {
	d.addEventListener('mouseon', () => { console.log(GT[el.classList[0]]); } );
});

function piece(className, team=0) {
	return d.e('i').addClass(className);
}

function placeAt(x, y, type, team) {
	d.q("#x"+x+"y"+y).appendChild(piece(type, team));
}

placeAt(0,0,'mine');
placeAt(3,3,'king');
placeAt(4,4,'queen');
placeAt(5,5,'golem');
placeAt(6,6,'priest');
placeAt(7,7,'goblin');
placeAt(8,8,'fireskull');
