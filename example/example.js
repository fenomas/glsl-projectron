/* jshint unused:true, asi:true, laxcomma:true, -W008, -W060, -W097	 */ 
/* global require, document, window, Image */
"use strict";

// TODO: remove some of the above settings


// imports
var $ = window.$ = require('browserify-zepto')
var proj = require('../')



var clearColor = [ 0, 0, 0, 1 ]
var htmlUpdateEvery = 750 //ms

//var imagePath = './img/mona512.jpg'
var imagePath = './img/lena.png'

var showReference = false
var showScratch = false

var gpuGenerationsPerFrame = 50
var generationCount
var lastTime, lastGen




var div = document.getElementById('container')

// create a canvas shell to render output
var shell = require("gl-now")({
	element:div,
	clearColor:clearColor,
	glOptions:{
		alpha:false
	}
})

shell.preventDefaults = false	

shell.on('init', function() {
	shell.paused = true
})


shell.on('gl-init', function() {
	// start loading target image - when loaded, init proj
	var img = new Image()
	img.onload = function() {
		initProjectFromImage(img)
	}
	img.src = imagePath;
})


shell.on("gl-error", function(e) {
	throw new Error("WebGL not supported :(  "+e)
})




function initProjectFromImage( img ) {
	proj.init( shell.gl, img )
	generationCount = 0
	lastTime = 0
	lastGen = 0
	updateHTML()
}


// on-tick and on-render functions

shell.on("tick", function() {
	// note this only gets called when shell.paused is false
	var numGen = (proj.compareonGPU) ? gpuGenerationsPerFrame : 1
	// advance N generations (N=1 when running on CPU)
	for (var i=0; i<numGen; i++) {
		proj.runGeneration()
		generationCount++
	}
})


shell.on("gl-render", function() {
	// update camera focus point from mouse dragging
	updateCameraXY()
	
	// tell projection to paint to the canvas
	if (showReference) {
		proj.paintReference()
	} else if (showScratch) {
		proj.paintScratchBuffer()
	} else {
		// paint polygons with x/y rotation (euler angles)
		proj.paint(cameraXY[1], cameraXY[0] )
	}
	
	// update HTML (speed, generation count, etc.)
	if (!shell.paused) {
		updateHTML()
	}
})







// ***********   Controls - UI init and event handlers ****************



$('#paused').on('change',function(el) { 			// paused checkbox
	var bool = el.target.checked
	shell.paused = bool
	lastTime = Date.now()
	lastGen = generationCount
}).prop('checked', true)


$('#useGPU').on('change',function(el) { 			// use GPU checkbox
	var bool = el.target.checked
	proj.compareonGPU = bool
	$('#gensPerFrame')
		.prop('disabled', !bool)
		.parent().css('color', (bool) ? '' : 'lightgray' )
}).prop('checked', proj.compareonGPU)


$('#gensPerFrame').on('change',function(el) {		// gens/frame pulldown
	var s = el.target.item(el.target.selectedIndex).value
	gpuGenerationsPerFrame = parseInt(s)
}).val( gpuGenerationsPerFrame ) // needs to match value in pulldown...


$('#fewerPolys').on('change',function(el) {			// "prefer fewer polys" pulldown
	var i = el.target.selectedIndex
	// score tolerance within which to prefer fewer polys
	var scoreTolerance = [
		0, .0001, .001, .01, .1
	][i]
	proj.fewerPolysTolerance = scoreTolerance
}).select(0)


$('#flat').on('change',function(el) { 				// flat polys checkbox
	proj.useFlatPolys = el.target.checked
}).prop('checked', false)


$('#showRef').on('change',function(el) {			// "show reference" CB
	showReference = el.target.checked
}).prop('checked', false)

$('#showScr').on('change',function(el) {			// "show scratch" CB
	showScratch = el.target.checked
}).prop('checked', false)


$('#export').on('click', function() {				// export button
	$('#data').val( proj.exportData() )
})

$('#import').on('click', function() {				// import button
	var really = true
	if(proj.numPolys > 1) {
		really = window.confirm('Overwrite current data?')
	}
	if (really) {
		proj.importData( $('#data').val() )
	}
})

function setAlphas() {
	var a1 = parseFloat( $('#minA').val() )
	var a2 = parseFloat( $('#maxA').val() )
	proj.minAlpha = Math.min(a1,a2)
	proj.maxAlpha = Math.max(a1,a2)
}
$('#minA').on('change', setAlphas).val( proj.minAlpha )
	.val( proj.minAlpha )

$('#maxA').on('change', setAlphas).val( proj.maxAlpha )
	.val( proj.maxAlpha )




// ******************   View - HTML updates 	***********************




// write out score, etc., on a suitable delay
function updateHTML() {
	var now = Date.now()
	if (now-lastTime > htmlUpdateEvery) {
		var gens = generationCount
		$('#gens').val( gens )
		var gps = (gens-lastGen)/(now-lastTime)*1000
		$('#gps').val( Math.round(gps) )
		$('#polys').val( proj.numPolys )
		var round = 10000
		$('#score').val( Math.round( proj.score *round)/round )
		lastGen = gens
		lastTime = now
	}
}











// ***************   Mouse dragging/tracking 	*******************


var mouseIsDown = false
var clickLoc = [0,0]
var cameraXY = [0,0]
document.addEventListener("mousedown", function(e) {
	if (e.target.nodeName==="CANVAS") {
		clickLoc = [shell.mouseX, shell.mouseY]
		mouseIsDown = true
	}
})
document.addEventListener("mouseup", function() {
	mouseIsDown = false
})

function updateCameraXY() {
	var tgt = [0,0]
	if (mouseIsDown) {
		tgt = [
			(shell.mouseX-clickLoc[0]) / -200,
			(shell.mouseY-clickLoc[1]) / -200
		]
	}
	var ease = 0.1
	cameraXY[0] += ease * (tgt[0] - cameraXY[0])
	cameraXY[1] += ease * (tgt[1] - cameraXY[1])
}






// *********   Experimental image drag/drop support? 	**********



var dropTarget = document.body

require("drag-and-drop-files")(dropTarget, function(files) {
  var file = files[0]
	console.log('experimental drag/drop support: attempting to use file: '+file)
	var reader = new FileReader()
	reader.onloadend = function(e) {
		var img = new Image
		img.src = e.target.result
		initProjectFromImage( img )
	}
	reader.readAsDataURL(file)
})



