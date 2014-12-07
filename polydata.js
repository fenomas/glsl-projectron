/* jshint unused:true, asi:true, laxcomma:true, -W097, -W008 */
/* global module */
"use strict";

// 
// Helper class to manage polygon data for this project.
// 
// vertArr is [x,y,z, xyz, xyz,   ..] per poly (len=3*numVerts)
// colArr = [r,g,b,a, rgba, rgba, ..] per poly (len=4*numVerts)
//

var vertArr, colArr,
		oldVertArr, oldColArr


// experimental settings...
var minAlpha = .01
var maxAlpha = .6
var flattenedZ = false

// typing
var floor = Math.floor
var rand = Math.random




function init(numTris) {
	vertArr = []
	colArr = []
	var i
	for (i=0; i<numTris; i++) {
		addPoly()
	}
	// sort initially
	sortPolygonsByZ()
}

// for reading in data already calculated
function setArrays(varr,carr) {
	vertArr = varr.slice()
	colArr  = carr.slice()
}



// generate scaled alpha values
function newAlpha() {
	var a = rand()
	return a*(maxAlpha-minAlpha) + minAlpha
}

// add a random poly
function addPoly() {
	for (var i=0; i<9; i++) {
		vertArr.push(rand())
	}
	if (flattenedZ) {
		var len = vertArr.length
		vertArr[len-1] = vertArr[len-4] = vertArr[len-7]
	}
	for (i=0; i<12; i++) {
		var c = (i%4==3) ? newAlpha() : rand()
		colArr.push(c)
	}
}

// add a new poly that's a clone of an existing one with one vertex moved
// conceptually like making a 3-poly into a folded quad
function clonePoly() {
	var index = floor( vertArr.length/9 * rand() )
	// clone colors as-are
	for (i=0; i<12; i++) {
		colArr.push( colArr[index*12+i] )
	}
	// clone 2 of 3 position vertices, then push a random one
	var skip = floor( 3*rand() )
	for (var i=0; i<9; i++) {
		if (floor(i/3)!=skip) { vertArr.push(vertArr[index*9+i]) }
	}
	for (i=0; i<3; i++) { vertArr.push( rand() ) }
	// in flat mode, give new position z from one of the others
	if (flattenedZ) {
		var len = vertArr.length
		vertArr[len-1] = (rand()>.5) ? vertArr[len-4] : vertArr[len-7]
	}
}

// remove a random poly
function removePoly() {
	if (vertArr.length < 18) { return } // already at 1 poly
	var index = floor( vertArr.length/9 * rand() )
	vertArr.splice(index*9, 9)
	colArr.splice(index*12, 12)
}

// randomize one RGBA/XYZ value
function mutateValue() {
	if (rand() < 0.5) { // do a color
		var i = floor( colArr.length * rand() )
		colArr[i] = (i%4==3) ? newAlpha() : rand()
	} else { // do a position
		var v = floor( vertArr.length/3 * rand() )
		var offs = (flattenedZ) ? 2 : 3
		var offset = floor( rand() * offs )
		vertArr[v*3 + offset] = rand()
	}
}

// randomize either all RGBA or all XYZ of one vertex
function mutateVertex() {
	var vnum = floor( getNumVerts()*rand() )
	if (rand() < 0.5) { // randomize a vertex's color
		colArr[vnum*4]   = rand()
		colArr[vnum*4+1] = rand()
		colArr[vnum*4+2] = rand()
		colArr[vnum*4+3] = newAlpha()
	} else { // randomize a position
		vertArr[vnum*3]   = rand()
		vertArr[vnum*3+1] = rand()
		vertArr[vnum*3+2] = rand()
		
		if (flattenedZ) { // if flat polys, change Z of whole poly
			var z = vertArr[vnum*3+2]
			var pnum = floor(vnum/3)
			vertArr[pnum*9+2] = z
			vertArr[pnum*9+5] = z
			vertArr[pnum*9+8] = z
		}
	}
}







function cacheDataNow() {
	oldVertArr = vertArr.slice()
	oldColArr = colArr.slice()
}
function restoreCachedData() {
	vertArr = oldVertArr
	colArr = oldColArr
}

function sortPolygonsByZ() {
	var i,j
	// make and sort an arr of z values averaged over each poly
	var sortdat = []
	for (i=0; i<vertArr.length; i+=9) {
		var zavg = (vertArr[i+2] + vertArr[i+5] + vertArr[i+8]) / 3
		sortdat.push({ index:i/9, z:zavg })
	}
	sortdat.sort(sortFcn)
	var oldV = vertArr.slice()
	var oldC = colArr.slice()
	for (i=0; i<sortdat.length; i++) {
		var item = sortdat[i]
		for (j=0; j<9; j++) {
			vertArr[i*9+j] = oldV[item.index*9+j]
		}
		for (j=0; j<12; j++) {
			colArr[i*12+j] =  oldC[item.index*12+j]
		}
	}
}
function sortFcn(a,b) {
	return (a.z<b.z) ? 1 : -1
}



function setAlphaRange(a,b) {
	a = parseFloat(a)
	b = parseFloat(b)
	minAlpha = Math.min(a,b)
	maxAlpha = Math.max(a,b)
}

function setFlattenedness(bool) {
	flattenedZ = bool
}


function getNumVerts() {
	return vertArr.length / 3
}


var poly = {
	  init: init
	, setArrays: setArrays
	, sortPolygonsByZ: sortPolygonsByZ
	, cacheDataNow: cacheDataNow
	, restoreCachedData: restoreCachedData
	, mutateVertex: mutateVertex
	, mutateValue: mutateValue
	, addPoly: addPoly
	, clonePoly: clonePoly
	, removePoly: removePoly
	, setAlphaRange: setAlphaRange
	, setFlattenedness: setFlattenedness
//	, debug: debug
	, makeTestData: makeTestData
//	, testAlpha: testAlpha
}
Object.defineProperty(poly, 'numVerts',{get: function(){ return getNumVerts() }})
Object.defineProperty(poly, 'vertArr', {get: function(){ return vertArr }})
Object.defineProperty(poly, 'colArr',  {get: function(){ return colArr }})
Object.defineProperty(poly, 'minAlpha',  {get: function(){ return minAlpha }})
Object.defineProperty(poly, 'maxAlpha',  {get: function(){ return maxAlpha }})
	

module.exports = poly





//function logArr(arr) {
//	console.log(arr.map(function(n){ return(Math.round(n*100)) }))
//}
//
//function debug(label) {
////	console.log(label, ' vert: ',
////							vertArr.map(function(n){ return(Math.round(n*100)) }) )
//	console.log(label, ' colr: ',
//							colArr.map(function(n){ return(Math.round(n*100)) }) )
//}
//function testAlpha(label) {
//	for (var i=3; i<colArr.length; i+=4) {
//		var c = colArr[i] 
//		if (c<minAlpha || c>maxAlpha) {
//			console.log('err?', i, c)
//			return true }
//	}
//	return false
//}
function makeTestData() {
	init(3)
	vertArr = [ 0,0,.5,  1,0,.5,  0,1,.5,
						  1,1,1,  1,0,1,  0,1,1,
						  0,0,0,  0,1,0,  1,1,0
						]
	var c = .7
	var a = .2
	colArr = [ c,0,0,a,  c,0,0,a,  c,0,0,a, 
						 0,c,0,1,  0,c,0,1,  0,c,0,1, 
						 0,0,c,a,  0,0,c,a,  0,0,c,a 
						]
	sortPolygonsByZ()
}