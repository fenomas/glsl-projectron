precision mediump float;

attribute vec2 position;
uniform float multY;

varying vec2 uv;

void main() {
	gl_Position = vec4(position,0.0,1.0);
	
//	flip y for texture loookup
	uv = position * vec2( 1.0, multY );
	uv = 0.5 * (uv+1.0);
	
}