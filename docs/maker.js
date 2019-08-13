

import { Projectron } from '../src'
var $ = s => document.getElementById(s)




/*
 * 
 * 
 *      init projectron
 * 
 * 
*/

// allow internal comparison texture size to be specified in query
var size = 256
var s = parseInt(new URLSearchParams(location.search).get('size'))
if (s > 8) size = s

var canvas = document.getElementById('view')
var proj = new Projectron(canvas, size)

var img = new Image()
img.onload = () => { setImage(img) }
img.src = './img/lena.png'

// img.src = './img/mona512.png'
// img.src = './img/teapot512.png'


function setImage(img) {
    generations = 0
    proj.setTargetImage(img)
}









/*
 * 
 * 
 *      rendering loop
 * 
 * 
*/

var paused = true
var showReference = false
var showScratch = false
var minAlpha = 0.1
var maxAlpha = 0.5

var cameraRot = [0, 0]
var generations = 0
var gensPerFrame = 20
var gensPerSec = 0

// flags etc
var drawNeeded = true
var lastDraw = 0
var lastGenCt = 0
var lastHtmlUpdate = 0


// core RAF loop
function render() {
    if (!paused) {
        for (var i = 0; i < gensPerFrame; i++) proj.runGeneration()
        generations += gensPerFrame
    }
    var now = performance.now()
    if (now - lastHtmlUpdate > 500) {
        gensPerSec = (generations - lastGenCt) / (now - lastHtmlUpdate) * 1000
        updateHTML()
        lastGenCt = generations
        lastHtmlUpdate = now
    }
    if (now - lastDraw > 500 || (paused && drawNeeded)) {
        var mode = (showReference) ? 1 : (showScratch) ? 2 : 0
        switch (mode) {
            case 0: proj.draw(-cameraRot[0], -cameraRot[1]); break
            case 1: proj.drawTargetImage(); break
            case 2: proj._drawScratchImage(); break
        }
        drawNeeded = false
        lastDraw = now
    }
    requestAnimationFrame(render)
}
render()











/*
 * 
 * 
 *      settings / ui
 * 
 * 
*/

var setupInput = (el, handler) => {
    $(el).addEventListener('change', ev => {
        var t = ev.target.type
        if (t === 'checkbox') return handler(ev.target.checked)
        return handler(ev.target.value)
    })
}

setupInput('paused', val => { paused = val })
setupInput('showRef', val => { showReference = val })
setupInput('showScr', val => { showScratch = val })
setupInput('gensPerFrame', val => { gensPerFrame = parseInt(val) })

var setAlpha = () => proj.setAlphaRange(minAlpha, maxAlpha)
setupInput('minAlpha', val => { minAlpha = parseFloat(val); setAlpha() })
setupInput('maxAlpha', val => { maxAlpha = parseFloat(val); setAlpha() })

setupInput('fewerPolys', val => {
    var ind = $('fewerPolys').selectedIndex
    var tols = [0, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1]
    proj.setFewerPolysTolerance(tols[ind])
})


$('export').addEventListener('click', ev => {
    var dat = proj.exportData()
    $('data').value = dat
})

$('import').addEventListener('click', ev => {
    var dat = $('data').value
    var res = proj.importData(dat)
    if (res) $('data').value = ''
})

function updateHTML() {
    $('polys').value = proj.getNumPolys()
    $('score').value = proj.getScore().toFixed(5)
    $('gens').value = generations
    $('gps').value = gensPerSec.toFixed(0)
    $('paused').checked = paused
}

document.onkeydown = ev => {
    if (ev.keyCode === 32) {
        ev.preventDefault()
        paused = !paused
        $('paused').checked = paused
    }
}








/*
 * 
 *      mouse drag / cameraAngle
 * 
*/

var rotScale = 1 / 150
var cameraReturn = 0.9
var dragging = false
var lastLoc = [0, 0]
var getEventLoc = ev => [
    (ev.clientX) ? ev.clientX : ev.targetTouches[0].clientX,
    (ev.clientY) ? ev.clientY : ev.targetTouches[0].clientY,
]
var startDrag = ev => {
    ev.preventDefault()
    dragging = true
    lastLoc = getEventLoc(ev)
}
var drag = ev => {
    var loc = getEventLoc(ev)
    if (!dragging) return
    ev.preventDefault()
    cameraRot[0] += (loc[0] - lastLoc[0]) * rotScale
    cameraRot[1] += (loc[1] - lastLoc[1]) * rotScale
    lastLoc = loc
    drawNeeded = true
}
var stopDrag = ev => {
    dragging = false
    returnCamera()
}
canvas.addEventListener('mousedown', startDrag)
canvas.addEventListener('touchstart', startDrag)
document.body.addEventListener('mouseup', stopDrag)
document.body.addEventListener('touchend', stopDrag)
canvas.addEventListener('mousemove', drag)
canvas.addEventListener('touchmove', drag)


// update/debounce
function returnCamera() {
    if (dragging) return
    cameraRot.forEach((rot, i) => {
        rot *= cameraReturn
        cameraRot[i] = (Math.abs(rot) < 1e-4) ? 0 : rot
        drawNeeded = true
    })
    if (cameraRot[0] || cameraRot[1]) {
        requestAnimationFrame(returnCamera)
    }
}









/*
 * 
 * 
 *      drag-drop new images
 * 
 * 
*/

var dropTarget = document.body

window.addEventListener('load', function () {
    var stopPrevent = ev => {
        ev.stopPropagation()
        ev.preventDefault()
    }
    dropTarget.addEventListener('dragenter', stopPrevent)
    dropTarget.addEventListener('dragover', stopPrevent)
    dropTarget.addEventListener('drop', ev => {
        stopPrevent(ev)
        var url = ev.dataTransfer.getData('text/plain')
        var img = new Image()
        if (url) {
            // dragged by url from another site etc
            img.onload = ev => { setImage(img) }
            img.src = url
        } else {
            // dragged from local FS
            var file = ev.dataTransfer.files[0]
            if (!file.type.match(/image.*/)) return
            img.file = file
            img.onload = e => { setImage(img) }
            var reader = new FileReader()
            reader.onloadend = e => { img.src = e.target.result }
            reader.readAsDataURL(file)
        }
    })
})



