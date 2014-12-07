/* jshint unused:true, asi:true, laxcomma:true, -W097, -W008 */
/* global module, require, Uint8Array, console */
"use strict";





// ************************			Settings 	 ************************

var perspective = 0.2


var compareonGPU = true
var keepFewerPolysTolerance = 0

var minAlpha = .1
var maxAlpha = .7

var useFlatPolys = false





// ************************			Imports 	 ************************

var glslify = require("glslify")
var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var mat4 = require("gl-mat4")
var createFBO = require("gl-fbo")
var createTexture = require("gl-texture2d")





// shader functions
var createCameraShader = glslify({
	vertex: './shaders/camera-vert.glsl',	
	fragment: './shaders/camera-frag.glsl'
})
var createFlatShader = glslify({
	vertex: './shaders/flatTexture-vert.glsl', 
	fragment: './shaders/flatTexture-frag.glsl'
})
var createDiffShader = glslify({
	vertex: './shaders/flatTexture-vert.glsl', 
	fragment: './shaders/diffReduce4-frag.glsl'
})
var createAvgShader = glslify({
	vertex: './shaders/flatTexture-vert.glsl', 
	fragment: './shaders/avgReduce4-frag.glsl'
})



// data structure holding all polygon data
var polys = require('./polydata')
polys.setAlphaRange( minAlpha, maxAlpha )


// lots of init
var gl, fboSize, currentScore
var camShader, flatShader, diffReduceShader, avgReduceShader
var vertBuffer, colBuffer, dataVao, flatVao, camMatrix
var polyBuffersOutdated
var refTexture, referenceFB, scratchFB
var reducedFBs // array of scratch framebuffers of reduced size

var SCREEN = "screen"

var initialized = false



// save precious character resources
var rand = Math.random
var floor = Math.floor








// ************************			Init 	 ************************

// init params:
// 		reference to gl context
// 		Image object
// 		size for comparison framebuffer (2^n, default 256)
function init( glRef, imageRef, size ) {
	if (!glRef) { throw new Error("Need a reference to a gl context") }
	gl = glRef
	
	var s = parseInt(size)
	fboSize = (s && s>=16) ? s : 256
	
	// make texture for target image
	
	if (imageRef) {
		refTexture = createTexture(gl, imageRef)
	} else {
		// if no image was passed in, library is probably being used to paint output
		// so skip texture. But future calls to runGeneration will fail.
		refTexture = null
	}
	
	// gl settings
	gl.disable(gl.DEPTH_TEST)
	gl.enable(gl.BLEND)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA )

	//Create shaders
	camShader = createCameraShader(gl)
	flatShader = createFlatShader(gl)
	if (refTexture) {
		// these use highp precision and may throw errors on devices
		// but aren't needed if we're only viewing a projection,
		// so we skip their creation if there's no reference image
		diffReduceShader = createDiffShader(gl)
		avgReduceShader = createAvgShader(gl)
	}
	
	// TODO: this should be generalized...
	referenceFB = createFBO(gl, [fboSize, fboSize], {color:1} )
	referenceFB.drawn = false
	scratchFB = createFBO(gl, [fboSize, fboSize], {color:1} )
	reducedFBs = []
	var reducedSize = fboSize/4
	while (reducedSize >= 16) {
		var buff = createFBO(gl, [reducedSize, reducedSize], {color:1} )
		reducedFBs.push(buff)
		reducedSize /= 4
	}
	if (reducedFBs.length===0) { 
		throw new Error('Comparison framebuffer is too small - increase "fboSize"')
	}
	
	// init polygon data, then vertex arrays and buffers
	polys.init(1)
	
	vertBuffer = createBuffer(gl, polys.vertArr)
	colBuffer = createBuffer(gl, polys.colArr)
	polyBuffersOutdated = false

	dataVao = createVAO(gl, [
		{ "buffer": vertBuffer, "type": gl.FLOAT, "size": 3 },
		{ "buffer": colBuffer, 	"type": gl.FLOAT, "size": 4 }
	])

	var squareBuffer = createBuffer(
		gl, [-1,-1, -1,1, 1,-1, 1,1, -1,1, 1,-1] )
	flatVao = createVAO(gl, [
		{ "buffer": squareBuffer, "type": gl.FLOAT, "size": 2 }
	])
	
	// draw reference texture into ref framebuffer
	if (refTexture) {
		drawFlat(refTexture, referenceFB, true)
	}
	
	currentScore = -200
	initialized = true
}








// **************** 	run generation / do mutations 	 *******************





function runGeneration() {
	if (!initialized || !refTexture) { return }
	polys.cacheDataNow()
	var vertCount = polys.numVerts
	mutateSomething()
	// resort data, render it, and compare new score
	polys.sortPolygonsByZ()
	vertBuffer.update( polys.vertArr )
	colBuffer.update( polys.colArr )
	polyBuffersOutdated = false
	drawData( scratchFB, perspective, null )
	var scoreFn = (compareonGPU) ? compareFBOsOnGPU : compareFBOs
	var score = scoreFn(referenceFB, scratchFB)
	var keep = (score > currentScore)
	// prefer to keep change when poly has been removed with minimal effect?
	if (polys.numVerts < vertCount) {
		keep = (score >= currentScore - keepFewerPolysTolerance)
	}
	if (keep) {
		currentScore = score
	} else {
		polys.restoreCachedData()
		polyBuffersOutdated = true
		// vertBuffer/colBuffer are now wrong but leave them since it's costly
		// update them next generation or in render() if needed
	}
}


// testing a much simpler mutate function
function mutateSomething() {
	var i, num, ct=0
	// mutate 0..several values
	num = floor( 6*rand() )
	for (i=0; i<num; i++) { 	polys.mutateValue()			; ct++ 	}
	// mutate 0..some vertices
	num = floor( 6*rand()*rand() )
	for (i=0; i<num; i++) { 	polys.mutateVertex() 		; ct++	}
	// possibly add, clone or remove a poly
	if (rand() < .2) 			{ 	polys.addPoly() 				; ct++	}
	if (rand() < .3) 			{ 	polys.clonePoly() 			; ct++	}
	if (rand() < .3) 			{ 	polys.removePoly() 			; ct++	}
	if (ct===0) { polys.mutateValue() }
}











function paint( xRot, yRot ) {
	
	if (!initialized) { return }
	if (polyBuffersOutdated) {
		// buffers out of sync w/ arrays since last mutation wasn't kept
		vertBuffer.update( polys.vertArr )
		colBuffer.update( polys.colArr )
	}
	
	// rotation matrix (simple Euler angles)
	camMatrix = mat4.create()
	mat4.rotateY(camMatrix, camMatrix, yRot)
	mat4.rotateX(camMatrix, camMatrix, xRot)
	// paint polygons
	drawData( SCREEN, perspective, camMatrix )
}


function paintReference() {
	if (!initialized || !refTexture) { return }
	drawFlat( referenceFB.color[0], SCREEN, false )
}

function paintScratchBuffer() {
	if (!initialized) { return }
	drawFlat( scratchFB.color[0], SCREEN, false )
}





// ****************		Rendering helper functions 	 *****************


function drawFlat( source, target, flipY ) {
	var multY = (flipY) ? -1 : 1
	drawGeneral(
		target, flatShader, flatVao, 6, 
		["multY", "buffer"],
		[multY, source]
	)
}
function drawData( target, perspective, camMat4 ) {
	camMatrix = camMat4 || mat4.create()
	drawGeneral(
		target, camShader, dataVao, polys.numVerts, 
		["perspective", "camera"],
		[ perspective, camMatrix]
	)
}

function drawGeneral( target, shader, vao, numVs, uniNames, uniVals ) {
	if (target == SCREEN) {
		// 
	} else {
		// target is an FBO - need to clear it with alpha, then draw without
		target.bind()
		gl.colorMask(true, true, true, true);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.colorMask(true, true, true, false);
	}
	shader.bind()
	var textureNum = 0
	for (var i=0; i<uniNames.length; i++) {
		var n = uniNames[i]
		var u = uniVals[i]
		if (typeof(u.bind) === "function") {
			// bind with incrementing texture num
			shader.uniforms[n] = u.bind(textureNum++)
		} else {
			shader.uniforms[n] = u
		}
	}
	vao.bind()
	vao.draw(gl.TRIANGLES, numVs)
	vao.unbind()
}








// ******* 	Framebuffer comparison ("fitness" functions) ********


// don't use this one - it runs on CPU very slowly. Use one below.
// Perhaps useful for testing.
function compareFBOs(a,b) {
	var w = a.shape[0], h = a.shape[1]
	var abuff = new Uint8Array(w * h * 4)
	var bbuff = new Uint8Array(w * h * 4)

	a.bind()
	gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, abuff)
	b.bind()
	gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bbuff)

	var sum = 0
	// loop through by 4s, summing diff vector dotted with itself
	for (var i = 0; i < abuff.length; i+=4) {
		var dx = (abuff[i] - bbuff[i]) // 256
		var dy = (abuff[i+1] - bbuff[i+1]) // 256
		var dz = (abuff[i+2] - bbuff[i+2]) // 256
		sum += dx*dx + dy*dy + dz*dz
	}
	sum /= 256
	// color diff averaged over pixels
	var avg = sum / w / h
	// scale score so as to be 100 at perfect match
	return 100 * (1-avg/128)
}


// compare FBOs - on GPU version
function compareFBOsOnGPU(a,b) {
	var uNames, uVals, i
	// run diff shader, which reduces size by 4, drawing into first reduced FB
	uNames = ["multY", "inputDim", "bufferA", "bufferB"]
	uVals = [ 1, a.shape[0], a.color[0], b.color[0] ]
	drawGeneral( reducedFBs[0], diffReduceShader, flatVao, 6, uNames, uVals )
	// draw into rest of FBs with average shader, reducing size each time
	for (i=1; i<reducedFBs.length; i++) {
		uNames = ["multY", "inputDim", "buffer" ]
		uVals = [ 1, reducedFBs[i-1].shape[0], reducedFBs[i-1].color[0] ]
		drawGeneral( reducedFBs[i], avgReduceShader, flatVao, 6, uNames, uVals )
	}
	// output buffer is now of width/height <= 16
	// read out pixel.rg data and average. R channel is 256x more significant
	var buff = reducedFBs[ reducedFBs.length-1 ]
	var w = buff.shape[0]
	var uarr = new Uint8Array(w * w * 4)
	buff.bind()
	gl.readPixels(0, 0, w, w, gl.RGBA, gl.UNSIGNED_BYTE, uarr)

	var sum = 0
	var mag = 255
	// sum up r + g/255 + b/255/255
	for (i=0; i<uarr.length; i+=4) {
		sum += uarr[i] + (uarr[i+1] + uarr[i+2]/mag)/mag
	}
	var avg = 3 * sum/w/w // times 3 to undo scaling factor in shader
	// average dot product of (src.rgv-tgt.rgb) with itself

	// scale score so as to be 100 at perfect match
	return 100 * (1-avg/128)
}

























// ************					import and export  				****************


// ad-hoc data format:
// vert-xyz,p1,p2,..pn,col-rgba,c1,c2,..cn
function exportData() {
	return 'vert-xyz,' + polys.vertArr.join() + "\n" +
		',col-rgba,' + polys.colArr.join()
}

function importData(s) {
	var curr, v=[], c=[]
	var arr = s.split(',')
	arr.forEach(function(s) {
		if (s=="vert-xyz") { curr = v }
		else if (s=="col-rgba") { curr = c }
		else {
			curr.push( parseFloat(s) )
		}
	})
	// this is all pretty ad-hoc but it will work well enough for a demo
	if (v.length/3 === c.length/4) {
		polys.setArrays(v,c)
		vertBuffer.update( polys.vertArr )
		colBuffer.update( polys.colArr )
		if (refTexture) {
			// run a comparison so as to have a correct score
			drawData(scratchFB, perspective, null)
			var scoreFn = (compareonGPU) ? compareFBOsOnGPU : compareFBOs
			currentScore = scoreFn(referenceFB, scratchFB)
		}
	}
}










//function colorDebug() {
//	console.log("reference: ")
//	console.log(colorDebugBuff(referenceFB, 4))
//	console.log("scratch: ")
//	console.log(colorDebugBuff(scratchFB, 4))
//	console.log("reduced by 4: ")
//	console.log(colorDebugBuff(red4Buffer, 4))
//	console.log("reduced by 16: ")
//	console.log(colorDebugBuff(red16Buffer, 4))
//	console.log("reduced by 64: ")
//	console.log(colorDebugBuff(red64Buffer, 4))
//}
//function colorDebugBuff(buff, w){
//	var gl = buff.gl
//	var uarr = new Uint8Array( w * 1 * 4)
//	buff.bind()
//	gl.readPixels(0, 0, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, uarr)
//	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
//	return uarr
//}
function logArr(arr) {
	console.log(arr.map(function(n){ return(Math.round(n*100)) }))
}
if (0) { logArr(); log() }
function log(s) {
	console.log(s)
}






// ******************		Export an API  ******************

var proj = {
	  init: init
	, runGeneration: runGeneration
	, paint: paint
	, paintReference: paintReference
	, paintScratchBuffer: paintScratchBuffer
	, exportData: exportData
	, importData: importData
}


// gettable/settable params:

Object.defineProperty( proj, 'score', {
	get: function(){ 	return currentScore  } 
})

Object.defineProperty( proj, 'numPolys', {
	get: function(){ 	return polys.numVerts/3  } 
})


Object.defineProperty( proj, 'compareonGPU', {
		get: function(){ 	return compareonGPU }
	,	set: function(b){ compareonGPU = !!b }
})


Object.defineProperty( proj, 'fewerPolysTolerance', {
		get: function(){ 	return keepFewerPolysTolerance }
	,	set: function(t){ keepFewerPolysTolerance = t; console.log(t) }
})


Object.defineProperty( proj, 'useFlatPolys', {
		get: function(){ 	return useFlatPolys }
	,	set: function(b){
		useFlatPolys = !!b
		polys.setFlattenedness(useFlatPolys)
	}
})

function setAlphas(a,b) {
	minAlpha = a
	maxAlpha = b
	polys.setAlphaRange( a, b )
}
Object.defineProperty( proj, 'minAlpha', {
		get: function(){ 	return minAlpha }
	,	set: function(a){ setAlphas(a,maxAlpha) }
})
Object.defineProperty( proj, 'maxAlpha', {
		get: function(){ 	return maxAlpha }
	,	set: function(a){ setAlphas(minAlpha,a) }
})





module.exports = proj



