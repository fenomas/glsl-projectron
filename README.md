## GLSL-Projectron
--------

This is a WebGL/[GPGPU](https://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units) demo I made to try out shader programming. It generates random 3D polygons which resemble a given target image when projected. Basically it's similar to [this](https://rogeralsing.com/2008/12/07/genetic-programming-evolution-of-mona-lisa/), but done in 3D and on the GPU.

After many generations, you get a chaotic bunch of polygons that align into an image, but only from just the right angle:

[![Screencap of sample output](./docs/img/mona-320.gif?raw=true "Sample output")](https://fenomas.github.io/glsl-projectron/viewer.html)

## Live demos:

 * [Create a projection](https://fenomas.github.io/glsl-projectron/) (uncheck "Paused" to begin)
 * View [one I made earlier](https://fenomas.github.io/glsl-projectron/viewer.html)
 * or [this other one](https://fenomas.github.io/glsl-projectron/viewer-vermeer.html)

I also wrote a [blog post here](https://fenomas.com/2014/12/glsl-projectron/) explaining the algorithm, and how I made it run fast on the GPU.

## Installation & Usage

```sh
git clone [this repo]
cd glsl-projectron
npm install
npm start
```

That serves a local build of the "Create" demo linked above, in `localhost:8080`.

Use `npm run build` to rebuild the static version in `/docs`.

To use this as a dependency, follow the example in `/demo/maker.js`:

```js
import { Projectron } from 'path/to/glsl-projectron'
var proj = new Projectron(canvasElement)

var img = new Image()
img.onload = () => { proj.setTargetImage(img) }
img.src = 'path/to/image.png'
//..
proj.runGeneration()    // many times..
proj.draw(x,y)          // once per frame..
```

## Known issues:

* Doesn't detect most error cases (just whether WebGL is supported)
* Library treats input images as if they were square. To use for other aspects, just run it normally and change the aspect of the canvas you use to display the results.

----

### Credits

Made with 🍺 by [Andy Hall](https://twitter.com/fenomas). MIT license.


