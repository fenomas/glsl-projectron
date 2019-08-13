
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

    var rand = () => Math.random()
    var randAlpha = () => minAlpha + rand() * (maxAlpha - minAlpha)

    var vertArr = []
    var colArr = []

    this.getNumVerts = () => vertArr.length / 3
    this.getNumPolys = () => vertArr.length / 9
    this.getVertArray = () => vertArr
    this.getColorArray = () => colArr

    this.setArrays = (v, c) => {
        vertArr = v
        colArr = c
    }
    this.setAlphaRange = (min, max) => {
        minAlpha = min || 0.05
        maxAlpha = max || 0.5
    }
    this.setFlattenZ = (z) => { flattenZ = z }





    /*
     * 
     *  randomizers... might look at these later..
     * 
    */

    var randomizeCoord = (old) => rand()
    var randomizeColor = (old) => rand()
    var randomizeAlpha = (old) => randAlpha()

    



    this.addPoly = function () {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                vertArr.push(randomizeCoord())
                colArr.push(randomizeColor())
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
            var randomizer = (ci % 4 === 3) ? randomizeAlpha : randomizeColor
            colArr[ci] = randomizer(colArr[ci])
        } else {
            var vi = (rand() * vertArr.length) | 0
            vertArr[vi] = randomizeCoord(vertArr[vi])
        }
    }



    // randomize either all RGBA or all XYZ of one vertex
    this.mutateVertex = function () {
        var num = (rand() * this.getNumVerts()) | 0
        if (rand() < 0.5) {
            var ci = num * 4
            for (var i = 0; i < 3; i++) {
                colArr[ci + i] = randomizeColor(colArr[ci + i])
            }
            colArr[ci + 4] = randomizeAlpha(colArr[ci + 4])
        } else {
            var vi = num * 3
            for (var j = 0; j < 3; j++) {
                vertArr[vi + j] = randomizeCoord(vertArr[vi + j])
            }
        }
    }



    // // add a new poly that's a clone of an existing one with one vertex moved
    // // conceptually like making a 3-poly into a folded quad
    // this.clonePoly = function () {
    //     var vertArr = this.vertArr
    //     var colArr = this.colArr
    //     // // new vertices, copy colors as they are
    //     // var index = (rand() * vertArr.length / 9) | 0
    //     // for (var i = 0; i < 12; i++) {
    //     //     colArr.push(colArr[index * 12 + i])
    //     // }
    //     // // clone 2 of 3 position vertices, then push a random one
    //     // var skip = floor(3 * rand())
    //     // for (var i = 0; i < 9; i++) {
    //     //     if (floor(i / 3) != skip) { vertArr.push(vertArr[index * 9 + i]) }
    //     // }
    //     // for (i = 0; i < 3; i++) { vertArr.push(rand()) }
    //     // // in flat mode, give new position z from one of the others
    //     // if (flattenedZ) {
    //     //     var len = vertArr.length
    //     //     vertArr[len - 1] = (rand() > .5) ? vertArr[len - 4] : vertArr[len - 7]
    //     // }
    // }






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