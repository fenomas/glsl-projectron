precision mediump float;

attribute vec4 position;
attribute vec4 vertColor;

uniform float perspective;
uniform mat4 camera;

varying vec4 fragColor;

void main() {
	
	// transform xyz inputs from [0..1] to clipspace [-1..1]
	vec4 pos = 2.0 * position - 1.0;
	
	// squash z and move back a bit so overall shape is visible
	// when rotated
	pos.z = pos.z * 0.75 + 0.25;
	
	// rotate by camera transform
	pos = camera * pos;
	
	// apply perspective 
	float w = 1.0 + perspective*( pos.z );
	
	// squash z more to lessen getting clipped by frustum
	pos.z = pos.z * 0.5;
	
	// outputs
	gl_Position = vec4(pos.xyz, w);
	fragColor = vertColor;
}