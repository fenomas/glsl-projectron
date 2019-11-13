

var createTexture = require('gl-texture2d')
var createBuffer = require('gl-buffer')
var createShader = require('gl-shader')
var createFBO = require('gl-fbo')
var createVAO = require('gl-vao')
var glslify = require('glslify')
var mat4 = require('gl-mat4')





var canvas = document.getElementById('viewer')
var gl = canvas.getContext('webgl')

// start things off
var img = new Image()
img.onload = () => init(img)
img.src = './img/lena.png'











// compile shaders
var flatFrag = glslify(require('../src/shaders/flatTexture-frag.glsl').default)
var flatVert = glslify(require('../src/shaders/flatTexture-vert.glsl').default)
var flatShader = createShader(gl, flatVert, flatFrag)
var camFrag = glslify(require('../src/shaders/camera-frag.glsl').default)
var camVert = glslify(require('../src/shaders/camera-vert.glsl').default)
var camShader = createShader(gl, camVert, camFrag)

// FBO
var referenceFB = createFBO(gl, [250, 250], { color: 1 })
referenceFB.drawn = false

// fake data
var vertArray = Array.from(Array(300)).map(n => Math.random())
var colArray = Array.from(Array(400)).map(n => Math.random())
var vertBuffer = createBuffer(gl, vertArray)
var colBuffer = createBuffer(gl, colArray)
var dataVao = createVAO(gl, [
    { "buffer": vertBuffer, "type": gl.FLOAT, "size": 3 },
    { "buffer": colBuffer, "type": gl.FLOAT, "size": 4 }
])

var flatVerts = [-1, -1, -1, 1, 1, -1, 1, 1, -1, 1, 1, -1]
var flatBuffer = createBuffer(gl, flatVerts)
var flatVao = createVAO(gl, [
    { "buffer": flatBuffer, "type": gl.FLOAT, "size": 2 }
])

// misc
var camMatrix = mat4.create()
var refTexture



function init() {
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    refTexture = createTexture(gl, img)
    // drawFlat(refTexture, referenceFB, true)

    setInterval(draw, 400)
}




function draw() {
    // gl-now stuff
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, 500, 500)
    // gl.clearStencil(shell.clearStencil)
    gl.clearColor(0, 0, 0, 1)
    gl.clearDepth(1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)


    iter = (iter + 1) % 5
    if (iter < 3) {
        drawData()
    } else {
        // drawReference()
        drawFlat(refTexture, '', true)
    }

}
var iter = 0










function drawReference() {
    drawFlat(referenceFB.color[0], '', false)
}


function drawFlat(source, target, flipY) {
    var multY = (flipY) ? -1 : 1
    drawGeneral(
        target, flatShader, flatVao, 6,
        ["multY", "buffer"],
        [multY, source]
    )
}



function drawData() {
    vertBuffer.update(vertArray)
    colBuffer.update(colArray)

    yrot = (yrot + 0.1) % 2
    camMatrix = mat4.create()
    mat4.rotateX(camMatrix, camMatrix, yrot)
    drawGeneral(
        '', camShader, dataVao, 100,
        ["perspective", "camera"],
        [0.2, camMatrix]
    )
}
var yrot = 0




function drawGeneral(target, shader, vao, numVs, uniNames, uniVals) {

    if (target && target.bind) {
        var res = target.bind()
        console.log('drawing into fbo', res)
        gl.colorMask(true, true, true, true)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.colorMask(true, true, true, false)
    } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
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



