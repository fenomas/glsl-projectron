/*!
 * glsl-projectron: experimental GPGPU thingy
 * @url      github.com/andyhall/glsl-projectron
 * @author   Andy Hall <andy@fenomas.com>
 * @license  MIT
 */

import { PolyData } from './polydata'

var createTexture = require('gl-texture2d')
var createBuffer = require('gl-buffer')
var createShader = require('gl-shader')
var createFBO = require('gl-fbo')
var createVAO = require('gl-vao')
var glslify = require('glslify')
var mat4 = require('gl-mat4')




/*
 * 
 * 
 *		Projectron (basically rewritten)
 * 
 * 
 * 		params: 
 * 		 - canvas to use for gl context and drawing output
 * 		 - size for internal comparison bitmaps
 * 
*/


export function Projectron(canvas, size) {
	if (!canvas || !canvas.getContext) throw 'Error: pass in a canvas element!'
	size = parseInt(size) || 256
	var powerOfTwoSize = Math.pow(2, Math.round(Math.log2(size)))

	var gl = canvas.getContext('webgl', { alpha: false })
	if (!gl) throw 'Error: webgl not supported?'


	// global settings
	var perspective = 0.2
	var keepFewerPolysTolerance = 0
	var flattenZ = 0
	var fboSize = Math.max(32, powerOfTwoSize)
	var tgtTexture = null
	var currentScore = -100




	/*
	 * 
	 * 		API
	 * 
	*/

	this.setTargetImage = setTargetImage
	this.setAlphaRange = (a, b) => polys.setAlphaRange(a, b)
	this.setFewerPolysTolerance = n => { keepFewerPolysTolerance = n }

	this.getScore = () => currentScore
	this.getNumPolys = () => polys.getNumPolys()
	this.draw = (x, y) => { paint(x, y) }
	this.drawTargetImage = () => { paintReference() }
	this._drawScratchImage = () => { paintScratchBuffer() }







	/*
	 * 
	 * 		general init
	 * 
	*/


	// gl settings
	gl.disable(gl.DEPTH_TEST)
	gl.enable(gl.BLEND)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)


	// require and compile shaders
	var comp = {}
	var shaderReq = require.context('./shaders', false, /glsl$/)
	shaderReq.keys().forEach(str => {
		var name = /([\w-]+)/.exec(str)[1]
		var src = shaderReq(str).default
		comp[name] = glslify(src)
	})
	var camShader = createShader(gl, comp['camera-vert'], comp['camera-frag'])
	var flatShader = createShader(gl, comp['flatTexture-vert'], comp['flatTexture-frag'])
	var diffShader = createShader(gl, comp['flatTexture-vert'], comp['diffReduce4-frag'])
	var avgShader = createShader(gl, comp['flatTexture-vert'], comp['avgReduce4-frag'])



	// TODO: generalize?
	var referenceFB = createFBO(gl, [fboSize, fboSize], { color: 1 })
	referenceFB.drawn = false
	var scratchFB = createFBO(gl, [fboSize, fboSize], { color: 1 })
	var reducedFBs = []
	var reducedSize = fboSize / 4
	while (reducedSize >= 16) {
		var buff = createFBO(gl, [reducedSize, reducedSize], { color: 1 })
		reducedFBs.push(buff)
		reducedSize /= 4
	}
	if (reducedFBs.length === 0) {
		throw new Error('Comparison framebuffer is too small - increase "fboSize"')
	}


	// init polygon data, then vertex arrays and buffers
	var polys = new PolyData()
	var vertBuffer = createBuffer(gl, polys.getVertArray())
	var colBuffer = createBuffer(gl, polys.getColorArray())
	var polyBuffersOutdated = false


	var dataVao = createVAO(gl, [
		{ "buffer": vertBuffer, "type": gl.FLOAT, "size": 3 },
		{ "buffer": colBuffer, "type": gl.FLOAT, "size": 4 }
	])
	var squareBuffer = createBuffer(
		gl, [-1, -1, -1, 1, 1, -1, 1, 1, -1, 1, 1, -1])
	var flatVao = createVAO(gl, [
		{ "buffer": squareBuffer, "type": gl.FLOAT, "size": 2 }
	])

	var camMatrix = mat4.create()
	var rand = () => Math.random()







	/*
	 * 
	 * 
	 * 			run generation / do mutations
	 * 
	 * 
	*/


	this.runGeneration = function () {
		if (!tgtTexture) return

		polys.cacheDataNow()
		var vertCount = polys.getNumVerts()
		mutateSomething()
		// resort data, render it, and compare new score
		polys.sortPolygonsByZ()
		vertBuffer.update(polys.getVertArray())
		colBuffer.update(polys.getColorArray())
		polyBuffersOutdated = false

		drawData(scratchFB, perspective, null)
		var score = compareFBOs(referenceFB, scratchFB)
		var keep = (score > currentScore)
		// prefer to keep change when poly has been removed with minimal effect?
		if (polys.getNumVerts() < vertCount) {
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


	function mutateSomething() {
		// mutate one thing
		var r = rand()
		if (r < 0.25) {
			polys.mutateValue()
		} else if (r < 0.5) {
			polys.mutateVertex()
		} else if (r < 0.8) {
			polys.addPoly()
		} else {
			polys.removePoly()
		}
	}










	/*
	 * 
	 * 
	 * 			image paint / update functions
	 * 
	 * 
	*/


	function setTargetImage(image) {
		prerender()
		tgtTexture = createTexture(gl, image)
		drawFlat(tgtTexture, referenceFB, true)
		// run a comparison so as to have a correct score
		drawData(scratchFB, perspective, null)
		currentScore = compareFBOs(referenceFB, scratchFB)
	}


	function prerender() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
		gl.clearStencil(0)
		gl.clearColor(0, 0, 0, 1)
		gl.clearDepth(1)
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)
	}


	function paint(xRot, yRot) {
		if (polyBuffersOutdated) {
			// buffers out of sync w/ arrays since last mutation wasn't kept
			vertBuffer.update(polys.getVertArray())
			colBuffer.update(polys.getColorArray())
		}
		// rotation matrix (simple Euler angles)
		camMatrix = mat4.create()
		mat4.rotateY(camMatrix, camMatrix, xRot || 0)
		mat4.rotateX(camMatrix, camMatrix, yRot || 0)
		// paint polygons
		drawData(null, perspective, camMatrix)
	}


	function paintReference() {
		if (!tgtTexture) return
		drawFlat(referenceFB.color[0], null, false)
	}

	function paintScratchBuffer() {
		if (!tgtTexture) return
		drawFlat(scratchFB.color[0], null, false)
	}



	function drawFlat(source, target, flipY) {
		var multY = (flipY) ? -1 : 1
		drawGeneral(
			target, flatShader, flatVao, 6,
			["multY", "buffer"],
			[multY, source]
		)
	}

	function drawData(target, perspective, camMat4) {
		camMatrix = camMat4 || mat4.create()
		drawGeneral(
			target, camShader, dataVao, polys.getNumVerts(),
			["perspective", "camera"],
			[perspective, camMatrix]
		)
	}

	function drawGeneral(target, shader, vao, numVs, uniNames, uniVals) {

		if (target) {
			// target is an FBO - need to clear it with alpha, then draw without
			target.bind()
			gl.colorMask(true, true, true, true)
			gl.clear(gl.COLOR_BUFFER_BIT)
			gl.colorMask(true, true, true, false)
		} else {
			prerender()
			// gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		}

		shader.bind()
		var textureNum = 0
		for (var i = 0; i < uniNames.length; i++) {
			var n = uniNames[i]
			var u = uniVals[i]
			if (typeof (u.bind) === "function") {
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







	/*
	 * 
	 * 
	 * 			Framebuffer comparison ("fitness")
	 * 
	 * 
	*/

	function compareFBOs(a, b) {
		// if (compareonGPU) return compareFBOsOnCPU(a, b)
		return compareFBOsOnGPU(a, b)
	}

	// compare FBOs - on GPU version
	function compareFBOsOnGPU(a, b) {
		var uNames, uVals, i
		// run diff shader, which reduces size by 4, drawing into first reduced FB
		uNames = ["multY", "inputDim", "bufferA", "bufferB"]
		uVals = [1, a.shape[0], a.color[0], b.color[0]]
		drawGeneral(reducedFBs[0], diffShader, flatVao, 6, uNames, uVals)
		// draw into rest of FBs with average shader, reducing size each time
		for (i = 1; i < reducedFBs.length; i++) {
			uNames = ["multY", "inputDim", "buffer"]
			uVals = [1, reducedFBs[i - 1].shape[0], reducedFBs[i - 1].color[0]]
			drawGeneral(reducedFBs[i], avgShader, flatVao, 6, uNames, uVals)
		}
		// output buffer is now of width/height <= 16
		// read out pixel.rg data and average. R channel is 256x more significant
		var buff = reducedFBs[reducedFBs.length - 1]
		var w = buff.shape[0]
		var uarr = new Uint8Array(w * w * 4)
		buff.bind()
		gl.readPixels(0, 0, w, w, gl.RGBA, gl.UNSIGNED_BYTE, uarr)

		var sum = 0
		var mag = 255
		// sum up r + g/255 + b/255/255
		for (i = 0; i < uarr.length; i += 4) {
			sum += uarr[i] + (uarr[i + 1] + uarr[i + 2] / mag) / mag
		}
		var avg = 3 * sum / w / w // times 3 to undo scaling factor in shader
		// average dot product of (src.rgv-tgt.rgb) with itself

		// scale score so as to be 100 at perfect match
		return 100 * (1 - avg / 128)
	}


	// CPU implementation of above.
	// Probably no longer needed, unless for testing

	// function compareFBOsOnCPU(a, b) {
	// 	var w = a.shape[0], h = a.shape[1]
	// 	var abuff = new Uint8Array(w * h * 4)
	// 	var bbuff = new Uint8Array(w * h * 4)
	// 	a.bind()
	// 	gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, abuff)
	// 	b.bind()
	// 	gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bbuff)
	// 	var sum = 0
	// 	// loop through by 4s, summing diff vector dotted with itself
	// 	for (var i = 0; i < abuff.length; i += 4) {
	// 		var dx = (abuff[i] - bbuff[i]) // 256
	// 		var dy = (abuff[i + 1] - bbuff[i + 1]) // 256
	// 		var dz = (abuff[i + 2] - bbuff[i + 2]) // 256
	// 		sum += dx * dx + dy * dy + dz * dz
	// 	}
	// 	sum /= 256
	// 	// color diff averaged over pixels
	// 	var avg = sum / w / h
	// 	// scale score so as to be 100 at perfect match
	// 	return 100 * (1 - avg / 128)
	// }













	/*
	 * 
	 * 
	 * 			import and export
	 * 
	 * 
	*/


	// ad-hoc data format:
	// vert-xyz,p1,p2,..pn,col-rgba,c1,c2,..cn
	this.exportData = function () {
		var s = 'vert-xyz,'
		s += polys.getVertArray().map(n => n.toFixed(8)).join()
		s += ',\ncol-rgba,'
		s += polys.getColorArray().map(n => n.toFixed(5)).join()
		return s
	}

	this.importData = function (s) {
		var curr, v = [], c = []
		var arr = s.split(',')
		arr.forEach(function (s) {
			if (s.indexOf('vert-xyz') > -1) { curr = v }
			else if (s.indexOf('col-rgba') > -1) { curr = c }
			else { curr.push(parseFloat(s)) }
		})
		// this is all pretty ad-hoc but it will work well enough for a demo
		if (v.length / 3 === c.length / 4) {
			polys.setArrays(v, c)
			vertBuffer.update(polys.getVertArray())
			colBuffer.update(polys.getColorArray())
			if (tgtTexture) {
				// run a comparison so as to have a correct score
				drawData(scratchFB, perspective, null)
				currentScore = compareFBOs(referenceFB, scratchFB)
			}
			return true
		}
	}


}
