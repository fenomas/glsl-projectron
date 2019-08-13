precision highp float;

uniform float inputDim;
uniform sampler2D bufferA;
uniform sampler2D bufferB;

const float mag = 255.0; // magnitude for packing float into rgb channels

varying vec2 uv;

void main() {
	
	// size of an input and output pixel in uv
	float ip = 1.0 / inputDim;
	float op = ip * 4.0;
	
	// lower left corner of square of pixels to be reduced
	vec2 p = vec2(floor(uv.x/op)*op, floor(uv.y/op)*op );
	
	// find the distance betweens A and B pixels
	// and average it over a 4x4 square
	float sum = 0.0;
	vec2 offset = vec2(0.0);
	
	vec3 diff;
	
	// 'score' of similarity between image pixels A,B is basically:
	// 		average( dot( (A-B), (A-B) ) )
	
	for (int i=0; i<4; ++i) {
		for (int j=0; j<4; ++j) {
			
			diff = texture2D(bufferA, p+offset).rgb - 
				texture2D(bufferB, p+offset).rgb;
			
			sum += dot(diff,diff);
			
			offset.y += ip;
		}
		offset.x += ip;
		offset.y = 0.0;
	}
	float avg = sum/16.0;
	
	// prevent clipping - scale avg to [0..1]
	avg /= 3.0;
	
	// divide magnitude into channels
	float r = floor( avg*mag ) / mag;
	float g = floor((avg-r)*mag*mag) / mag;
	float b = ((avg-r)*mag - g) * mag;
	
	gl_FragColor = vec4( r, g, b, 1.0 );
	
}