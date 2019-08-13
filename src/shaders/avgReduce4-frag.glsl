precision highp float;

uniform float inputDim;
uniform sampler2D buffer;

const float mag = 255.0; // magnitude for packing float into rgb channels

varying vec2 uv;

void main() {
	
	// size of an input and output pixel in uv
	float ip = 1.0 / inputDim;
	float op = ip * 4.0;
	
	// lower left corner of square of pixels to be reduced
	vec2 p = vec2(floor(uv.x/op)*op, floor(uv.y/op)*op );
	
	// average values in rg over a 4x4 square. 
	// r channel is 256 times more significant than g.
	float sum = 0.0;
	vec2 offset = vec2(0.0);
	vec4 col;
	
	for (int i=0; i<4; ++i) {
		for (int j=0; j<4; ++j) {
			col = texture2D(buffer, p+offset);
			sum += col.r + (col.g + col.b/mag)/mag;
			offset.y += ip;
		}
		offset.x += ip;
		offset.y = 0.0;
	}
	float avg = sum/16.0;
	
	// divide magnitude into channels
	float r = floor( avg*mag ) / mag;
	float g = floor((avg-r)*mag*mag) / mag;
	float b = ((avg-r)*mag - g) * mag;
		
	gl_FragColor = vec4( r, g, b, 1.0 );
	
}