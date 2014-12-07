glsl-image-maker
================

This is a WebGL/[GPGPU](http://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units) demo I made to teach myself shader programming. It generates random 3D polygons which resemble a given target image when projected. Basically it's the concept from [this blog post](http://rogeralsing.com/2008/12/07/genetic-programming-evolution-of-mona-lisa/), but done in 3D and on the GPU.

[image]

An explanatory blog post will be up shortly.

### Live demos:

Here is the [example client for creating a projection](). It's the same thing you'd get by running `npm start` on the module. Note that this project compares images on the GPU and reads back the results, which I assume won't work on some (older?) video cards.

Here is a [demo viewer of a previously made projection](). It's the bundled output of `npm run viewer`.

## Installation & Usage

    git clone [this repo]
    cd glsl-image-maker
    npm install
    npm start

That launches the demo client, a web page that provides a UI to the core library. (Uncheck "Paused" to get started.)

Alternately run `npm run viewer` to see a simple projection viewer, or `npm run bundle` to browserify the examples.

To use the library directly:

    var proj = require('path/to/glsl-image-maker/')
    proj.init( glReference, imageReference )

## API

#### init (glRef, imageRef, size)

 * gl object of the canvas you'll use for output
 * [optional] source image (an HTML Image object)
 * [optional] resolution of the framebuffer used internally for comparison (default 256)

If no image is supplied, the library will initialize but assume you're going to use it to display data that was already created. (So calls to e.g. `runGeneration()` will fail.)

#### runGeneration()

Runs one generation of the genetic(?) algorithm - mutating the internal data and keeping the result if it scores higher than the previous version.

#### paint( xRot, yRot )

Paints the current best data to the gl context. Optionally takes x- and y-rotation [Euler] angles.

#### paintReference()

Paints the reference framebuffer to the gl context (this may differ from the reference image in resolution)

#### paintScratchBuffer()

Paints the internal comparison framebuffer

#### exportData()

Exports the current polygon data, in an extremely dumb ad-hoc string format.

#### importData(str)

Imports data in the same ad-hoc format as above.

#### score 

(read only) Returns the score (fitness) of the current data. Scales roughly from -100 to 100.

#### numPolys 

(read only) Number of polygons (triangles) currently used

#### minAlpha / maxAlpha

(defaults 0.05, 0.5) Min/max values the algorithm will use when randomizing any vertex's alpha value. I found that setting these moderately low (e.g. .1 to .5) made images get more interesting more quickly than just using the range 0..1.

#### compareonGPU

(default true) Flag for whether to use the GPU when comparing rendered images to the target image. Turning this off will slow things down a lot.

#### fewerPolysTolerance

(default 0) A tolerance within which the algorithm will accept generations with a lower score as long as they have fewer polygons than the previous. 

#### useFlatPolys

(default false) When set, all new polygons will share a common z value (i.e. they will be parallel to the camera plane). I thought this might make for interesting visuals, but didn't get anywhere with it.


