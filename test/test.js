/* jshint asi:true, laxcomma:true, -W008, -W060, -W004 */ 
/* global require, document, console */

var test = require('tape')
require('tap-browser-color')()

var p


test('polydata.sanity checks', function(t) {
	t.doesNotThrow(function() {
		p = require('../polydata.js')
		p.init(3)
		t.equals(p.numVerts, 9, "poly numVerts")
	}, null, 'no thrown exceptions')
	t.end() 
})


test('polydata.caching', function(t) {
	t.doesNotThrow(function() {
		p = require('../polydata.js')
		p.init(10)
		p.cacheDataNow()
		var v = p.vertArr.slice()
		p.init(2)
		p.restoreCachedData()
		t.deepEquals( v, p.vertArr, 'cached data matches' )
	}, 1, 'no thrown exceptions')
	t.end() 
})



test('polydata.flattenedZ', function(t) {
	t.doesNotThrow(function() {
		p = require('../polydata.js')

		var reps = 30
		p.setFlattenedness( true )
		p.init(reps)
		t.ok( testZmatching(p.vertArr),
				 'Zs match after init')

		p.init(reps)
		for (var i=0; i<reps; i++) {
			p.clonePoly()
		}
		t.ok( testZmatching(p.vertArr),
				 'Zs match after cloning')

		p.init(reps)
		for (var i=0; i<reps; i++) {
			p.mutateValue()
		}
		t.ok( testZmatching(p.vertArr),
				 'Zs match after mutateValue')

		p.init(reps)
		for (var i=0; i<reps; i++) {
			p.mutateVertex()
		}
		t.ok( testZmatching(p.vertArr),
				 'Zs match after mutateVertex')



	}, null, 'no thrown exceptions')
	t.end() 
})


// input array of [x,y,z, x,y,z, .. ]
// check that all zs match for each 3-tuple of xyz
function testZmatching(varr) {
	var len = varr.length
	if (len%9 !== 0) { return false }
	for (var i=0; i<len; i+=9) {
		var z = varr[i+2]
		if (z != varr[i+5]) { return false }
		if (z != varr[i+8]) { return false }
	}
	return true
}









test('polydata.flattenedZ', function(t) {

	var floor = Math.floor
	var rand = Math.random

	var a = [0,0,0,0,0]

	function mutTest() {
		var i, num, ct=0
		// mutate 1..several values
		num = floor( 6*rand() )
		for (i=0; i<num; i++) { a[0]++; ct++ }
		// mutate 0..some vertices
		num = floor( 6*rand()*rand() )
		for (i=0; i<num; i++) { a[1]++; ct++ }
		// possibly add, clone or remove a poly
		if (rand() < .2) { 	a[2]++	; ct++		}
		if (rand() < .3) { 	a[3]++ 	; ct++	}
		if (rand() < .3) { 	a[4]++ 	; ct++	}
	}
	var times = 1000000
	for (var i=0; i<times; i++) { 
		mutTest()
	}
	var b = a.map(function(n){
		return Math.round(1000*n/times) / 1000
	})
	
	t.ok(true, a.join(", "))
	t.ok(true, b.join(", "))

	t.end()
})













