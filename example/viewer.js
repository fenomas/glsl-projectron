/* jshint asi:true, laxcomma:true, -W008, -W060 */ 
/* global require, document, console, window */


// imports
var $ = window.$ = require('browserify-zepto')
var proj = require('../index.js')


// get data to display from the embedding page
// data is output from proj.exportData(), stringified
// probably a better way to do this, but for now...
var polyDat = $('#viewData').html()


//var div = document.getElementById('canvas-container')
//div.style.width = div.style.height = "500px"


// create a shell and get started
var shell = require("gl-now")({
	element:'canvas-container',
	clearColor:[0,0,0,1],
	glOptions:{
		alpha: false
	}
})

window.shell = shell
shell.preventDefaults = false	

shell.on('gl-init', function() {
	
	proj.init(shell.gl)
	
	proj.importData( polyDat )
	
})

shell.on("gl-error", function(e) {
	document.write("Oops! Looks like WebGL isn't supported :(")
  throw new Error("WebGL not supported :(")
})




shell.on("gl-render", function(t) {
	
	// update camera focus point from mouse dragging
	updateCameraXY()
	
	proj.paint(cameraXY[1], cameraXY[0] )
	
})





// mouse tracking
var dragging = false
var dragStartLoc = [0,0]
var dragLoc = [0,0]
var cameraXY = [0,0]

$('body').bind('mousedown touchstart', function(e) {
	if (e.target.nodeName==="CANVAS") {
		dragging = true
		var ev = (e.touches) ? e.touches[0] : e
		dragLoc = dragStartLoc = [ ev.pageX, ev.pageY ]
	}
})

$('body').bind('mousemove touchmove	', function(e) {
	if (e.target.nodeName==="CANVAS") {
		var ev = (e.touches) ? e.touches[0] : e
		dragLoc = [ ev.pageX, ev.pageY ]
	}
})

$('body').bind('mouseup touchend', function(e) {
	dragging = false
})


function updateCameraXY() {
	var tgt = [0,0]
	if (dragging) {
		tgt = [
			(dragLoc[0]-dragStartLoc[0]) / -200,
			(dragLoc[1]-dragStartLoc[1]) / -200
		]
	}
	var ease = 0.1
	cameraXY[0] += ease * (tgt[0] - cameraXY[0])
	cameraXY[1] += ease * (tgt[1] - cameraXY[1])
}




