
import { Projectron } from '../src'





/*
 * 
 *      init
 * 
*/


var canvas = document.getElementById('view')
var proj = new Projectron(canvas)

var data = document.getElementById('viewData').textContent
proj.importData(data)






/*
 * 
 *      render loop
 * 
*/

var cameraRot = [0, 0]
var drawNeeded = true

function render() {
    if (drawNeeded) {
        proj.draw(-cameraRot[0], -cameraRot[1])
        drawNeeded = false
    }
    requestAnimationFrame(render)
}
render()







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
    if (ev.originalEvent) ev = ev.originalEvent
    ev.preventDefault()
    dragging = true
    lastLoc = getEventLoc(ev)
}
var drag = ev => {
    if (ev.originalEvent) ev = ev.originalEvent
    var loc = getEventLoc(ev)
    if (!dragging) return
    ev.preventDefault()
    cameraRot[0] += (loc[0] - lastLoc[0]) * rotScale
    cameraRot[1] += (loc[1] - lastLoc[1]) * rotScale
    lastLoc = loc
    drawNeeded = true
}
var stopDrag = ev => {
    if (ev.originalEvent) ev = ev.originalEvent
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

