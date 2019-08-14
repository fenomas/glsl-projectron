
/*
 * 
 * 
 *  helper class to manage polygon data
 *  
 *  vertArr is [x,y,z, xyz, xyz,   ..] per poly (len=3*numVerts)
 *  colArr = [r,g,b,a, rgba, rgba, ..] per poly (len=4*numVerts)
 * 
*/


export function PolyData() {

    var minAlpha = 0.1
    var maxAlpha = 0.5
    var flattenZ = 0
    var adjAmount = 0.5

    var vertArr = []
    var colArr = []

    this.getNumVerts = () => (vertArr.length / 3) | 0
    this.getNumPolys = () => (vertArr.length / 9) | 0
    this.getVertArray = () => vertArr
    this.getColorArray = () => colArr

    this.setArrays = (v, c) => {
        vertArr = v
        colArr = c
    }
    this.setAlphaRange = (min, max) => {
        if (min || (min === 0)) minAlpha = min
        if (max || (max === 0)) maxAlpha = max
    }
    this.setAdjust = (num) => { adjAmount = num }
    this.setFlattenZ = (z) => { flattenZ = z }





    /*
     * 
     *  randomizer handlers
     * 
    */

    var rand = () => Math.random()
    var randRange = (a, b) => a + (b - a) * Math.random()

    var randomizeVal = (old) => {
        if (!old) return rand()
        var a = Math.max(0, old - adjAmount)
        var b = Math.min(1, old + adjAmount)
        return randRange(a, b)
    }
    var randomizeAlpha = (old) => {
        if (!old) return randRange(minAlpha, maxAlpha)
        var a = Math.max(minAlpha, old - adjAmount)
        var b = Math.min(maxAlpha, old + adjAmount)
        return randRange(a, b)
    }





    /*
     * 
     * 
     *      data mutators 
     * 
     * 
    */

    this.addPoly = function () {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                vertArr.push(randomizeVal())
                colArr.push(randomizeVal())
            }
            colArr.push(randomizeAlpha())
        }
        if (flattenZ > 0) {
            var len = vertArr.length
            var z1 = vertArr[len - 1]
            vertArr[len - 4] += flattenZ * (z1 - vertArr[len - 4])
            vertArr[len - 7] += flattenZ * (z1 - vertArr[len - 7])
        }
    }

    // remove a random poly
    this.removePoly = function () {
        if (this.getNumPolys() < 2) return
        var index = (rand() * vertArr.length / 9) | 0
        vertArr.splice(index * 9, 9)
        colArr.splice(index * 12, 12)
    }

    // randomize one R/G/B/A/X/Y/Z value
    this.mutateValue = function () {
        if (rand() < 0.5) {
            var ci = (rand() * colArr.length) | 0
            var randomizer = (ci % 4 === 3) ? randomizeAlpha : randomizeVal
            colArr[ci] = randomizer(colArr[ci])
        } else {
            var vi = (rand() * vertArr.length) | 0
            vertArr[vi] = randomizeVal(vertArr[vi])
        }
    }

    // randomize either all RGBA or all XYZ of one vertex
    this.mutateVertex = function () {
        var num = (rand() * this.getNumVerts()) | 0
        if (rand() < 0.5) {
            var ci = num * 4
            for (var i = 0; i < 3; i++) {
                colArr[ci + i] = randomizeVal(colArr[ci + i])
            }
            colArr[ci + 3] = randomizeAlpha(colArr[ci + 3])
        } else {
            var vi = num * 3
            for (var j = 0; j < 3; j++) {
                vertArr[vi + j] = randomizeVal(vertArr[vi + j])
            }
        }
    }





    // helpers

    this.cacheDataNow = function () {
        oldVertArr = vertArr.slice()
        oldColArr = colArr.slice()
    }
    this.restoreCachedData = function () {
        vertArr = oldVertArr
        colArr = oldColArr
    }
    var oldVertArr = null
    var oldColArr = null




    this.sortPolygonsByZ = function () {
        var i, j
        // make and sort an arr of z values averaged over each poly
        var sortdat = []
        for (i = 0; i < vertArr.length; i += 9) {
            var zavg = (vertArr[i + 2] + vertArr[i + 5] + vertArr[i + 8]) / 3
            sortdat.push({ index: i / 9, z: zavg })
        }
        sortdat.sort(sortFcn)
        var oldV = vertArr.slice()
        var oldC = colArr.slice()
        for (i = 0; i < sortdat.length; i++) {
            var item = sortdat[i]
            for (j = 0; j < 9; j++) {
                vertArr[i * 9 + j] = oldV[item.index * 9 + j]
            }
            for (j = 0; j < 12; j++) {
                colArr[i * 12 + j] = oldC[item.index * 12 + j]
            }
        }
    }
    var sortFcn = (a, b) => a.z - b.z



    // init
    this.addPoly()
    this.sortPolygonsByZ()

}