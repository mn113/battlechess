/* eslint-disable no-unused-vars */
function pixCanv(text, scale=3) {
	var chars = {
		A:'010101101111101',
		B:'110101111101110',
		C:'111100100100111',
		D:'110101101101110',
		E:'111100111100111',
		F:'111100110100100',
		G:'01101000101110010110',
		H:'101101111101101',
		I:'111010010010111',
		J:'111001001101111',
		K:'10011010110010101001',
		L:'100100100100111',
		M:'1101110101101011000110001',
		N:'10011101101110011001',
		O:'111101101101111',
		P:'111101111100100',
		Q:'01101001100110111111',
		R:'110101101110101',
		S:'111100111001111',
		T:'111010010010010',
		U:'101101101101111',
		V:'101101101101010',
		W:'1000110001101011010101010',
		X:'1000101010001000101010001',
		Y:'101101010010010',
		Z:'1111100010001000100011111',
		0:'111101101101111',
		1:'0111010101',
		2:'111001111100111',
		3:'111001111001111',
		4:'101101111001001',
		5:'111100111001111',
		6:'111100111101111',
		7:'111001001001001',
		8:'111101111101111',
		9:'111101111001111',
		" ":'000000000000000',
		",":'0000000110',
		".":'00010',
		":":'01010'
	};

	var container = document.createElement('p');

	function draw(str, scale) {
		str = str.toUpperCase(); // because I only did uppercase chars
		for (var i = 0; i < str.length; i++) {
			var cMap = chars[str.charAt(i)];
			if (cMap) container.appendChild(drawChar(cMap, scale));
		}
	}

	function drawChar(cMap, scale) {
		var canvas = document.createElement('canvas');
		canvas.height = scale * 5;
		canvas.width = scale * cMap.length / 5;
		var context = canvas.getContext('2d');
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = 'yellow';

		var currX = 0;
		var currY = 0;
		//var addX = 0;
		var width = cMap.length / 5;
		for (var y = 0; y < 5; y++) {
			for (var x = 0; x < width; x++) {
				if (cMap[width * y + x] === '1') {
					context.fillRect(currX + x * scale, currY, scale, scale);
				}
			}
			//addX = Math.max(addX, width * scale);
			currY += scale;
		}
		//currX += scale + addX;
		return canvas;
	}

	draw(text, scale);
	return container;
}
