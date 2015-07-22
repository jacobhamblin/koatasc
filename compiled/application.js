/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Bleach bypass shader [http://en.wikipedia.org/wiki/Bleach_bypass]
 * - based on Nvidia example
 * http://developer.download.nvidia.com/shaderlibrary/webpages/shader_library.html#post_bleach_bypass
 */

"use strict";

THREE.BleachBypassShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"opacity": { type: "f", value: 1 }

	},

	vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

	fragmentShader: ["uniform float opacity;", "uniform sampler2D tDiffuse;", "varying vec2 vUv;", "void main() {", "vec4 base = texture2D( tDiffuse, vUv );", "vec3 lumCoeff = vec3( 0.25, 0.65, 0.1 );", "float lum = dot( lumCoeff, base.rgb );", "vec3 blend = vec3( lum );", "float L = min( 1.0, max( 0.0, 10.0 * ( lum - 0.45 ) ) );", "vec3 result1 = 2.0 * base.rgb * blend;", "vec3 result2 = 1.0 - 2.0 * ( 1.0 - blend ) * ( 1.0 - base.rgb );", "vec3 newColor = mix( result1, result2, L );", "float A2 = opacity * base.a;", "vec3 mixRGB = A2 * newColor.rgb;", "mixRGB += ( ( 1.0 - A2 ) * base.rgb );", "gl_FragColor = vec4( mixRGB, base.a );", "}"].join("\n")

};
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Blend two textures
 */

"use strict";

THREE.BlendShader = {

	uniforms: {

		"tDiffuse1": { type: "t", value: null },
		"tDiffuse2": { type: "t", value: null },
		"mixRatio": { type: "f", value: 0.5 },
		"opacity": { type: "f", value: 1 }

	},

	vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

	fragmentShader: ["uniform float opacity;", "uniform float mixRatio;", "uniform sampler2D tDiffuse1;", "uniform sampler2D tDiffuse2;", "varying vec2 vUv;", "void main() {", "vec4 texel1 = texture2D( tDiffuse1, vUv );", "vec4 texel2 = texture2D( tDiffuse2, vUv );", "gl_FragColor = opacity * mix( texel1, texel2, mixRatio );", "}"].join("\n")

};
/**
 * @author alteredq / http://alteredqualia.com/
 */

"use strict";

THREE.BloomPass = function (strength, kernelSize, sigma, resolution) {

	strength = strength !== undefined ? strength : 1;
	kernelSize = kernelSize !== undefined ? kernelSize : 25;
	sigma = sigma !== undefined ? sigma : 4;
	resolution = resolution !== undefined ? resolution : 256;

	// render targets

	var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };

	this.renderTargetX = new THREE.WebGLRenderTarget(resolution, resolution, pars);
	this.renderTargetY = new THREE.WebGLRenderTarget(resolution, resolution, pars);

	// copy material

	if (THREE.CopyShader === undefined) console.error("THREE.BloomPass relies on THREE.CopyShader");

	var copyShader = THREE.CopyShader;

	this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);

	this.copyUniforms["opacity"].value = strength;

	this.materialCopy = new THREE.ShaderMaterial({

		uniforms: this.copyUniforms,
		vertexShader: copyShader.vertexShader,
		fragmentShader: copyShader.fragmentShader,
		blending: THREE.AdditiveBlending,
		transparent: true

	});

	// convolution material

	if (THREE.ConvolutionShader === undefined) console.error("THREE.BloomPass relies on THREE.ConvolutionShader");

	var convolutionShader = THREE.ConvolutionShader;

	this.convolutionUniforms = THREE.UniformsUtils.clone(convolutionShader.uniforms);

	this.convolutionUniforms["uImageIncrement"].value = THREE.BloomPass.blurX;
	this.convolutionUniforms["cKernel"].value = THREE.ConvolutionShader.buildKernel(sigma);

	this.materialConvolution = new THREE.ShaderMaterial({

		uniforms: this.convolutionUniforms,
		vertexShader: convolutionShader.vertexShader,
		fragmentShader: convolutionShader.fragmentShader,
		defines: {
			"KERNEL_SIZE_FLOAT": kernelSize.toFixed(1),
			"KERNEL_SIZE_INT": kernelSize.toFixed(0)
		}

	});

	this.enabled = true;
	this.needsSwap = false;
	this.clear = false;

	this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.scene.add(this.quad);
};

THREE.BloomPass.prototype = {

	render: function render(renderer, writeBuffer, readBuffer, delta, maskActive) {

		if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);

		// Render quad with blured scene into texture (convolution pass 1)

		this.quad.material = this.materialConvolution;

		this.convolutionUniforms["tDiffuse"].value = readBuffer;
		this.convolutionUniforms["uImageIncrement"].value = THREE.BloomPass.blurX;

		renderer.render(this.scene, this.camera, this.renderTargetX, true);

		// Render quad with blured scene into texture (convolution pass 2)

		this.convolutionUniforms["tDiffuse"].value = this.renderTargetX;
		this.convolutionUniforms["uImageIncrement"].value = THREE.BloomPass.blurY;

		renderer.render(this.scene, this.camera, this.renderTargetY, true);

		// Render original scene with superimposed blur to texture

		this.quad.material = this.materialCopy;

		this.copyUniforms["tDiffuse"].value = this.renderTargetY;

		if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);

		renderer.render(this.scene, this.camera, readBuffer, this.clear);
	}

};

THREE.BloomPass.blurX = new THREE.Vector2(0.001953125, 0);
THREE.BloomPass.blurY = new THREE.Vector2(0, 0.001953125);
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Convolution shader
 * ported from o3d sample to WebGL / GLSL
 * http://o3d.googlecode.com/svn/trunk/samples/convolution.html
 */

"use strict";

THREE.ConvolutionShader = {

	defines: {

		"KERNEL_SIZE_FLOAT": "25.0",
		"KERNEL_SIZE_INT": "25"

	},

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"uImageIncrement": { type: "v2", value: new THREE.Vector2(0.001953125, 0) },
		"cKernel": { type: "fv1", value: [] }

	},

	vertexShader: ["uniform vec2 uImageIncrement;", "varying vec2 vUv;", "void main() {", "vUv = uv - ( ( KERNEL_SIZE_FLOAT - 1.0 ) / 2.0 ) * uImageIncrement;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

	fragmentShader: ["uniform float cKernel[ KERNEL_SIZE_INT ];", "uniform sampler2D tDiffuse;", "uniform vec2 uImageIncrement;", "varying vec2 vUv;", "void main() {", "vec2 imageCoord = vUv;", "vec4 sum = vec4( 0.0, 0.0, 0.0, 0.0 );", "for( int i = 0; i < KERNEL_SIZE_INT; i ++ ) {", "sum += texture2D( tDiffuse, imageCoord ) * cKernel[ i ];", "imageCoord += uImageIncrement;", "}", "gl_FragColor = sum;", "}"].join("\n"),

	buildKernel: function buildKernel(sigma) {

		// We lop off the sqrt(2 * pi) * sigma term, since we're going to normalize anyway.

		function gauss(x, sigma) {

			return Math.exp(-(x * x) / (2 * sigma * sigma));
		}

		var i,
		    values,
		    sum,
		    halfWidth,
		    kMaxKernelSize = 25,
		    kernelSize = 2 * Math.ceil(sigma * 3) + 1;

		if (kernelSize > kMaxKernelSize) kernelSize = kMaxKernelSize;
		halfWidth = (kernelSize - 1) * 0.5;

		values = new Array(kernelSize);
		sum = 0;
		for (i = 0; i < kernelSize; ++i) {

			values[i] = gauss(i - halfWidth, sigma);
			sum += values[i];
		}

		// normalize the kernel

		for (i = 0; i < kernelSize; ++i) values[i] /= sum;

		return values;
	}

};
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

"use strict";

THREE.CopyShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"opacity": { type: "f", value: 1 }

	},

	vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

	fragmentShader: ["uniform float opacity;", "uniform sampler2D tDiffuse;", "varying vec2 vUv;", "void main() {", "vec4 texel = texture2D( tDiffuse, vUv );", "gl_FragColor = opacity * texel;", "}"].join("\n")

};
/**
 * @author alteredq / http://alteredqualia.com/
 */

"use strict";

THREE.EffectComposer = function (renderer, renderTarget) {

	this.renderer = renderer;

	if (renderTarget === undefined) {

		var pixelRatio = renderer.getPixelRatio();

		var width = Math.floor(renderer.context.canvas.width / pixelRatio) || 1;
		var height = Math.floor(renderer.context.canvas.height / pixelRatio) || 1;
		var parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };

		renderTarget = new THREE.WebGLRenderTarget(width, height, parameters);
	}

	this.renderTarget1 = renderTarget;
	this.renderTarget2 = renderTarget.clone();

	this.writeBuffer = this.renderTarget1;
	this.readBuffer = this.renderTarget2;

	this.passes = [];

	if (THREE.CopyShader === undefined) console.error("THREE.EffectComposer relies on THREE.CopyShader");

	this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
};

THREE.EffectComposer.prototype = {

	swapBuffers: function swapBuffers() {

		var tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;
	},

	addPass: function addPass(pass) {

		this.passes.push(pass);
	},

	insertPass: function insertPass(pass, index) {

		this.passes.splice(index, 0, pass);
	},

	render: function render(delta) {

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

		var maskActive = false;

		var pass,
		    i,
		    il = this.passes.length;

		for (i = 0; i < il; i++) {

			pass = this.passes[i];

			if (!pass.enabled) continue;

			pass.render(this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive);

			if (pass.needsSwap) {

				if (maskActive) {

					var context = this.renderer.context;

					context.stencilFunc(context.NOTEQUAL, 1, 4294967295);

					this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, delta);

					context.stencilFunc(context.EQUAL, 1, 4294967295);
				}

				this.swapBuffers();
			}

			if (pass instanceof THREE.MaskPass) {

				maskActive = true;
			} else if (pass instanceof THREE.ClearMaskPass) {

				maskActive = false;
			}
		}
	},

	reset: function reset(renderTarget) {

		if (renderTarget === undefined) {

			renderTarget = this.renderTarget1.clone();

			var pixelRatio = this.renderer.getPixelRatio();

			renderTarget.width = Math.floor(this.renderer.context.canvas.width / pixelRatio);
			renderTarget.height = Math.floor(this.renderer.context.canvas.height / pixelRatio);
		}

		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;
	},

	setSize: function setSize(width, height) {

		var renderTarget = this.renderTarget1.clone();

		renderTarget.width = width;
		renderTarget.height = height;

		this.reset(renderTarget);
	}

};
/**
 * @author alteredq / http://alteredqualia.com/
 * @author davidedc / http://www.sketchpatch.net/
 *
 * NVIDIA FXAA by Timothy Lottes
 * http://timothylottes.blogspot.com/2011/06/fxaa3-source-released.html
 * - WebGL port by @supereggbert
 * http://www.glge.org/demos/fxaa/
 */

"use strict";

THREE.FXAAShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"resolution": { type: "v2", value: new THREE.Vector2(1 / 1024, 1 / 512) }

	},

	vertexShader: ["void main() {", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

	fragmentShader: ["uniform sampler2D tDiffuse;", "uniform vec2 resolution;", "#define FXAA_REDUCE_MIN   (1.0/128.0)", "#define FXAA_REDUCE_MUL   (1.0/8.0)", "#define FXAA_SPAN_MAX     8.0", "void main() {", "vec3 rgbNW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, -1.0 ) ) * resolution ).xyz;", "vec3 rgbNE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, -1.0 ) ) * resolution ).xyz;", "vec3 rgbSW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, 1.0 ) ) * resolution ).xyz;", "vec3 rgbSE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, 1.0 ) ) * resolution ).xyz;", "vec4 rgbaM  = texture2D( tDiffuse,  gl_FragCoord.xy  * resolution );", "vec3 rgbM  = rgbaM.xyz;", "vec3 luma = vec3( 0.299, 0.587, 0.114 );", "float lumaNW = dot( rgbNW, luma );", "float lumaNE = dot( rgbNE, luma );", "float lumaSW = dot( rgbSW, luma );", "float lumaSE = dot( rgbSE, luma );", "float lumaM  = dot( rgbM,  luma );", "float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );", "float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );", "vec2 dir;", "dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));", "dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));", "float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );", "float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );", "dir = min( vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),", "max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),", "dir * rcpDirMin)) * resolution;", "vec4 rgbA = (1.0/2.0) * (", "texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (1.0/3.0 - 0.5)) +", "texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (2.0/3.0 - 0.5)));", "vec4 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (", "texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (0.0/3.0 - 0.5)) +", "texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (3.0/3.0 - 0.5)));", "float lumaB = dot(rgbB, vec4(luma, 0.0));", "if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) ) {", "gl_FragColor = rgbA;", "} else {", "gl_FragColor = rgbB;", "}", "}"].join("\n")

};
/**
 * @author alteredq / http://alteredqualia.com/
 */

"use strict";

THREE.MaskPass = function (scene, camera) {

	this.scene = scene;
	this.camera = camera;

	this.enabled = true;
	this.clear = true;
	this.needsSwap = false;

	this.inverse = false;
};

THREE.MaskPass.prototype = {

	render: function render(renderer, writeBuffer, readBuffer, delta) {

		var context = renderer.context;

		// don't update color or depth

		context.colorMask(false, false, false, false);
		context.depthMask(false);

		// set up stencil

		var writeValue, clearValue;

		if (this.inverse) {

			writeValue = 0;
			clearValue = 1;
		} else {

			writeValue = 1;
			clearValue = 0;
		}

		context.enable(context.STENCIL_TEST);
		context.stencilOp(context.REPLACE, context.REPLACE, context.REPLACE);
		context.stencilFunc(context.ALWAYS, writeValue, 4294967295);
		context.clearStencil(clearValue);

		// draw into the stencil buffer

		renderer.render(this.scene, this.camera, readBuffer, this.clear);
		renderer.render(this.scene, this.camera, writeBuffer, this.clear);

		// re-enable update of color and depth

		context.colorMask(true, true, true, true);
		context.depthMask(true);

		// only render where stencil is set to 1

		context.stencilFunc(context.EQUAL, 1, 4294967295); // draw if == 1
		context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
	}

};

THREE.ClearMaskPass = function () {

	this.enabled = true;
};

THREE.ClearMaskPass.prototype = {

	render: function render(renderer, writeBuffer, readBuffer, delta) {

		var context = renderer.context;

		context.disable(context.STENCIL_TEST);
	}

};
/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 */

'use strict';

THREE.OrbitControls = function (object, domElement) {

	this.object = object;
	this.domElement = domElement !== undefined ? domElement : document;

	// API

	this.enabled = true;

	this.center = new THREE.Vector3();

	this.userZoom = true;
	this.userZoomSpeed = 1;

	this.userRotate = true;
	this.userRotateSpeed = 1;

	this.userPan = true;
	this.userPanSpeed = 2;

	this.autoRotate = false;
	this.autoRotateSpeed = 2; // 30 seconds per round when fps is 60

	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	this.minDistance = 0;
	this.maxDistance = Infinity;

	// 65 /*A*/, 83 /*S*/, 68 /*D*/
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40, ROTATE: 65, ZOOM: 83, PAN: 68 };

	// internals

	var scope = this;

	var EPS = 0.000001;
	var PIXELS_PER_ROUND = 1800;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var zoomStart = new THREE.Vector2();
	var zoomEnd = new THREE.Vector2();
	var zoomDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
	var state = STATE.NONE;

	// events

	var changeEvent = { type: 'change' };

	this.rotateLeft = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();
		}

		thetaDelta -= angle;
	};

	this.rotateRight = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();
		}

		thetaDelta += angle;
	};

	this.rotateUp = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();
		}

		phiDelta -= angle;
	};

	this.rotateDown = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();
		}

		phiDelta += angle;
	};

	this.zoomIn = function (zoomScale) {

		if (zoomScale === undefined) {

			zoomScale = getZoomScale();
		}

		scale /= zoomScale;
	};

	this.zoomOut = function (zoomScale) {

		if (zoomScale === undefined) {

			zoomScale = getZoomScale();
		}

		scale *= zoomScale;
	};

	this.pan = function (distance) {

		distance.transformDirection(this.object.matrix);
		distance.multiplyScalar(scope.userPanSpeed);

		this.object.position.add(distance);
		this.center.add(distance);
	};

	this.update = function () {

		var position = this.object.position;
		var offset = position.clone().sub(this.center);

		// angle from z-axis around y-axis

		var theta = Math.atan2(offset.x, offset.z);

		// angle from y-axis

		var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);

		if (this.autoRotate) {

			this.rotateLeft(getAutoRotationAngle());
		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

		offset.x = radius * Math.sin(phi) * Math.sin(theta);
		offset.y = radius * Math.cos(phi);
		offset.z = radius * Math.sin(phi) * Math.cos(theta);

		position.copy(this.center).add(offset);

		this.object.lookAt(this.center);

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;

		if (lastPosition.distanceTo(this.object.position) > 0) {

			this.dispatchEvent(changeEvent);

			lastPosition.copy(this.object.position);
		}
	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
	}

	function getZoomScale() {

		return Math.pow(0.95, scope.userZoomSpeed);
	}

	function onMouseDown(event) {

		if (scope.enabled === false) return;
		if (scope.userRotate === false) return;

		event.preventDefault();

		if (state === STATE.NONE) {
			if (event.button === 0) state = STATE.ROTATE;
			if (event.button === 1) state = STATE.ZOOM;
			if (event.button === 2) state = STATE.PAN;
		}

		if (state === STATE.ROTATE) {

			//state = STATE.ROTATE;

			rotateStart.set(event.clientX, event.clientY);
		} else if (state === STATE.ZOOM) {

			//state = STATE.ZOOM;

			zoomStart.set(event.clientX, event.clientY);
		} else if (state === STATE.PAN) {}

		document.addEventListener('mousemove', onMouseMove, false);
		document.addEventListener('mouseup', onMouseUp, false);
	}

	function onMouseMove(event) {

		if (scope.enabled === false) return;

		event.preventDefault();

		if (state === STATE.ROTATE) {

			rotateEnd.set(event.clientX, event.clientY);
			rotateDelta.subVectors(rotateEnd, rotateStart);

			scope.rotateLeft(2 * Math.PI * rotateDelta.x / PIXELS_PER_ROUND * scope.userRotateSpeed);
			scope.rotateUp(2 * Math.PI * rotateDelta.y / PIXELS_PER_ROUND * scope.userRotateSpeed);

			rotateStart.copy(rotateEnd);
		} else if (state === STATE.ZOOM) {

			zoomEnd.set(event.clientX, event.clientY);
			zoomDelta.subVectors(zoomEnd, zoomStart);

			if (zoomDelta.y > 0) {

				scope.zoomIn();
			} else {

				scope.zoomOut();
			}

			zoomStart.copy(zoomEnd);
		} else if (state === STATE.PAN) {

			var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
			var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

			scope.pan(new THREE.Vector3(-movementX, movementY, 0));
		}
	}

	function onMouseUp(event) {

		if (scope.enabled === false) return;
		if (scope.userRotate === false) return;

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);

		state = STATE.NONE;
	}

	function onMouseWheel(event) {

		if (scope.enabled === false) return;
		if (scope.userZoom === false) return;

		var delta = 0;

		if (event.wheelDelta) {
			// WebKit / Opera / Explorer 9

			delta = event.wheelDelta;
		} else if (event.detail) {
			// Firefox

			delta = -event.detail;
		}

		if (delta > 0) {

			scope.zoomOut();
		} else {

			scope.zoomIn();
		}
	}

	function onKeyDown(event) {

		if (scope.enabled === false) return;
		if (scope.userPan === false) return;

		switch (event.keyCode) {

			/*case scope.keys.UP:
   	scope.pan( new THREE.Vector3( 0, 1, 0 ) );
   	break;
   case scope.keys.BOTTOM:
   	scope.pan( new THREE.Vector3( 0, - 1, 0 ) );
   	break;
   case scope.keys.LEFT:
   	scope.pan( new THREE.Vector3( - 1, 0, 0 ) );
   	break;
   case scope.keys.RIGHT:
   	scope.pan( new THREE.Vector3( 1, 0, 0 ) );
   	break;
   */
			case scope.keys.ROTATE:
				state = STATE.ROTATE;
				break;
			case scope.keys.ZOOM:
				state = STATE.ZOOM;
				break;
			case scope.keys.PAN:
				state = STATE.PAN;
				break;

		}
	}

	function onKeyUp(event) {

		switch (event.keyCode) {

			case scope.keys.ROTATE:
			case scope.keys.ZOOM:
			case scope.keys.PAN:
				state = STATE.NONE;
				break;
		}
	}

	this.domElement.addEventListener('contextmenu', function (event) {
		event.preventDefault();
	}, false);
	this.domElement.addEventListener('mousedown', onMouseDown, false);
	this.domElement.addEventListener('mousewheel', onMouseWheel, false);
	this.domElement.addEventListener('DOMMouseScroll', onMouseWheel, false); // firefox
	window.addEventListener('keydown', onKeyDown, false);
	window.addEventListener('keyup', onKeyUp, false);
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);

//state = STATE.PAN;
/**
 * @author alteredq / http://alteredqualia.com/
 */

"use strict";

THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 1;

	this.oldClearColor = new THREE.Color();
	this.oldClearAlpha = 1;

	this.enabled = true;
	this.clear = true;
	this.needsSwap = false;
};

THREE.RenderPass.prototype = {

	render: function render(renderer, writeBuffer, readBuffer, delta) {

		this.scene.overrideMaterial = this.overrideMaterial;

		if (this.clearColor) {

			this.oldClearColor.copy(renderer.getClearColor());
			this.oldClearAlpha = renderer.getClearAlpha();

			renderer.setClearColor(this.clearColor, this.clearAlpha);
		}

		renderer.render(this.scene, this.camera, readBuffer, this.clear);

		if (this.clearColor) {

			renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
		}

		this.scene.overrideMaterial = null;
	}

};
/**
 * @author alteredq / http://alteredqualia.com/
 */

"use strict";

THREE.SavePass = function (renderTarget) {

	if (THREE.CopyShader === undefined) console.error("THREE.SavePass relies on THREE.CopyShader");

	var shader = THREE.CopyShader;

	this.textureID = "tDiffuse";

	this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

	this.material = new THREE.ShaderMaterial({

		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	});

	this.renderTarget = renderTarget;

	if (this.renderTarget === undefined) {

		this.renderTargetParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };
		this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, this.renderTargetParameters);
	}

	this.enabled = true;
	this.needsSwap = false;
	this.clear = false;

	this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.scene.add(this.quad);
};

THREE.SavePass.prototype = {

	render: function render(renderer, writeBuffer, readBuffer, delta) {

		if (this.uniforms[this.textureID]) {

			this.uniforms[this.textureID].value = readBuffer;
		}

		this.quad.material = this.material;

		renderer.render(this.scene, this.camera, this.renderTarget, this.clear);
	}

};
/**
 * @author alteredq / http://alteredqualia.com/
 */

"use strict";

THREE.ShaderPass = function (shader, textureID) {

	this.textureID = textureID !== undefined ? textureID : "tDiffuse";

	this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

	this.material = new THREE.ShaderMaterial({

		defines: shader.defines || {},
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	});

	this.renderToScreen = false;

	this.enabled = true;
	this.needsSwap = true;
	this.clear = false;

	this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.scene.add(this.quad);
};

THREE.ShaderPass.prototype = {

	render: function render(renderer, writeBuffer, readBuffer, delta) {

		if (this.uniforms[this.textureID]) {

			this.uniforms[this.textureID].value = readBuffer;
		}

		this.quad.material = this.material;

		if (this.renderToScreen) {

			renderer.render(this.scene, this.camera);
		} else {

			renderer.render(this.scene, this.camera, writeBuffer, this.clear);
		}
	}

};
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Vignette shader
 * based on PaintEffect postprocess from ro.me
 * http://code.google.com/p/3-dreams-of-black/source/browse/deploy/js/effects/PaintEffect.js
 */

"use strict";

THREE.VignetteShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"offset": { type: "f", value: 1 },
		"darkness": { type: "f", value: 1 }

	},

	vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

	fragmentShader: ["uniform float offset;", "uniform float darkness;", "uniform sampler2D tDiffuse;", "varying vec2 vUv;", "void main() {",

	// Eskil's vignette

	"vec4 texel = texture2D( tDiffuse, vUv );", "vec2 uv = ( vUv - vec2( 0.5 ) ) * vec2( offset );", "gl_FragColor = vec4( mix( texel.rgb, vec3( 1.0 - darkness ), dot( uv, uv ) ), texel.a );",

	/*
 // alternative version from glfx.js
 // this one makes more "dusty" look (as opposed to "burned")
 	"vec4 color = texture2D( tDiffuse, vUv );",
 "float dist = distance( vUv, vec2( 0.5 ) );",
 "color.rgb *= smoothstep( 0.8, offset * 0.799, dist *( darkness + offset ) );",
 "gl_FragColor = color;",
 */

	"}"].join("\n")

};
"use strict";

if (_typeface_js && _typeface_js.loadFace) _typeface_js.loadFace({ "glyphs": { "ο": { "x_min": 0, "x_max": 712, "ha": 815, "o": "m 356 -25 q 96 88 192 -25 q 0 368 0 201 q 92 642 0 533 q 356 761 192 761 q 617 644 517 761 q 712 368 712 533 q 619 91 712 201 q 356 -25 520 -25 m 356 85 q 527 175 465 85 q 583 369 583 255 q 528 562 583 484 q 356 651 466 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 356 85 250 85 " }, "S": { "x_min": 0, "x_max": 788, "ha": 890, "o": "m 788 291 q 662 54 788 144 q 397 -26 550 -26 q 116 68 226 -26 q 0 337 0 168 l 131 337 q 200 152 131 220 q 384 85 269 85 q 557 129 479 85 q 650 270 650 183 q 490 429 650 379 q 194 513 341 470 q 33 739 33 584 q 142 964 33 881 q 388 1041 242 1041 q 644 957 543 1041 q 756 716 756 867 l 625 716 q 561 874 625 816 q 395 933 497 933 q 243 891 309 933 q 164 759 164 841 q 325 609 164 656 q 625 526 475 568 q 788 291 788 454 " }, "¦": { "x_min": 343, "x_max": 449, "ha": 792, "o": "m 449 462 l 343 462 l 343 986 l 449 986 l 449 462 m 449 -242 l 343 -242 l 343 280 l 449 280 l 449 -242 " }, "/": { "x_min": 183.25, "x_max": 608.328125, "ha": 792, "o": "m 608 1041 l 266 -129 l 183 -129 l 520 1041 l 608 1041 " }, "Τ": { "x_min": -0.4375, "x_max": 777.453125, "ha": 839, "o": "m 777 893 l 458 893 l 458 0 l 319 0 l 319 892 l 0 892 l 0 1013 l 777 1013 l 777 893 " }, "y": { "x_min": 0, "x_max": 684.78125, "ha": 771, "o": "m 684 738 l 388 -83 q 311 -216 356 -167 q 173 -279 252 -279 q 97 -266 133 -279 l 97 -149 q 132 -155 109 -151 q 168 -160 155 -160 q 240 -114 213 -160 q 274 -26 248 -98 l 0 738 l 137 737 l 341 139 l 548 737 l 684 738 " }, "Π": { "x_min": 0, "x_max": 803, "ha": 917, "o": "m 803 0 l 667 0 l 667 886 l 140 886 l 140 0 l 0 0 l 0 1012 l 803 1012 l 803 0 " }, "ΐ": { "x_min": -111, "x_max": 339, "ha": 361, "o": "m 339 800 l 229 800 l 229 925 l 339 925 l 339 800 m -1 800 l -111 800 l -111 925 l -1 925 l -1 800 m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 737 l 167 737 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 103 239 101 q 284 112 257 104 l 284 3 m 302 1040 l 113 819 l 30 819 l 165 1040 l 302 1040 " }, "g": { "x_min": 0, "x_max": 686, "ha": 838, "o": "m 686 34 q 586 -213 686 -121 q 331 -306 487 -306 q 131 -252 216 -306 q 31 -84 31 -190 l 155 -84 q 228 -174 166 -138 q 345 -207 284 -207 q 514 -109 454 -207 q 564 89 564 -27 q 461 6 521 36 q 335 -23 401 -23 q 88 100 184 -23 q 0 370 0 215 q 87 634 0 522 q 330 758 183 758 q 457 728 398 758 q 564 644 515 699 l 564 737 l 686 737 l 686 34 m 582 367 q 529 560 582 481 q 358 652 468 652 q 189 561 250 652 q 135 369 135 482 q 189 176 135 255 q 361 85 251 85 q 529 176 468 85 q 582 367 582 255 " }, "²": { "x_min": 0, "x_max": 442, "ha": 539, "o": "m 442 383 l 0 383 q 91 566 0 492 q 260 668 176 617 q 354 798 354 727 q 315 875 354 845 q 227 905 277 905 q 136 869 173 905 q 99 761 99 833 l 14 761 q 82 922 14 864 q 232 974 141 974 q 379 926 316 974 q 442 797 442 878 q 351 635 442 704 q 183 539 321 611 q 92 455 92 491 l 442 455 l 442 383 " }, "–": { "x_min": 0, "x_max": 705.5625, "ha": 803, "o": "m 705 334 l 0 334 l 0 410 l 705 410 l 705 334 " }, "Κ": { "x_min": 0, "x_max": 819.5625, "ha": 893, "o": "m 819 0 l 650 0 l 294 509 l 139 356 l 139 0 l 0 0 l 0 1013 l 139 1013 l 139 526 l 626 1013 l 809 1013 l 395 600 l 819 0 " }, "ƒ": { "x_min": -46.265625, "x_max": 392, "ha": 513, "o": "m 392 651 l 259 651 l 79 -279 l -46 -278 l 134 651 l 14 651 l 14 751 l 135 751 q 151 948 135 900 q 304 1041 185 1041 q 334 1040 319 1041 q 392 1034 348 1039 l 392 922 q 337 931 360 931 q 271 883 287 931 q 260 793 260 853 l 260 751 l 392 751 l 392 651 " }, "e": { "x_min": 0, "x_max": 714, "ha": 813, "o": "m 714 326 l 140 326 q 200 157 140 227 q 359 87 260 87 q 488 130 431 87 q 561 245 545 174 l 697 245 q 577 48 670 123 q 358 -26 484 -26 q 97 85 195 -26 q 0 363 0 197 q 94 642 0 529 q 358 765 195 765 q 626 627 529 765 q 714 326 714 503 m 576 429 q 507 583 564 522 q 355 650 445 650 q 206 583 266 650 q 140 429 152 522 l 576 429 " }, "ό": { "x_min": 0, "x_max": 712, "ha": 815, "o": "m 356 -25 q 94 91 194 -25 q 0 368 0 202 q 92 642 0 533 q 356 761 192 761 q 617 644 517 761 q 712 368 712 533 q 619 91 712 201 q 356 -25 520 -25 m 356 85 q 527 175 465 85 q 583 369 583 255 q 528 562 583 484 q 356 651 466 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 356 85 250 85 m 576 1040 l 387 819 l 303 819 l 438 1040 l 576 1040 " }, "J": { "x_min": 0, "x_max": 588, "ha": 699, "o": "m 588 279 q 287 -26 588 -26 q 58 73 126 -26 q 0 327 0 158 l 133 327 q 160 172 133 227 q 288 96 198 96 q 426 171 391 96 q 449 336 449 219 l 449 1013 l 588 1013 l 588 279 " }, "»": { "x_min": -1, "x_max": 503, "ha": 601, "o": "m 503 302 l 280 136 l 281 256 l 429 373 l 281 486 l 280 608 l 503 440 l 503 302 m 221 302 l 0 136 l 0 255 l 145 372 l 0 486 l -1 608 l 221 440 l 221 302 " }, "©": { "x_min": -3, "x_max": 1008, "ha": 1106, "o": "m 502 -7 q 123 151 263 -7 q -3 501 -3 294 q 123 851 -3 706 q 502 1011 263 1011 q 881 851 739 1011 q 1008 501 1008 708 q 883 151 1008 292 q 502 -7 744 -7 m 502 60 q 830 197 709 60 q 940 501 940 322 q 831 805 940 681 q 502 944 709 944 q 174 805 296 944 q 65 501 65 680 q 173 197 65 320 q 502 60 294 60 m 741 394 q 661 246 731 302 q 496 190 591 190 q 294 285 369 190 q 228 497 228 370 q 295 714 228 625 q 499 813 370 813 q 656 762 588 813 q 733 625 724 711 l 634 625 q 589 704 629 673 q 498 735 550 735 q 377 666 421 735 q 334 504 334 597 q 374 340 334 408 q 490 272 415 272 q 589 304 549 272 q 638 394 628 337 l 741 394 " }, "ώ": { "x_min": 0, "x_max": 922, "ha": 1030, "o": "m 687 1040 l 498 819 l 415 819 l 549 1040 l 687 1040 m 922 339 q 856 97 922 203 q 650 -26 780 -26 q 538 9 587 -26 q 461 103 489 44 q 387 12 436 46 q 277 -22 339 -22 q 69 97 147 -22 q 0 338 0 202 q 45 551 0 444 q 161 737 84 643 l 302 737 q 175 552 219 647 q 124 336 124 446 q 155 179 124 248 q 275 88 197 88 q 375 163 341 88 q 400 294 400 219 l 400 572 l 524 572 l 524 294 q 561 135 524 192 q 643 88 591 88 q 762 182 719 88 q 797 341 797 257 q 745 555 797 450 q 619 737 705 637 l 760 737 q 874 551 835 640 q 922 339 922 444 " }, "^": { "x_min": 193.0625, "x_max": 598.609375, "ha": 792, "o": "m 598 772 l 515 772 l 395 931 l 277 772 l 193 772 l 326 1013 l 462 1013 l 598 772 " }, "«": { "x_min": 0, "x_max": 507.203125, "ha": 604, "o": "m 506 136 l 284 302 l 284 440 l 506 608 l 507 485 l 360 371 l 506 255 l 506 136 m 222 136 l 0 302 l 0 440 l 222 608 l 221 486 l 73 373 l 222 256 l 222 136 " }, "D": { "x_min": 0, "x_max": 828, "ha": 935, "o": "m 389 1013 q 714 867 593 1013 q 828 521 828 729 q 712 161 828 309 q 382 0 587 0 l 0 0 l 0 1013 l 389 1013 m 376 124 q 607 247 523 124 q 681 510 681 355 q 607 771 681 662 q 376 896 522 896 l 139 896 l 139 124 l 376 124 " }, "∙": { "x_min": 0, "x_max": 142, "ha": 239, "o": "m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 " }, "ÿ": { "x_min": 0, "x_max": 47, "ha": 125, "o": "m 47 3 q 37 -7 47 -7 q 28 0 30 -7 q 39 -4 32 -4 q 45 3 45 -1 l 37 0 q 28 9 28 0 q 39 19 28 19 l 47 16 l 47 19 l 47 3 m 37 1 q 44 8 44 1 q 37 16 44 16 q 30 8 30 16 q 37 1 30 1 m 26 1 l 23 22 l 14 0 l 3 22 l 3 3 l 0 25 l 13 1 l 22 25 l 26 1 " }, "w": { "x_min": 0, "x_max": 1009.71875, "ha": 1100, "o": "m 1009 738 l 783 0 l 658 0 l 501 567 l 345 0 l 222 0 l 0 738 l 130 738 l 284 174 l 432 737 l 576 738 l 721 173 l 881 737 l 1009 738 " }, "$": { "x_min": 0, "x_max": 700, "ha": 793, "o": "m 664 717 l 542 717 q 490 825 531 785 q 381 872 450 865 l 381 551 q 620 446 540 522 q 700 241 700 370 q 618 45 700 116 q 381 -25 536 -25 l 381 -152 l 307 -152 l 307 -25 q 81 62 162 -25 q 0 297 0 149 l 124 297 q 169 146 124 204 q 307 81 215 89 l 307 441 q 80 536 148 469 q 13 725 13 603 q 96 910 13 839 q 307 982 180 982 l 307 1077 l 381 1077 l 381 982 q 574 917 494 982 q 664 717 664 845 m 307 565 l 307 872 q 187 831 233 872 q 142 724 142 791 q 180 618 142 656 q 307 565 218 580 m 381 76 q 562 237 562 96 q 517 361 562 313 q 381 423 472 409 l 381 76 " }, "\\": { "x_min": -0.015625, "x_max": 425.0625, "ha": 522, "o": "m 425 -129 l 337 -129 l 0 1041 l 83 1041 l 425 -129 " }, "µ": { "x_min": 0, "x_max": 697.21875, "ha": 747, "o": "m 697 -4 q 629 -14 658 -14 q 498 97 513 -14 q 422 9 470 41 q 313 -23 374 -23 q 207 4 258 -23 q 119 81 156 32 l 119 -278 l 0 -278 l 0 738 l 124 738 l 124 343 q 165 173 124 246 q 308 83 216 83 q 452 178 402 83 q 493 359 493 255 l 493 738 l 617 738 l 617 214 q 623 136 617 160 q 673 92 637 92 q 697 96 684 92 l 697 -4 " }, "Ι": { "x_min": 42, "x_max": 181, "ha": 297, "o": "m 181 0 l 42 0 l 42 1013 l 181 1013 l 181 0 " }, "Ύ": { "x_min": 0, "x_max": 1144.5, "ha": 1214, "o": "m 1144 1012 l 807 416 l 807 0 l 667 0 l 667 416 l 325 1012 l 465 1012 l 736 533 l 1004 1012 l 1144 1012 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 " }, "’": { "x_min": 0, "x_max": 139, "ha": 236, "o": "m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 " }, "Ν": { "x_min": 0, "x_max": 801, "ha": 915, "o": "m 801 0 l 651 0 l 131 822 l 131 0 l 0 0 l 0 1013 l 151 1013 l 670 191 l 670 1013 l 801 1013 l 801 0 " }, "-": { "x_min": 8.71875, "x_max": 350.390625, "ha": 478, "o": "m 350 317 l 8 317 l 8 428 l 350 428 l 350 317 " }, "Q": { "x_min": 0, "x_max": 968, "ha": 1072, "o": "m 954 5 l 887 -79 l 744 35 q 622 -11 687 2 q 483 -26 556 -26 q 127 130 262 -26 q 0 504 0 279 q 127 880 0 728 q 484 1041 262 1041 q 841 884 708 1041 q 968 507 968 735 q 933 293 968 398 q 832 104 899 188 l 954 5 m 723 191 q 802 330 777 248 q 828 499 828 412 q 744 790 828 673 q 483 922 650 922 q 228 791 322 922 q 142 505 142 673 q 227 221 142 337 q 487 91 323 91 q 632 123 566 91 l 520 215 l 587 301 l 723 191 " }, "ς": { "x_min": 1, "x_max": 676.28125, "ha": 740, "o": "m 676 460 l 551 460 q 498 595 542 546 q 365 651 448 651 q 199 578 263 651 q 136 401 136 505 q 266 178 136 241 q 508 106 387 142 q 640 -50 640 62 q 625 -158 640 -105 q 583 -278 611 -211 l 465 -278 q 498 -182 490 -211 q 515 -80 515 -126 q 381 12 515 -15 q 134 91 197 51 q 1 388 1 179 q 100 651 1 542 q 354 761 199 761 q 587 680 498 761 q 676 460 676 599 " }, "M": { "x_min": 0, "x_max": 954, "ha": 1067, "o": "m 954 0 l 819 0 l 819 869 l 537 0 l 405 0 l 128 866 l 128 0 l 0 0 l 0 1013 l 200 1013 l 472 160 l 757 1013 l 954 1013 l 954 0 " }, "Ψ": { "x_min": 0, "x_max": 1006, "ha": 1094, "o": "m 1006 678 q 914 319 1006 429 q 571 200 814 200 l 571 0 l 433 0 l 433 200 q 92 319 194 200 q 0 678 0 429 l 0 1013 l 139 1013 l 139 679 q 191 417 139 492 q 433 326 255 326 l 433 1013 l 571 1013 l 571 326 l 580 326 q 813 423 747 326 q 868 679 868 502 l 868 1013 l 1006 1013 l 1006 678 " }, "C": { "x_min": 0, "x_max": 886, "ha": 944, "o": "m 886 379 q 760 87 886 201 q 455 -26 634 -26 q 112 136 236 -26 q 0 509 0 283 q 118 882 0 737 q 469 1041 245 1041 q 748 955 630 1041 q 879 708 879 859 l 745 708 q 649 862 724 805 q 473 920 573 920 q 219 791 312 920 q 136 509 136 675 q 217 229 136 344 q 470 99 311 99 q 672 179 591 99 q 753 379 753 259 l 886 379 " }, "!": { "x_min": 0, "x_max": 138, "ha": 236, "o": "m 138 684 q 116 409 138 629 q 105 244 105 299 l 33 244 q 16 465 33 313 q 0 684 0 616 l 0 1013 l 138 1013 l 138 684 m 138 0 l 0 0 l 0 151 l 138 151 l 138 0 " }, "{": { "x_min": 0, "x_max": 480.5625, "ha": 578, "o": "m 480 -286 q 237 -213 303 -286 q 187 -45 187 -159 q 194 48 187 -15 q 201 141 201 112 q 164 264 201 225 q 0 314 118 314 l 0 417 q 164 471 119 417 q 201 605 201 514 q 199 665 201 644 q 193 772 193 769 q 241 941 193 887 q 480 1015 308 1015 l 480 915 q 336 866 375 915 q 306 742 306 828 q 310 662 306 717 q 314 577 314 606 q 288 452 314 500 q 176 365 256 391 q 289 275 257 337 q 314 143 314 226 q 313 84 314 107 q 310 -11 310 -5 q 339 -131 310 -94 q 480 -182 377 -182 l 480 -286 " }, "X": { "x_min": -0.015625, "x_max": 854.15625, "ha": 940, "o": "m 854 0 l 683 0 l 423 409 l 166 0 l 0 0 l 347 519 l 18 1013 l 186 1013 l 428 637 l 675 1013 l 836 1013 l 504 520 l 854 0 " }, "#": { "x_min": 0, "x_max": 963.890625, "ha": 1061, "o": "m 963 690 l 927 590 l 719 590 l 655 410 l 876 410 l 840 310 l 618 310 l 508 -3 l 393 -2 l 506 309 l 329 310 l 215 -2 l 102 -3 l 212 310 l 0 310 l 36 410 l 248 409 l 312 590 l 86 590 l 120 690 l 347 690 l 459 1006 l 573 1006 l 462 690 l 640 690 l 751 1006 l 865 1006 l 754 690 l 963 690 m 606 590 l 425 590 l 362 410 l 543 410 l 606 590 " }, "ι": { "x_min": 42, "x_max": 284, "ha": 361, "o": "m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 738 l 167 738 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 103 239 101 q 284 112 257 104 l 284 3 " }, "Ά": { "x_min": 0, "x_max": 906.953125, "ha": 982, "o": "m 283 1040 l 88 799 l 5 799 l 145 1040 l 283 1040 m 906 0 l 756 0 l 650 303 l 251 303 l 143 0 l 0 0 l 376 1012 l 529 1012 l 906 0 m 609 421 l 452 866 l 293 421 l 609 421 " }, ")": { "x_min": 0, "x_max": 318, "ha": 415, "o": "m 318 365 q 257 25 318 191 q 87 -290 197 -141 l 0 -290 q 140 21 93 -128 q 193 360 193 189 q 141 704 193 537 q 0 1024 97 850 l 87 1024 q 257 706 197 871 q 318 365 318 542 " }, "ε": { "x_min": 0, "x_max": 634.71875, "ha": 714, "o": "m 634 234 q 527 38 634 110 q 300 -25 433 -25 q 98 29 183 -25 q 0 204 0 93 q 37 314 0 265 q 128 390 67 353 q 56 460 82 419 q 26 555 26 505 q 114 712 26 654 q 295 763 191 763 q 499 700 416 763 q 589 515 589 631 l 478 515 q 419 618 464 580 q 307 657 374 657 q 207 630 253 657 q 151 547 151 598 q 238 445 151 469 q 389 434 280 434 l 389 331 l 349 331 q 206 315 255 331 q 125 210 125 287 q 183 107 125 145 q 302 76 233 76 q 436 117 379 76 q 509 234 493 159 l 634 234 " }, "Δ": { "x_min": 0, "x_max": 952.78125, "ha": 1028, "o": "m 952 0 l 0 0 l 400 1013 l 551 1013 l 952 0 m 762 124 l 476 867 l 187 124 l 762 124 " }, "}": { "x_min": 0, "x_max": 481, "ha": 578, "o": "m 481 314 q 318 262 364 314 q 282 136 282 222 q 284 65 282 97 q 293 -58 293 -48 q 241 -217 293 -166 q 0 -286 174 -286 l 0 -182 q 143 -130 105 -182 q 171 -2 171 -93 q 168 81 171 22 q 165 144 165 140 q 188 275 165 229 q 306 365 220 339 q 191 455 224 391 q 165 588 165 505 q 168 681 165 624 q 171 742 171 737 q 141 865 171 827 q 0 915 102 915 l 0 1015 q 243 942 176 1015 q 293 773 293 888 q 287 675 293 741 q 282 590 282 608 q 318 466 282 505 q 481 417 364 417 l 481 314 " }, "‰": { "x_min": -3, "x_max": 1672, "ha": 1821, "o": "m 846 0 q 664 76 732 0 q 603 244 603 145 q 662 412 603 344 q 846 489 729 489 q 1027 412 959 489 q 1089 244 1089 343 q 1029 76 1089 144 q 846 0 962 0 m 845 103 q 945 143 910 103 q 981 243 981 184 q 947 340 981 301 q 845 385 910 385 q 745 342 782 385 q 709 243 709 300 q 742 147 709 186 q 845 103 781 103 m 888 986 l 284 -25 l 199 -25 l 803 986 l 888 986 m 241 468 q 58 545 126 468 q -3 715 -3 615 q 56 881 -3 813 q 238 958 124 958 q 421 881 353 958 q 483 712 483 813 q 423 544 483 612 q 241 468 356 468 m 241 855 q 137 811 175 855 q 100 710 100 768 q 136 612 100 653 q 240 572 172 572 q 344 614 306 572 q 382 713 382 656 q 347 810 382 771 q 241 855 308 855 m 1428 0 q 1246 76 1314 0 q 1185 244 1185 145 q 1244 412 1185 344 q 1428 489 1311 489 q 1610 412 1542 489 q 1672 244 1672 343 q 1612 76 1672 144 q 1428 0 1545 0 m 1427 103 q 1528 143 1492 103 q 1564 243 1564 184 q 1530 340 1564 301 q 1427 385 1492 385 q 1327 342 1364 385 q 1291 243 1291 300 q 1324 147 1291 186 q 1427 103 1363 103 " }, "a": { "x_min": 0, "x_max": 698.609375, "ha": 794, "o": "m 698 0 q 661 -12 679 -7 q 615 -17 643 -17 q 536 12 564 -17 q 500 96 508 41 q 384 6 456 37 q 236 -25 312 -25 q 65 31 130 -25 q 0 194 0 88 q 118 390 0 334 q 328 435 180 420 q 488 483 476 451 q 495 523 495 504 q 442 619 495 584 q 325 654 389 654 q 209 617 257 654 q 152 513 161 580 l 33 513 q 123 705 33 633 q 332 772 207 772 q 528 712 448 772 q 617 531 617 645 l 617 163 q 624 108 617 126 q 664 90 632 90 l 698 94 l 698 0 m 491 262 l 491 372 q 272 329 350 347 q 128 201 128 294 q 166 113 128 144 q 264 83 205 83 q 414 130 346 83 q 491 262 491 183 " }, "—": { "x_min": 0, "x_max": 941.671875, "ha": 1039, "o": "m 941 334 l 0 334 l 0 410 l 941 410 l 941 334 " }, "=": { "x_min": 8.71875, "x_max": 780.953125, "ha": 792, "o": "m 780 510 l 8 510 l 8 606 l 780 606 l 780 510 m 780 235 l 8 235 l 8 332 l 780 332 l 780 235 " }, "N": { "x_min": 0, "x_max": 801, "ha": 914, "o": "m 801 0 l 651 0 l 131 823 l 131 0 l 0 0 l 0 1013 l 151 1013 l 670 193 l 670 1013 l 801 1013 l 801 0 " }, "ρ": { "x_min": 0, "x_max": 712, "ha": 797, "o": "m 712 369 q 620 94 712 207 q 362 -26 521 -26 q 230 2 292 -26 q 119 83 167 30 l 119 -278 l 0 -278 l 0 362 q 91 643 0 531 q 355 764 190 764 q 617 647 517 764 q 712 369 712 536 m 583 366 q 530 559 583 480 q 359 651 469 651 q 190 562 252 651 q 135 370 135 483 q 189 176 135 257 q 359 85 250 85 q 528 175 466 85 q 583 366 583 254 " }, "2": { "x_min": 59, "x_max": 731, "ha": 792, "o": "m 731 0 l 59 0 q 197 314 59 188 q 457 487 199 315 q 598 691 598 580 q 543 819 598 772 q 411 867 488 867 q 272 811 328 867 q 209 630 209 747 l 81 630 q 182 901 81 805 q 408 986 271 986 q 629 909 536 986 q 731 694 731 826 q 613 449 731 541 q 378 316 495 383 q 201 122 235 234 l 731 122 l 731 0 " }, "¯": { "x_min": 0, "x_max": 941.671875, "ha": 938, "o": "m 941 1033 l 0 1033 l 0 1109 l 941 1109 l 941 1033 " }, "Z": { "x_min": 0, "x_max": 779, "ha": 849, "o": "m 779 0 l 0 0 l 0 113 l 621 896 l 40 896 l 40 1013 l 779 1013 l 778 887 l 171 124 l 779 124 l 779 0 " }, "u": { "x_min": 0, "x_max": 617, "ha": 729, "o": "m 617 0 l 499 0 l 499 110 q 391 10 460 45 q 246 -25 322 -25 q 61 58 127 -25 q 0 258 0 136 l 0 738 l 125 738 l 125 284 q 156 148 125 202 q 273 82 197 82 q 433 165 369 82 q 493 340 493 243 l 493 738 l 617 738 l 617 0 " }, "k": { "x_min": 0, "x_max": 612.484375, "ha": 697, "o": "m 612 738 l 338 465 l 608 0 l 469 0 l 251 382 l 121 251 l 121 0 l 0 0 l 0 1013 l 121 1013 l 121 402 l 456 738 l 612 738 " }, "Η": { "x_min": 0, "x_max": 803, "ha": 917, "o": "m 803 0 l 667 0 l 667 475 l 140 475 l 140 0 l 0 0 l 0 1013 l 140 1013 l 140 599 l 667 599 l 667 1013 l 803 1013 l 803 0 " }, "Α": { "x_min": 0, "x_max": 906.953125, "ha": 985, "o": "m 906 0 l 756 0 l 650 303 l 251 303 l 143 0 l 0 0 l 376 1013 l 529 1013 l 906 0 m 609 421 l 452 866 l 293 421 l 609 421 " }, "s": { "x_min": 0, "x_max": 604, "ha": 697, "o": "m 604 217 q 501 36 604 104 q 292 -23 411 -23 q 86 43 166 -23 q 0 238 0 114 l 121 237 q 175 122 121 164 q 300 85 223 85 q 415 112 363 85 q 479 207 479 147 q 361 309 479 276 q 140 372 141 370 q 21 544 21 426 q 111 708 21 647 q 298 761 190 761 q 492 705 413 761 q 583 531 583 643 l 462 531 q 412 625 462 594 q 298 657 363 657 q 199 636 242 657 q 143 558 143 608 q 262 454 143 486 q 484 394 479 397 q 604 217 604 341 " }, "B": { "x_min": 0, "x_max": 778, "ha": 876, "o": "m 580 546 q 724 469 670 535 q 778 311 778 403 q 673 83 778 171 q 432 0 575 0 l 0 0 l 0 1013 l 411 1013 q 629 957 541 1013 q 732 768 732 892 q 691 633 732 693 q 580 546 650 572 m 393 899 l 139 899 l 139 588 l 379 588 q 521 624 462 588 q 592 744 592 667 q 531 859 592 819 q 393 899 471 899 m 419 124 q 566 169 504 124 q 635 303 635 219 q 559 436 635 389 q 402 477 494 477 l 139 477 l 139 124 l 419 124 " }, "…": { "x_min": 0, "x_max": 614, "ha": 708, "o": "m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 m 378 0 l 236 0 l 236 151 l 378 151 l 378 0 m 614 0 l 472 0 l 472 151 l 614 151 l 614 0 " }, "?": { "x_min": 0, "x_max": 607, "ha": 704, "o": "m 607 777 q 543 599 607 674 q 422 474 482 537 q 357 272 357 391 l 236 272 q 297 487 236 395 q 411 619 298 490 q 474 762 474 691 q 422 885 474 838 q 301 933 371 933 q 179 880 228 933 q 124 706 124 819 l 0 706 q 94 963 0 872 q 302 1044 177 1044 q 511 973 423 1044 q 607 777 607 895 m 370 0 l 230 0 l 230 151 l 370 151 l 370 0 " }, "H": { "x_min": 0, "x_max": 803, "ha": 915, "o": "m 803 0 l 667 0 l 667 475 l 140 475 l 140 0 l 0 0 l 0 1013 l 140 1013 l 140 599 l 667 599 l 667 1013 l 803 1013 l 803 0 " }, "ν": { "x_min": 0, "x_max": 675, "ha": 761, "o": "m 675 738 l 404 0 l 272 0 l 0 738 l 133 738 l 340 147 l 541 738 l 675 738 " }, "c": { "x_min": 1, "x_max": 701.390625, "ha": 775, "o": "m 701 264 q 584 53 681 133 q 353 -26 487 -26 q 91 91 188 -26 q 1 370 1 201 q 92 645 1 537 q 353 761 190 761 q 572 688 479 761 q 690 493 666 615 l 556 493 q 487 606 545 562 q 356 650 428 650 q 186 563 246 650 q 134 372 134 487 q 188 179 134 258 q 359 88 250 88 q 492 136 437 88 q 566 264 548 185 l 701 264 " }, "¶": { "x_min": 0, "x_max": 566.671875, "ha": 678, "o": "m 21 892 l 52 892 l 98 761 l 145 892 l 176 892 l 178 741 l 157 741 l 157 867 l 108 741 l 88 741 l 40 871 l 40 741 l 21 741 l 21 892 m 308 854 l 308 731 q 252 691 308 691 q 227 691 240 691 q 207 696 213 695 l 207 712 l 253 706 q 288 733 288 706 l 288 763 q 244 741 279 741 q 193 797 193 741 q 261 860 193 860 q 287 860 273 860 q 308 854 302 855 m 288 842 l 263 843 q 213 796 213 843 q 248 756 213 756 q 288 796 288 756 l 288 842 m 566 988 l 502 988 l 502 -1 l 439 -1 l 439 988 l 317 988 l 317 -1 l 252 -1 l 252 602 q 81 653 155 602 q 0 805 0 711 q 101 989 0 918 q 309 1053 194 1053 l 566 1053 l 566 988 " }, "β": { "x_min": 0, "x_max": 660, "ha": 745, "o": "m 471 550 q 610 450 561 522 q 660 280 660 378 q 578 64 660 151 q 367 -22 497 -22 q 239 5 299 -22 q 126 82 178 32 l 126 -278 l 0 -278 l 0 593 q 54 903 0 801 q 318 1042 127 1042 q 519 964 436 1042 q 603 771 603 887 q 567 644 603 701 q 471 550 532 586 m 337 79 q 476 138 418 79 q 535 279 535 198 q 427 437 535 386 q 226 477 344 477 l 226 583 q 398 620 329 583 q 486 762 486 668 q 435 884 486 833 q 312 935 384 935 q 169 861 219 935 q 126 698 126 797 l 126 362 q 170 169 126 242 q 337 79 224 79 " }, "Μ": { "x_min": 0, "x_max": 954, "ha": 1068, "o": "m 954 0 l 819 0 l 819 868 l 537 0 l 405 0 l 128 865 l 128 0 l 0 0 l 0 1013 l 199 1013 l 472 158 l 758 1013 l 954 1013 l 954 0 " }, "Ό": { "x_min": 0.109375, "x_max": 1120, "ha": 1217, "o": "m 1120 505 q 994 132 1120 282 q 642 -29 861 -29 q 290 130 422 -29 q 167 505 167 280 q 294 883 167 730 q 650 1046 430 1046 q 999 882 868 1046 q 1120 505 1120 730 m 977 504 q 896 784 977 669 q 644 915 804 915 q 391 785 484 915 q 307 504 307 669 q 391 224 307 339 q 644 95 486 95 q 894 224 803 95 q 977 504 977 339 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 " }, "Ή": { "x_min": 0, "x_max": 1158, "ha": 1275, "o": "m 1158 0 l 1022 0 l 1022 475 l 496 475 l 496 0 l 356 0 l 356 1012 l 496 1012 l 496 599 l 1022 599 l 1022 1012 l 1158 1012 l 1158 0 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 " }, "•": { "x_min": 0, "x_max": 663.890625, "ha": 775, "o": "m 663 529 q 566 293 663 391 q 331 196 469 196 q 97 294 194 196 q 0 529 0 393 q 96 763 0 665 q 331 861 193 861 q 566 763 469 861 q 663 529 663 665 " }, "¥": { "x_min": 0.1875, "x_max": 819.546875, "ha": 886, "o": "m 563 561 l 697 561 l 696 487 l 520 487 l 482 416 l 482 380 l 697 380 l 695 308 l 482 308 l 482 0 l 342 0 l 342 308 l 125 308 l 125 380 l 342 380 l 342 417 l 303 487 l 125 487 l 125 561 l 258 561 l 0 1013 l 140 1013 l 411 533 l 679 1013 l 819 1013 l 563 561 " }, "(": { "x_min": 0, "x_max": 318.0625, "ha": 415, "o": "m 318 -290 l 230 -290 q 61 23 122 -142 q 0 365 0 190 q 62 712 0 540 q 230 1024 119 869 l 318 1024 q 175 705 219 853 q 125 360 125 542 q 176 22 125 187 q 318 -290 223 -127 " }, "U": { "x_min": 0, "x_max": 796, "ha": 904, "o": "m 796 393 q 681 93 796 212 q 386 -25 566 -25 q 101 95 208 -25 q 0 393 0 211 l 0 1013 l 138 1013 l 138 391 q 204 191 138 270 q 394 107 276 107 q 586 191 512 107 q 656 391 656 270 l 656 1013 l 796 1013 l 796 393 " }, "γ": { "x_min": 0.5, "x_max": 744.953125, "ha": 822, "o": "m 744 737 l 463 54 l 463 -278 l 338 -278 l 338 54 l 154 495 q 104 597 124 569 q 13 651 67 651 l 0 651 l 0 751 l 39 753 q 168 711 121 753 q 242 594 207 676 l 403 208 l 617 737 l 744 737 " }, "α": { "x_min": 0, "x_max": 765.5625, "ha": 809, "o": "m 765 -4 q 698 -14 726 -14 q 564 97 586 -14 q 466 7 525 40 q 337 -26 407 -26 q 88 98 186 -26 q 0 369 0 212 q 88 637 0 525 q 337 760 184 760 q 465 728 407 760 q 563 637 524 696 l 563 739 l 685 739 l 685 222 q 693 141 685 168 q 748 94 708 94 q 765 96 760 94 l 765 -4 m 584 371 q 531 562 584 485 q 360 653 470 653 q 192 566 254 653 q 135 379 135 489 q 186 181 135 261 q 358 84 247 84 q 528 176 465 84 q 584 371 584 260 " }, "F": { "x_min": 0, "x_max": 683.328125, "ha": 717, "o": "m 683 888 l 140 888 l 140 583 l 613 583 l 613 458 l 140 458 l 140 0 l 0 0 l 0 1013 l 683 1013 l 683 888 " }, "­": { "x_min": 0, "x_max": 705.5625, "ha": 803, "o": "m 705 334 l 0 334 l 0 410 l 705 410 l 705 334 " }, ":": { "x_min": 0, "x_max": 142, "ha": 239, "o": "m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 " }, "Χ": { "x_min": 0, "x_max": 854.171875, "ha": 935, "o": "m 854 0 l 683 0 l 423 409 l 166 0 l 0 0 l 347 519 l 18 1013 l 186 1013 l 427 637 l 675 1013 l 836 1013 l 504 521 l 854 0 " }, "*": { "x_min": 116, "x_max": 674, "ha": 792, "o": "m 674 768 l 475 713 l 610 544 l 517 477 l 394 652 l 272 478 l 178 544 l 314 713 l 116 766 l 153 876 l 341 812 l 342 1013 l 446 1013 l 446 811 l 635 874 l 674 768 " }, "†": { "x_min": 0, "x_max": 777, "ha": 835, "o": "m 458 804 l 777 804 l 777 683 l 458 683 l 458 0 l 319 0 l 319 681 l 0 683 l 0 804 l 319 804 l 319 1015 l 458 1013 l 458 804 " }, "°": { "x_min": 0, "x_max": 347, "ha": 444, "o": "m 173 802 q 43 856 91 802 q 0 977 0 905 q 45 1101 0 1049 q 173 1153 90 1153 q 303 1098 255 1153 q 347 977 347 1049 q 303 856 347 905 q 173 802 256 802 m 173 884 q 238 910 214 884 q 262 973 262 937 q 239 1038 262 1012 q 173 1064 217 1064 q 108 1037 132 1064 q 85 973 85 1010 q 108 910 85 937 q 173 884 132 884 " }, "V": { "x_min": 0, "x_max": 862.71875, "ha": 940, "o": "m 862 1013 l 505 0 l 361 0 l 0 1013 l 143 1013 l 434 165 l 718 1012 l 862 1013 " }, "Ξ": { "x_min": 0, "x_max": 734.71875, "ha": 763, "o": "m 723 889 l 9 889 l 9 1013 l 723 1013 l 723 889 m 673 463 l 61 463 l 61 589 l 673 589 l 673 463 m 734 0 l 0 0 l 0 124 l 734 124 l 734 0 " }, " ": { "x_min": 0, "x_max": 0, "ha": 853 }, "Ϋ": { "x_min": 0.328125, "x_max": 819.515625, "ha": 889, "o": "m 588 1046 l 460 1046 l 460 1189 l 588 1189 l 588 1046 m 360 1046 l 232 1046 l 232 1189 l 360 1189 l 360 1046 m 819 1012 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1012 l 140 1012 l 411 533 l 679 1012 l 819 1012 " }, "0": { "x_min": 73, "x_max": 715, "ha": 792, "o": "m 394 -29 q 153 129 242 -29 q 73 479 73 272 q 152 829 73 687 q 394 989 241 989 q 634 829 545 989 q 715 479 715 684 q 635 129 715 270 q 394 -29 546 -29 m 394 89 q 546 211 489 89 q 598 479 598 322 q 548 748 598 640 q 394 871 491 871 q 241 748 298 871 q 190 479 190 637 q 239 211 190 319 q 394 89 296 89 " }, "”": { "x_min": 0, "x_max": 347, "ha": 454, "o": "m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 m 347 851 q 310 737 347 784 q 208 669 273 690 l 208 734 q 267 787 250 741 q 280 873 280 821 l 208 873 l 208 1013 l 347 1013 l 347 851 " }, "@": { "x_min": 0, "x_max": 1260, "ha": 1357, "o": "m 1098 -45 q 877 -160 1001 -117 q 633 -203 752 -203 q 155 -29 327 -203 q 0 360 0 127 q 176 802 0 616 q 687 1008 372 1008 q 1123 854 969 1008 q 1260 517 1260 718 q 1155 216 1260 341 q 868 82 1044 82 q 772 106 801 82 q 737 202 737 135 q 647 113 700 144 q 527 82 594 82 q 367 147 420 82 q 314 312 314 212 q 401 565 314 452 q 639 690 498 690 q 810 588 760 690 l 849 668 l 938 668 q 877 441 900 532 q 833 226 833 268 q 853 182 833 198 q 902 167 873 167 q 1088 272 1012 167 q 1159 512 1159 372 q 1051 793 1159 681 q 687 925 925 925 q 248 747 415 925 q 97 361 97 586 q 226 26 97 159 q 627 -122 370 -122 q 856 -87 737 -122 q 1061 8 976 -53 l 1098 -45 m 786 488 q 738 580 777 545 q 643 615 700 615 q 483 517 548 615 q 425 322 425 430 q 457 203 425 250 q 552 156 490 156 q 722 273 665 156 q 786 488 738 309 " }, "Ί": { "x_min": 0, "x_max": 499, "ha": 613, "o": "m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 m 499 0 l 360 0 l 360 1012 l 499 1012 l 499 0 " }, "i": { "x_min": 14, "x_max": 136, "ha": 275, "o": "m 136 873 l 14 873 l 14 1013 l 136 1013 l 136 873 m 136 0 l 14 0 l 14 737 l 136 737 l 136 0 " }, "Β": { "x_min": 0, "x_max": 778, "ha": 877, "o": "m 580 545 q 724 468 671 534 q 778 310 778 402 q 673 83 778 170 q 432 0 575 0 l 0 0 l 0 1013 l 411 1013 q 629 957 541 1013 q 732 768 732 891 q 691 632 732 692 q 580 545 650 571 m 393 899 l 139 899 l 139 587 l 379 587 q 521 623 462 587 q 592 744 592 666 q 531 859 592 819 q 393 899 471 899 m 419 124 q 566 169 504 124 q 635 302 635 219 q 559 435 635 388 q 402 476 494 476 l 139 476 l 139 124 l 419 124 " }, "υ": { "x_min": 0, "x_max": 617, "ha": 725, "o": "m 617 352 q 540 94 617 199 q 308 -24 455 -24 q 76 94 161 -24 q 0 352 0 199 l 0 739 l 126 739 l 126 355 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 355 492 257 l 492 739 l 617 739 l 617 352 " }, "]": { "x_min": 0, "x_max": 275, "ha": 372, "o": "m 275 -281 l 0 -281 l 0 -187 l 151 -187 l 151 920 l 0 920 l 0 1013 l 275 1013 l 275 -281 " }, "m": { "x_min": 0, "x_max": 1019, "ha": 1128, "o": "m 1019 0 l 897 0 l 897 454 q 860 591 897 536 q 739 660 816 660 q 613 586 659 660 q 573 436 573 522 l 573 0 l 447 0 l 447 455 q 412 591 447 535 q 294 657 372 657 q 165 586 213 657 q 122 437 122 521 l 122 0 l 0 0 l 0 738 l 117 738 l 117 640 q 202 730 150 697 q 316 763 254 763 q 437 730 381 763 q 525 642 494 697 q 621 731 559 700 q 753 763 682 763 q 943 694 867 763 q 1019 512 1019 625 l 1019 0 " }, "χ": { "x_min": 8.328125, "x_max": 780.5625, "ha": 815, "o": "m 780 -278 q 715 -294 747 -294 q 616 -257 663 -294 q 548 -175 576 -227 l 379 133 l 143 -277 l 9 -277 l 313 254 l 163 522 q 127 586 131 580 q 36 640 91 640 q 8 637 27 640 l 8 752 l 52 757 q 162 719 113 757 q 236 627 200 690 l 383 372 l 594 737 l 726 737 l 448 250 l 625 -69 q 670 -153 647 -110 q 743 -188 695 -188 q 780 -184 759 -188 l 780 -278 " }, "8": { "x_min": 55, "x_max": 736, "ha": 792, "o": "m 571 527 q 694 424 652 491 q 736 280 736 358 q 648 71 736 158 q 395 -26 551 -26 q 142 69 238 -26 q 55 279 55 157 q 96 425 55 359 q 220 527 138 491 q 120 615 153 562 q 88 726 88 668 q 171 904 88 827 q 395 986 261 986 q 618 905 529 986 q 702 727 702 830 q 670 616 702 667 q 571 527 638 565 m 394 565 q 519 610 475 565 q 563 717 563 655 q 521 823 563 781 q 392 872 474 872 q 265 824 312 872 q 224 720 224 783 q 265 613 224 656 q 394 565 312 565 m 395 91 q 545 150 488 91 q 597 280 597 204 q 546 408 597 355 q 395 465 492 465 q 244 408 299 465 q 194 280 194 356 q 244 150 194 203 q 395 91 299 91 " }, "ί": { "x_min": 42, "x_max": 326.71875, "ha": 361, "o": "m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 737 l 167 737 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 102 239 101 q 284 112 257 104 l 284 3 m 326 1040 l 137 819 l 54 819 l 189 1040 l 326 1040 " }, "Ζ": { "x_min": 0, "x_max": 779.171875, "ha": 850, "o": "m 779 0 l 0 0 l 0 113 l 620 896 l 40 896 l 40 1013 l 779 1013 l 779 887 l 170 124 l 779 124 l 779 0 " }, "R": { "x_min": 0, "x_max": 781.953125, "ha": 907, "o": "m 781 0 l 623 0 q 587 242 590 52 q 407 433 585 433 l 138 433 l 138 0 l 0 0 l 0 1013 l 396 1013 q 636 946 539 1013 q 749 731 749 868 q 711 597 749 659 q 608 502 674 534 q 718 370 696 474 q 729 207 722 352 q 781 26 736 62 l 781 0 m 373 551 q 533 594 465 551 q 614 731 614 645 q 532 859 614 815 q 373 896 465 896 l 138 896 l 138 551 l 373 551 " }, "o": { "x_min": 0, "x_max": 713, "ha": 821, "o": "m 357 -25 q 94 91 194 -25 q 0 368 0 202 q 93 642 0 533 q 357 761 193 761 q 618 644 518 761 q 713 368 713 533 q 619 91 713 201 q 357 -25 521 -25 m 357 85 q 528 175 465 85 q 584 369 584 255 q 529 562 584 484 q 357 651 467 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 357 85 250 85 " }, "5": { "x_min": 54.171875, "x_max": 738, "ha": 792, "o": "m 738 314 q 626 60 738 153 q 382 -23 526 -23 q 155 47 248 -23 q 54 256 54 125 l 183 256 q 259 132 204 174 q 382 91 314 91 q 533 149 471 91 q 602 314 602 213 q 538 469 602 411 q 386 528 475 528 q 284 506 332 528 q 197 439 237 484 l 81 439 l 159 958 l 684 958 l 684 840 l 254 840 l 214 579 q 306 627 258 612 q 407 643 354 643 q 636 552 540 643 q 738 314 738 457 " }, "7": { "x_min": 58.71875, "x_max": 730.953125, "ha": 792, "o": "m 730 839 q 469 448 560 641 q 335 0 378 255 l 192 0 q 328 441 235 252 q 593 830 421 630 l 58 830 l 58 958 l 730 958 l 730 839 " }, "K": { "x_min": 0, "x_max": 819.46875, "ha": 906, "o": "m 819 0 l 649 0 l 294 509 l 139 355 l 139 0 l 0 0 l 0 1013 l 139 1013 l 139 526 l 626 1013 l 809 1013 l 395 600 l 819 0 " }, ",": { "x_min": 0, "x_max": 142, "ha": 239, "o": "m 142 -12 q 105 -132 142 -82 q 0 -205 68 -182 l 0 -138 q 57 -82 40 -124 q 70 0 70 -51 l 0 0 l 0 151 l 142 151 l 142 -12 " }, "d": { "x_min": 0, "x_max": 683, "ha": 796, "o": "m 683 0 l 564 0 l 564 93 q 456 6 516 38 q 327 -25 395 -25 q 87 100 181 -25 q 0 365 0 215 q 90 639 0 525 q 343 763 187 763 q 564 647 486 763 l 564 1013 l 683 1013 l 683 0 m 582 373 q 529 562 582 484 q 361 653 468 653 q 190 561 253 653 q 135 365 135 479 q 189 175 135 254 q 358 85 251 85 q 529 178 468 85 q 582 373 582 258 " }, "¨": { "x_min": -109, "x_max": 247, "ha": 232, "o": "m 247 1046 l 119 1046 l 119 1189 l 247 1189 l 247 1046 m 19 1046 l -109 1046 l -109 1189 l 19 1189 l 19 1046 " }, "E": { "x_min": 0, "x_max": 736.109375, "ha": 789, "o": "m 736 0 l 0 0 l 0 1013 l 725 1013 l 725 889 l 139 889 l 139 585 l 677 585 l 677 467 l 139 467 l 139 125 l 736 125 l 736 0 " }, "Y": { "x_min": 0, "x_max": 820, "ha": 886, "o": "m 820 1013 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1013 l 140 1013 l 411 534 l 679 1012 l 820 1013 " }, "\"": { "x_min": 0, "x_max": 299, "ha": 396, "o": "m 299 606 l 203 606 l 203 988 l 299 988 l 299 606 m 96 606 l 0 606 l 0 988 l 96 988 l 96 606 " }, "‹": { "x_min": 17.984375, "x_max": 773.609375, "ha": 792, "o": "m 773 40 l 18 376 l 17 465 l 773 799 l 773 692 l 159 420 l 773 149 l 773 40 " }, "„": { "x_min": 0, "x_max": 364, "ha": 467, "o": "m 141 -12 q 104 -132 141 -82 q 0 -205 67 -182 l 0 -138 q 56 -82 40 -124 q 69 0 69 -51 l 0 0 l 0 151 l 141 151 l 141 -12 m 364 -12 q 327 -132 364 -82 q 222 -205 290 -182 l 222 -138 q 279 -82 262 -124 q 292 0 292 -51 l 222 0 l 222 151 l 364 151 l 364 -12 " }, "δ": { "x_min": 1, "x_max": 710, "ha": 810, "o": "m 710 360 q 616 87 710 196 q 356 -28 518 -28 q 99 82 197 -28 q 1 356 1 192 q 100 606 1 509 q 355 703 199 703 q 180 829 288 754 q 70 903 124 866 l 70 1012 l 643 1012 l 643 901 l 258 901 q 462 763 422 794 q 636 592 577 677 q 710 360 710 485 m 584 365 q 552 501 584 447 q 451 602 521 555 q 372 611 411 611 q 197 541 258 611 q 136 355 136 472 q 190 171 136 245 q 358 85 252 85 q 528 173 465 85 q 584 365 584 252 " }, "έ": { "x_min": 0, "x_max": 634.71875, "ha": 714, "o": "m 634 234 q 527 38 634 110 q 300 -25 433 -25 q 98 29 183 -25 q 0 204 0 93 q 37 313 0 265 q 128 390 67 352 q 56 459 82 419 q 26 555 26 505 q 114 712 26 654 q 295 763 191 763 q 499 700 416 763 q 589 515 589 631 l 478 515 q 419 618 464 580 q 307 657 374 657 q 207 630 253 657 q 151 547 151 598 q 238 445 151 469 q 389 434 280 434 l 389 331 l 349 331 q 206 315 255 331 q 125 210 125 287 q 183 107 125 145 q 302 76 233 76 q 436 117 379 76 q 509 234 493 159 l 634 234 m 520 1040 l 331 819 l 248 819 l 383 1040 l 520 1040 " }, "ω": { "x_min": 0, "x_max": 922, "ha": 1031, "o": "m 922 339 q 856 97 922 203 q 650 -26 780 -26 q 538 9 587 -26 q 461 103 489 44 q 387 12 436 46 q 277 -22 339 -22 q 69 97 147 -22 q 0 339 0 203 q 45 551 0 444 q 161 738 84 643 l 302 738 q 175 553 219 647 q 124 336 124 446 q 155 179 124 249 q 275 88 197 88 q 375 163 341 88 q 400 294 400 219 l 400 572 l 524 572 l 524 294 q 561 135 524 192 q 643 88 591 88 q 762 182 719 88 q 797 342 797 257 q 745 556 797 450 q 619 738 705 638 l 760 738 q 874 551 835 640 q 922 339 922 444 " }, "´": { "x_min": 0, "x_max": 96, "ha": 251, "o": "m 96 606 l 0 606 l 0 988 l 96 988 l 96 606 " }, "±": { "x_min": 11, "x_max": 781, "ha": 792, "o": "m 781 490 l 446 490 l 446 255 l 349 255 l 349 490 l 11 490 l 11 586 l 349 586 l 349 819 l 446 819 l 446 586 l 781 586 l 781 490 m 781 21 l 11 21 l 11 115 l 781 115 l 781 21 " }, "|": { "x_min": 343, "x_max": 449, "ha": 792, "o": "m 449 462 l 343 462 l 343 986 l 449 986 l 449 462 m 449 -242 l 343 -242 l 343 280 l 449 280 l 449 -242 " }, "ϋ": { "x_min": 0, "x_max": 617, "ha": 725, "o": "m 482 800 l 372 800 l 372 925 l 482 925 l 482 800 m 239 800 l 129 800 l 129 925 l 239 925 l 239 800 m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 " }, "§": { "x_min": 0, "x_max": 593, "ha": 690, "o": "m 593 425 q 554 312 593 369 q 467 233 516 254 q 537 83 537 172 q 459 -74 537 -12 q 288 -133 387 -133 q 115 -69 184 -133 q 47 96 47 -6 l 166 96 q 199 7 166 40 q 288 -26 232 -26 q 371 -5 332 -26 q 420 60 420 21 q 311 201 420 139 q 108 309 210 255 q 0 490 0 383 q 33 602 0 551 q 124 687 66 654 q 75 743 93 712 q 58 812 58 773 q 133 984 58 920 q 300 1043 201 1043 q 458 987 394 1043 q 529 814 529 925 l 411 814 q 370 908 404 877 q 289 939 336 939 q 213 911 246 939 q 180 841 180 883 q 286 720 180 779 q 484 612 480 615 q 593 425 593 534 m 467 409 q 355 544 467 473 q 196 630 228 612 q 146 587 162 609 q 124 525 124 558 q 239 387 124 462 q 398 298 369 315 q 448 345 429 316 q 467 409 467 375 " }, "b": { "x_min": 0, "x_max": 685, "ha": 783, "o": "m 685 372 q 597 99 685 213 q 347 -25 501 -25 q 219 5 277 -25 q 121 93 161 36 l 121 0 l 0 0 l 0 1013 l 121 1013 l 121 634 q 214 723 157 692 q 341 754 272 754 q 591 637 493 754 q 685 372 685 526 m 554 356 q 499 550 554 470 q 328 644 437 644 q 162 556 223 644 q 108 369 108 478 q 160 176 108 256 q 330 83 221 83 q 498 169 435 83 q 554 356 554 245 " }, "q": { "x_min": 0, "x_max": 683, "ha": 876, "o": "m 683 -278 l 564 -278 l 564 97 q 474 8 533 39 q 345 -23 415 -23 q 91 93 188 -23 q 0 364 0 203 q 87 635 0 522 q 337 760 184 760 q 466 727 408 760 q 564 637 523 695 l 564 737 l 683 737 l 683 -278 m 582 375 q 527 564 582 488 q 358 652 466 652 q 190 565 253 652 q 135 377 135 488 q 189 179 135 261 q 361 84 251 84 q 530 179 469 84 q 582 375 582 260 " }, "Ω": { "x_min": -0.171875, "x_max": 969.5625, "ha": 1068, "o": "m 969 0 l 555 0 l 555 123 q 744 308 675 194 q 814 558 814 423 q 726 812 814 709 q 484 922 633 922 q 244 820 334 922 q 154 567 154 719 q 223 316 154 433 q 412 123 292 199 l 412 0 l 0 0 l 0 124 l 217 124 q 68 327 122 210 q 15 572 15 444 q 144 911 15 781 q 484 1041 274 1041 q 822 909 691 1041 q 953 569 953 777 q 899 326 953 443 q 750 124 846 210 l 969 124 l 969 0 " }, "ύ": { "x_min": 0, "x_max": 617, "ha": 725, "o": "m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 m 535 1040 l 346 819 l 262 819 l 397 1040 l 535 1040 " }, "z": { "x_min": -0.015625, "x_max": 613.890625, "ha": 697, "o": "m 613 0 l 0 0 l 0 100 l 433 630 l 20 630 l 20 738 l 594 738 l 593 636 l 163 110 l 613 110 l 613 0 " }, "™": { "x_min": 0, "x_max": 894, "ha": 1000, "o": "m 389 951 l 229 951 l 229 503 l 160 503 l 160 951 l 0 951 l 0 1011 l 389 1011 l 389 951 m 894 503 l 827 503 l 827 939 l 685 503 l 620 503 l 481 937 l 481 503 l 417 503 l 417 1011 l 517 1011 l 653 580 l 796 1010 l 894 1011 l 894 503 " }, "ή": { "x_min": 0.78125, "x_max": 697, "ha": 810, "o": "m 697 -278 l 572 -278 l 572 454 q 540 587 572 536 q 425 650 501 650 q 271 579 337 650 q 206 420 206 509 l 206 0 l 81 0 l 81 489 q 73 588 81 562 q 0 644 56 644 l 0 741 q 68 755 38 755 q 158 721 124 755 q 200 630 193 687 q 297 726 234 692 q 434 761 359 761 q 620 692 544 761 q 697 516 697 624 l 697 -278 m 479 1040 l 290 819 l 207 819 l 341 1040 l 479 1040 " }, "Θ": { "x_min": 0, "x_max": 960, "ha": 1056, "o": "m 960 507 q 833 129 960 280 q 476 -32 698 -32 q 123 129 255 -32 q 0 507 0 280 q 123 883 0 732 q 476 1045 255 1045 q 832 883 696 1045 q 960 507 960 732 m 817 500 q 733 789 817 669 q 476 924 639 924 q 223 792 317 924 q 142 507 142 675 q 222 222 142 339 q 476 89 315 89 q 730 218 636 89 q 817 500 817 334 m 716 449 l 243 449 l 243 571 l 716 571 l 716 449 " }, "®": { "x_min": -3, "x_max": 1008, "ha": 1106, "o": "m 503 532 q 614 562 566 532 q 672 658 672 598 q 614 747 672 716 q 503 772 569 772 l 338 772 l 338 532 l 503 532 m 502 -7 q 123 151 263 -7 q -3 501 -3 294 q 123 851 -3 706 q 502 1011 263 1011 q 881 851 739 1011 q 1008 501 1008 708 q 883 151 1008 292 q 502 -7 744 -7 m 502 60 q 830 197 709 60 q 940 501 940 322 q 831 805 940 681 q 502 944 709 944 q 174 805 296 944 q 65 501 65 680 q 173 197 65 320 q 502 60 294 60 m 788 146 l 678 146 q 653 316 655 183 q 527 449 652 449 l 338 449 l 338 146 l 241 146 l 241 854 l 518 854 q 688 808 621 854 q 766 658 766 755 q 739 563 766 607 q 668 497 713 519 q 751 331 747 472 q 788 164 756 190 l 788 146 " }, "~": { "x_min": 0, "x_max": 833, "ha": 931, "o": "m 833 958 q 778 753 833 831 q 594 665 716 665 q 402 761 502 665 q 240 857 302 857 q 131 795 166 857 q 104 665 104 745 l 0 665 q 54 867 0 789 q 237 958 116 958 q 429 861 331 958 q 594 765 527 765 q 704 827 670 765 q 729 958 729 874 l 833 958 " }, "Ε": { "x_min": 0, "x_max": 736.21875, "ha": 778, "o": "m 736 0 l 0 0 l 0 1013 l 725 1013 l 725 889 l 139 889 l 139 585 l 677 585 l 677 467 l 139 467 l 139 125 l 736 125 l 736 0 " }, "³": { "x_min": 0, "x_max": 450, "ha": 547, "o": "m 450 552 q 379 413 450 464 q 220 366 313 366 q 69 414 130 366 q 0 567 0 470 l 85 567 q 126 470 85 504 q 225 437 168 437 q 320 467 280 437 q 360 552 360 498 q 318 632 360 608 q 213 657 276 657 q 195 657 203 657 q 176 657 181 657 l 176 722 q 279 733 249 722 q 334 815 334 752 q 300 881 334 856 q 220 907 267 907 q 133 875 169 907 q 97 781 97 844 l 15 781 q 78 926 15 875 q 220 972 135 972 q 364 930 303 972 q 426 817 426 888 q 344 697 426 733 q 421 642 392 681 q 450 552 450 603 " }, "[": { "x_min": 0, "x_max": 273.609375, "ha": 371, "o": "m 273 -281 l 0 -281 l 0 1013 l 273 1013 l 273 920 l 124 920 l 124 -187 l 273 -187 l 273 -281 " }, "L": { "x_min": 0, "x_max": 645.828125, "ha": 696, "o": "m 645 0 l 0 0 l 0 1013 l 140 1013 l 140 126 l 645 126 l 645 0 " }, "σ": { "x_min": 0, "x_max": 803.390625, "ha": 894, "o": "m 803 628 l 633 628 q 713 368 713 512 q 618 93 713 204 q 357 -25 518 -25 q 94 91 194 -25 q 0 368 0 201 q 94 644 0 533 q 356 761 194 761 q 481 750 398 761 q 608 739 564 739 l 803 739 l 803 628 m 360 85 q 529 180 467 85 q 584 374 584 262 q 527 566 584 490 q 352 651 463 651 q 187 559 247 651 q 135 368 135 478 q 189 175 135 254 q 360 85 251 85 " }, "ζ": { "x_min": 0, "x_max": 573, "ha": 642, "o": "m 573 -40 q 553 -162 573 -97 q 510 -278 543 -193 l 400 -278 q 441 -187 428 -219 q 462 -90 462 -132 q 378 -14 462 -14 q 108 45 197 -14 q 0 290 0 117 q 108 631 0 462 q 353 901 194 767 l 55 901 l 55 1012 l 561 1012 l 561 924 q 261 669 382 831 q 128 301 128 489 q 243 117 128 149 q 458 98 350 108 q 573 -40 573 80 " }, "θ": { "x_min": 0, "x_max": 674, "ha": 778, "o": "m 674 496 q 601 160 674 304 q 336 -26 508 -26 q 73 153 165 -26 q 0 485 0 296 q 72 840 0 683 q 343 1045 166 1045 q 605 844 516 1045 q 674 496 674 692 m 546 579 q 498 798 546 691 q 336 935 437 935 q 178 798 237 935 q 126 579 137 701 l 546 579 m 546 475 l 126 475 q 170 233 126 348 q 338 80 230 80 q 504 233 447 80 q 546 475 546 346 " }, "Ο": { "x_min": 0, "x_max": 958, "ha": 1054, "o": "m 485 1042 q 834 883 703 1042 q 958 511 958 735 q 834 136 958 287 q 481 -26 701 -26 q 126 130 261 -26 q 0 504 0 279 q 127 880 0 729 q 485 1042 263 1042 m 480 98 q 731 225 638 98 q 815 504 815 340 q 733 783 815 670 q 480 913 640 913 q 226 785 321 913 q 142 504 142 671 q 226 224 142 339 q 480 98 319 98 " }, "Γ": { "x_min": 0, "x_max": 705.28125, "ha": 749, "o": "m 705 886 l 140 886 l 140 0 l 0 0 l 0 1012 l 705 1012 l 705 886 " }, " ": { "x_min": 0, "x_max": 0, "ha": 375 }, "%": { "x_min": -3, "x_max": 1089, "ha": 1186, "o": "m 845 0 q 663 76 731 0 q 602 244 602 145 q 661 412 602 344 q 845 489 728 489 q 1027 412 959 489 q 1089 244 1089 343 q 1029 76 1089 144 q 845 0 962 0 m 844 103 q 945 143 909 103 q 981 243 981 184 q 947 340 981 301 q 844 385 909 385 q 744 342 781 385 q 708 243 708 300 q 741 147 708 186 q 844 103 780 103 m 888 986 l 284 -25 l 199 -25 l 803 986 l 888 986 m 241 468 q 58 545 126 468 q -3 715 -3 615 q 56 881 -3 813 q 238 958 124 958 q 421 881 353 958 q 483 712 483 813 q 423 544 483 612 q 241 468 356 468 m 241 855 q 137 811 175 855 q 100 710 100 768 q 136 612 100 653 q 240 572 172 572 q 344 614 306 572 q 382 713 382 656 q 347 810 382 771 q 241 855 308 855 " }, "P": { "x_min": 0, "x_max": 726, "ha": 806, "o": "m 424 1013 q 640 931 555 1013 q 726 719 726 850 q 637 506 726 587 q 413 426 548 426 l 140 426 l 140 0 l 0 0 l 0 1013 l 424 1013 m 379 889 l 140 889 l 140 548 l 372 548 q 522 589 459 548 q 593 720 593 637 q 528 845 593 801 q 379 889 463 889 " }, "Έ": { "x_min": 0, "x_max": 1078.21875, "ha": 1118, "o": "m 1078 0 l 342 0 l 342 1013 l 1067 1013 l 1067 889 l 481 889 l 481 585 l 1019 585 l 1019 467 l 481 467 l 481 125 l 1078 125 l 1078 0 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 " }, "Ώ": { "x_min": 0.125, "x_max": 1136.546875, "ha": 1235, "o": "m 1136 0 l 722 0 l 722 123 q 911 309 842 194 q 981 558 981 423 q 893 813 981 710 q 651 923 800 923 q 411 821 501 923 q 321 568 321 720 q 390 316 321 433 q 579 123 459 200 l 579 0 l 166 0 l 166 124 l 384 124 q 235 327 289 210 q 182 572 182 444 q 311 912 182 782 q 651 1042 441 1042 q 989 910 858 1042 q 1120 569 1120 778 q 1066 326 1120 443 q 917 124 1013 210 l 1136 124 l 1136 0 m 277 1040 l 83 800 l 0 800 l 140 1041 l 277 1040 " }, "_": { "x_min": 0, "x_max": 705.5625, "ha": 803, "o": "m 705 -334 l 0 -334 l 0 -234 l 705 -234 l 705 -334 " }, "Ϊ": { "x_min": -110, "x_max": 246, "ha": 275, "o": "m 246 1046 l 118 1046 l 118 1189 l 246 1189 l 246 1046 m 18 1046 l -110 1046 l -110 1189 l 18 1189 l 18 1046 m 136 0 l 0 0 l 0 1012 l 136 1012 l 136 0 " }, "+": { "x_min": 23, "x_max": 768, "ha": 792, "o": "m 768 372 l 444 372 l 444 0 l 347 0 l 347 372 l 23 372 l 23 468 l 347 468 l 347 840 l 444 840 l 444 468 l 768 468 l 768 372 " }, "½": { "x_min": 0, "x_max": 1050, "ha": 1149, "o": "m 1050 0 l 625 0 q 712 178 625 108 q 878 277 722 187 q 967 385 967 328 q 932 456 967 429 q 850 484 897 484 q 759 450 798 484 q 721 352 721 416 l 640 352 q 706 502 640 448 q 851 551 766 551 q 987 509 931 551 q 1050 385 1050 462 q 976 251 1050 301 q 829 179 902 215 q 717 68 740 133 l 1050 68 l 1050 0 m 834 985 l 215 -28 l 130 -28 l 750 984 l 834 985 m 224 422 l 142 422 l 142 811 l 0 811 l 0 867 q 104 889 62 867 q 164 973 157 916 l 224 973 l 224 422 " }, "Ρ": { "x_min": 0, "x_max": 720, "ha": 783, "o": "m 424 1013 q 637 933 554 1013 q 720 723 720 853 q 633 508 720 591 q 413 426 546 426 l 140 426 l 140 0 l 0 0 l 0 1013 l 424 1013 m 378 889 l 140 889 l 140 548 l 371 548 q 521 589 458 548 q 592 720 592 637 q 527 845 592 801 q 378 889 463 889 " }, "'": { "x_min": 0, "x_max": 139, "ha": 236, "o": "m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 " }, "ª": { "x_min": 0, "x_max": 350, "ha": 397, "o": "m 350 625 q 307 616 328 616 q 266 631 281 616 q 247 673 251 645 q 190 628 225 644 q 116 613 156 613 q 32 641 64 613 q 0 722 0 669 q 72 826 0 800 q 247 866 159 846 l 247 887 q 220 934 247 916 q 162 953 194 953 q 104 934 129 953 q 76 882 80 915 l 16 882 q 60 976 16 941 q 166 1011 104 1011 q 266 979 224 1011 q 308 891 308 948 l 308 706 q 311 679 308 688 q 331 670 315 670 l 350 672 l 350 625 m 247 757 l 247 811 q 136 790 175 798 q 64 726 64 773 q 83 682 64 697 q 132 667 103 667 q 207 690 174 667 q 247 757 247 718 " }, "΅": { "x_min": 0, "x_max": 450, "ha": 553, "o": "m 450 800 l 340 800 l 340 925 l 450 925 l 450 800 m 406 1040 l 212 800 l 129 800 l 269 1040 l 406 1040 m 110 800 l 0 800 l 0 925 l 110 925 l 110 800 " }, "T": { "x_min": 0, "x_max": 777, "ha": 835, "o": "m 777 894 l 458 894 l 458 0 l 319 0 l 319 894 l 0 894 l 0 1013 l 777 1013 l 777 894 " }, "Φ": { "x_min": 0, "x_max": 915, "ha": 997, "o": "m 527 0 l 389 0 l 389 122 q 110 231 220 122 q 0 509 0 340 q 110 785 0 677 q 389 893 220 893 l 389 1013 l 527 1013 l 527 893 q 804 786 693 893 q 915 509 915 679 q 805 231 915 341 q 527 122 696 122 l 527 0 m 527 226 q 712 310 641 226 q 779 507 779 389 q 712 705 779 627 q 527 787 641 787 l 527 226 m 389 226 l 389 787 q 205 698 275 775 q 136 505 136 620 q 206 308 136 391 q 389 226 276 226 " }, "⁋": { "x_min": 0, "x_max": 0, "ha": 694 }, "j": { "x_min": -77.78125, "x_max": 167, "ha": 349, "o": "m 167 871 l 42 871 l 42 1013 l 167 1013 l 167 871 m 167 -80 q 121 -231 167 -184 q -26 -278 76 -278 l -77 -278 l -77 -164 l -41 -164 q 26 -143 11 -164 q 42 -65 42 -122 l 42 737 l 167 737 l 167 -80 " }, "Σ": { "x_min": 0, "x_max": 756.953125, "ha": 819, "o": "m 756 0 l 0 0 l 0 107 l 395 523 l 22 904 l 22 1013 l 745 1013 l 745 889 l 209 889 l 566 523 l 187 125 l 756 125 l 756 0 " }, "1": { "x_min": 215.671875, "x_max": 574, "ha": 792, "o": "m 574 0 l 442 0 l 442 697 l 215 697 l 215 796 q 386 833 330 796 q 475 986 447 875 l 574 986 l 574 0 " }, "›": { "x_min": 18.0625, "x_max": 774, "ha": 792, "o": "m 774 376 l 18 40 l 18 149 l 631 421 l 18 692 l 18 799 l 774 465 l 774 376 " }, "<": { "x_min": 17.984375, "x_max": 773.609375, "ha": 792, "o": "m 773 40 l 18 376 l 17 465 l 773 799 l 773 692 l 159 420 l 773 149 l 773 40 " }, "£": { "x_min": 0, "x_max": 704.484375, "ha": 801, "o": "m 704 41 q 623 -10 664 5 q 543 -26 583 -26 q 359 15 501 -26 q 243 36 288 36 q 158 23 197 36 q 73 -21 119 10 l 6 76 q 125 195 90 150 q 175 331 175 262 q 147 443 175 383 l 0 443 l 0 512 l 108 512 q 43 734 43 623 q 120 929 43 854 q 358 1010 204 1010 q 579 936 487 1010 q 678 729 678 857 l 678 684 l 552 684 q 504 838 552 780 q 362 896 457 896 q 216 852 263 896 q 176 747 176 815 q 199 627 176 697 q 248 512 217 574 l 468 512 l 468 443 l 279 443 q 297 356 297 398 q 230 194 297 279 q 153 107 211 170 q 227 133 190 125 q 293 142 264 142 q 410 119 339 142 q 516 96 482 96 q 579 105 550 96 q 648 142 608 115 l 704 41 " }, "t": { "x_min": 0, "x_max": 367, "ha": 458, "o": "m 367 0 q 312 -5 339 -2 q 262 -8 284 -8 q 145 28 183 -8 q 108 143 108 64 l 108 638 l 0 638 l 0 738 l 108 738 l 108 944 l 232 944 l 232 738 l 367 738 l 367 638 l 232 638 l 232 185 q 248 121 232 140 q 307 102 264 102 q 345 104 330 102 q 367 107 360 107 l 367 0 " }, "¬": { "x_min": 0, "x_max": 706, "ha": 803, "o": "m 706 411 l 706 158 l 630 158 l 630 335 l 0 335 l 0 411 l 706 411 " }, "λ": { "x_min": 0, "x_max": 750, "ha": 803, "o": "m 750 -7 q 679 -15 716 -15 q 538 59 591 -15 q 466 214 512 97 l 336 551 l 126 0 l 0 0 l 270 705 q 223 837 247 770 q 116 899 190 899 q 90 898 100 899 l 90 1004 q 152 1011 125 1011 q 298 938 244 1011 q 373 783 326 901 l 605 192 q 649 115 629 136 q 716 95 669 95 l 736 95 q 750 97 745 97 l 750 -7 " }, "W": { "x_min": 0, "x_max": 1263.890625, "ha": 1351, "o": "m 1263 1013 l 995 0 l 859 0 l 627 837 l 405 0 l 265 0 l 0 1013 l 136 1013 l 342 202 l 556 1013 l 701 1013 l 921 207 l 1133 1012 l 1263 1013 " }, ">": { "x_min": 18.0625, "x_max": 774, "ha": 792, "o": "m 774 376 l 18 40 l 18 149 l 631 421 l 18 692 l 18 799 l 774 465 l 774 376 " }, "v": { "x_min": 0, "x_max": 675.15625, "ha": 761, "o": "m 675 738 l 404 0 l 272 0 l 0 738 l 133 737 l 340 147 l 541 737 l 675 738 " }, "τ": { "x_min": 0.28125, "x_max": 644.5, "ha": 703, "o": "m 644 628 l 382 628 l 382 179 q 388 120 382 137 q 436 91 401 91 q 474 94 447 91 q 504 97 501 97 l 504 0 q 454 -9 482 -5 q 401 -14 426 -14 q 278 67 308 -14 q 260 233 260 118 l 260 628 l 0 628 l 0 739 l 644 739 l 644 628 " }, "ξ": { "x_min": 0, "x_max": 624.9375, "ha": 699, "o": "m 624 -37 q 608 -153 624 -96 q 563 -278 593 -211 l 454 -278 q 491 -183 486 -200 q 511 -83 511 -126 q 484 -23 511 -44 q 370 1 452 1 q 323 0 354 1 q 283 -1 293 -1 q 84 76 169 -1 q 0 266 0 154 q 56 431 0 358 q 197 538 108 498 q 94 613 134 562 q 54 730 54 665 q 77 823 54 780 q 143 901 101 867 l 27 901 l 27 1012 l 576 1012 l 576 901 l 380 901 q 244 863 303 901 q 178 745 178 820 q 312 600 178 636 q 532 582 380 582 l 532 479 q 276 455 361 479 q 118 281 118 410 q 165 173 118 217 q 274 120 208 133 q 494 101 384 110 q 624 -37 624 76 " }, "&": { "x_min": -3, "x_max": 894.25, "ha": 992, "o": "m 894 0 l 725 0 l 624 123 q 471 0 553 40 q 306 -41 390 -41 q 168 -7 231 -41 q 62 92 105 26 q 14 187 31 139 q -3 276 -3 235 q 55 433 -3 358 q 248 581 114 508 q 170 689 196 640 q 137 817 137 751 q 214 985 137 922 q 384 1041 284 1041 q 548 988 483 1041 q 622 824 622 928 q 563 666 622 739 q 431 556 516 608 l 621 326 q 649 407 639 361 q 663 493 653 426 l 781 493 q 703 229 781 352 l 894 0 m 504 818 q 468 908 504 877 q 384 940 433 940 q 293 907 331 940 q 255 818 255 875 q 289 714 255 767 q 363 628 313 678 q 477 729 446 682 q 504 818 504 771 m 556 209 l 314 499 q 179 395 223 449 q 135 283 135 341 q 146 222 135 253 q 183 158 158 192 q 333 80 241 80 q 556 209 448 80 " }, "Λ": { "x_min": 0, "x_max": 862.5, "ha": 942, "o": "m 862 0 l 719 0 l 426 847 l 143 0 l 0 0 l 356 1013 l 501 1013 l 862 0 " }, "I": { "x_min": 41, "x_max": 180, "ha": 293, "o": "m 180 0 l 41 0 l 41 1013 l 180 1013 l 180 0 " }, "G": { "x_min": 0, "x_max": 921, "ha": 1011, "o": "m 921 0 l 832 0 l 801 136 q 655 15 741 58 q 470 -28 568 -28 q 126 133 259 -28 q 0 499 0 284 q 125 881 0 731 q 486 1043 259 1043 q 763 957 647 1043 q 905 709 890 864 l 772 709 q 668 866 747 807 q 486 926 589 926 q 228 795 322 926 q 142 507 142 677 q 228 224 142 342 q 483 94 323 94 q 712 195 625 94 q 796 435 796 291 l 477 435 l 477 549 l 921 549 l 921 0 " }, "ΰ": { "x_min": 0, "x_max": 617, "ha": 725, "o": "m 524 800 l 414 800 l 414 925 l 524 925 l 524 800 m 183 800 l 73 800 l 73 925 l 183 925 l 183 800 m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 m 489 1040 l 300 819 l 216 819 l 351 1040 l 489 1040 " }, "`": { "x_min": 0, "x_max": 138.890625, "ha": 236, "o": "m 138 699 l 0 699 l 0 861 q 36 974 0 929 q 138 1041 72 1020 l 138 977 q 82 931 95 969 q 69 839 69 893 l 138 839 l 138 699 " }, "·": { "x_min": 0, "x_max": 142, "ha": 239, "o": "m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 " }, "Υ": { "x_min": 0.328125, "x_max": 819.515625, "ha": 889, "o": "m 819 1013 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1013 l 140 1013 l 411 533 l 679 1013 l 819 1013 " }, "r": { "x_min": 0, "x_max": 355.5625, "ha": 432, "o": "m 355 621 l 343 621 q 179 569 236 621 q 122 411 122 518 l 122 0 l 0 0 l 0 737 l 117 737 l 117 604 q 204 719 146 686 q 355 753 262 753 l 355 621 " }, "x": { "x_min": 0, "x_max": 675, "ha": 764, "o": "m 675 0 l 525 0 l 331 286 l 144 0 l 0 0 l 256 379 l 12 738 l 157 737 l 336 473 l 516 738 l 661 738 l 412 380 l 675 0 " }, "μ": { "x_min": 0, "x_max": 696.609375, "ha": 747, "o": "m 696 -4 q 628 -14 657 -14 q 498 97 513 -14 q 422 8 470 41 q 313 -24 374 -24 q 207 3 258 -24 q 120 80 157 31 l 120 -278 l 0 -278 l 0 738 l 124 738 l 124 343 q 165 172 124 246 q 308 82 216 82 q 451 177 402 82 q 492 358 492 254 l 492 738 l 616 738 l 616 214 q 623 136 616 160 q 673 92 636 92 q 696 95 684 92 l 696 -4 " }, "h": { "x_min": 0, "x_max": 615, "ha": 724, "o": "m 615 472 l 615 0 l 490 0 l 490 454 q 456 590 490 535 q 338 654 416 654 q 186 588 251 654 q 122 436 122 522 l 122 0 l 0 0 l 0 1013 l 122 1013 l 122 633 q 218 727 149 694 q 362 760 287 760 q 552 676 484 760 q 615 472 615 600 " }, ".": { "x_min": 0, "x_max": 142, "ha": 239, "o": "m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 " }, "φ": { "x_min": -2, "x_max": 878, "ha": 974, "o": "m 496 -279 l 378 -279 l 378 -17 q 101 88 204 -17 q -2 367 -2 194 q 68 626 -2 510 q 283 758 151 758 l 283 646 q 167 537 209 626 q 133 373 133 462 q 192 177 133 254 q 378 93 259 93 l 378 758 q 445 764 426 763 q 476 765 464 765 q 765 659 653 765 q 878 377 878 553 q 771 96 878 209 q 496 -17 665 -17 l 496 -279 m 496 93 l 514 93 q 687 183 623 93 q 746 380 746 265 q 691 569 746 491 q 522 658 629 658 l 496 656 l 496 93 " }, ";": { "x_min": 0, "x_max": 142, "ha": 239, "o": "m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 m 142 -12 q 105 -132 142 -82 q 0 -206 68 -182 l 0 -138 q 58 -82 43 -123 q 68 0 68 -56 l 0 0 l 0 151 l 142 151 l 142 -12 " }, "f": { "x_min": 0, "x_max": 378, "ha": 472, "o": "m 378 638 l 246 638 l 246 0 l 121 0 l 121 638 l 0 638 l 0 738 l 121 738 q 137 935 121 887 q 290 1028 171 1028 q 320 1027 305 1028 q 378 1021 334 1026 l 378 908 q 323 918 346 918 q 257 870 273 918 q 246 780 246 840 l 246 738 l 378 738 l 378 638 " }, "“": { "x_min": 1, "x_max": 348.21875, "ha": 454, "o": "m 140 670 l 1 670 l 1 830 q 37 943 1 897 q 140 1011 74 990 l 140 947 q 82 900 97 940 q 68 810 68 861 l 140 810 l 140 670 m 348 670 l 209 670 l 209 830 q 245 943 209 897 q 348 1011 282 990 l 348 947 q 290 900 305 940 q 276 810 276 861 l 348 810 l 348 670 " }, "A": { "x_min": 0.03125, "x_max": 906.953125, "ha": 1008, "o": "m 906 0 l 756 0 l 648 303 l 251 303 l 142 0 l 0 0 l 376 1013 l 529 1013 l 906 0 m 610 421 l 452 867 l 293 421 l 610 421 " }, "6": { "x_min": 53, "x_max": 739, "ha": 792, "o": "m 739 312 q 633 62 739 162 q 400 -31 534 -31 q 162 78 257 -31 q 53 439 53 206 q 178 859 53 712 q 441 986 284 986 q 643 912 559 986 q 732 713 732 833 l 601 713 q 544 830 594 786 q 426 875 494 875 q 268 793 331 875 q 193 517 193 697 q 301 597 240 570 q 427 624 362 624 q 643 540 552 624 q 739 312 739 451 m 603 298 q 540 461 603 400 q 404 516 484 516 q 268 461 323 516 q 207 300 207 401 q 269 137 207 198 q 405 83 325 83 q 541 137 486 83 q 603 298 603 197 " }, "‘": { "x_min": 1, "x_max": 139.890625, "ha": 236, "o": "m 139 670 l 1 670 l 1 830 q 37 943 1 897 q 139 1011 74 990 l 139 947 q 82 900 97 940 q 68 810 68 861 l 139 810 l 139 670 " }, "ϊ": { "x_min": -70, "x_max": 283, "ha": 361, "o": "m 283 800 l 173 800 l 173 925 l 283 925 l 283 800 m 40 800 l -70 800 l -70 925 l 40 925 l 40 800 m 283 3 q 232 -10 257 -5 q 181 -15 206 -15 q 84 26 118 -15 q 41 200 41 79 l 41 737 l 166 737 l 167 215 q 171 141 167 157 q 225 101 182 101 q 247 103 238 101 q 283 112 256 104 l 283 3 " }, "π": { "x_min": -0.21875, "x_max": 773.21875, "ha": 857, "o": "m 773 -7 l 707 -11 q 575 40 607 -11 q 552 174 552 77 l 552 226 l 552 626 l 222 626 l 222 0 l 97 0 l 97 626 l 0 626 l 0 737 l 773 737 l 773 626 l 676 626 l 676 171 q 695 103 676 117 q 773 90 714 90 l 773 -7 " }, "ά": { "x_min": 0, "x_max": 765.5625, "ha": 809, "o": "m 765 -4 q 698 -14 726 -14 q 564 97 586 -14 q 466 7 525 40 q 337 -26 407 -26 q 88 98 186 -26 q 0 369 0 212 q 88 637 0 525 q 337 760 184 760 q 465 727 407 760 q 563 637 524 695 l 563 738 l 685 738 l 685 222 q 693 141 685 168 q 748 94 708 94 q 765 95 760 94 l 765 -4 m 584 371 q 531 562 584 485 q 360 653 470 653 q 192 566 254 653 q 135 379 135 489 q 186 181 135 261 q 358 84 247 84 q 528 176 465 84 q 584 371 584 260 m 604 1040 l 415 819 l 332 819 l 466 1040 l 604 1040 " }, "O": { "x_min": 0, "x_max": 958, "ha": 1057, "o": "m 485 1041 q 834 882 702 1041 q 958 512 958 734 q 834 136 958 287 q 481 -26 702 -26 q 126 130 261 -26 q 0 504 0 279 q 127 880 0 728 q 485 1041 263 1041 m 480 98 q 731 225 638 98 q 815 504 815 340 q 733 783 815 669 q 480 912 640 912 q 226 784 321 912 q 142 504 142 670 q 226 224 142 339 q 480 98 319 98 " }, "n": { "x_min": 0, "x_max": 615, "ha": 724, "o": "m 615 463 l 615 0 l 490 0 l 490 454 q 453 592 490 537 q 331 656 410 656 q 178 585 240 656 q 117 421 117 514 l 117 0 l 0 0 l 0 738 l 117 738 l 117 630 q 218 728 150 693 q 359 764 286 764 q 552 675 484 764 q 615 463 615 593 " }, "3": { "x_min": 54, "x_max": 737, "ha": 792, "o": "m 737 284 q 635 55 737 141 q 399 -25 541 -25 q 156 52 248 -25 q 54 308 54 140 l 185 308 q 245 147 185 202 q 395 96 302 96 q 539 140 484 96 q 602 280 602 190 q 510 429 602 390 q 324 454 451 454 l 324 565 q 487 584 441 565 q 565 719 565 617 q 515 835 565 791 q 395 879 466 879 q 255 824 307 879 q 203 661 203 769 l 78 661 q 166 909 78 822 q 387 992 250 992 q 603 921 513 992 q 701 723 701 844 q 669 607 701 656 q 578 524 637 558 q 696 434 655 499 q 737 284 737 369 " }, "9": { "x_min": 53, "x_max": 739, "ha": 792, "o": "m 739 524 q 619 94 739 241 q 362 -32 516 -32 q 150 47 242 -32 q 59 244 59 126 l 191 244 q 246 129 191 176 q 373 82 301 82 q 526 161 466 82 q 597 440 597 255 q 363 334 501 334 q 130 432 216 334 q 53 650 53 521 q 134 880 53 786 q 383 986 226 986 q 659 841 566 986 q 739 524 739 719 m 388 449 q 535 514 480 449 q 585 658 585 573 q 535 805 585 744 q 388 873 480 873 q 242 809 294 873 q 191 658 191 745 q 239 514 191 572 q 388 449 292 449 " }, "l": { "x_min": 41, "x_max": 166, "ha": 279, "o": "m 166 0 l 41 0 l 41 1013 l 166 1013 l 166 0 " }, "¤": { "x_min": 40.09375, "x_max": 728.796875, "ha": 825, "o": "m 728 304 l 649 224 l 512 363 q 383 331 458 331 q 256 363 310 331 l 119 224 l 40 304 l 177 441 q 150 553 150 493 q 184 673 150 621 l 40 818 l 119 898 l 267 749 q 321 766 291 759 q 384 773 351 773 q 447 766 417 773 q 501 749 477 759 l 649 898 l 728 818 l 585 675 q 612 618 604 648 q 621 553 621 587 q 591 441 621 491 l 728 304 m 384 682 q 280 643 318 682 q 243 551 243 604 q 279 461 243 499 q 383 423 316 423 q 487 461 449 423 q 525 553 525 500 q 490 641 525 605 q 384 682 451 682 " }, "κ": { "x_min": 0, "x_max": 632.328125, "ha": 679, "o": "m 632 0 l 482 0 l 225 384 l 124 288 l 124 0 l 0 0 l 0 738 l 124 738 l 124 446 l 433 738 l 596 738 l 312 466 l 632 0 " }, "4": { "x_min": 48, "x_max": 742.453125, "ha": 792, "o": "m 742 243 l 602 243 l 602 0 l 476 0 l 476 243 l 48 243 l 48 368 l 476 958 l 602 958 l 602 354 l 742 354 l 742 243 m 476 354 l 476 792 l 162 354 l 476 354 " }, "p": { "x_min": 0, "x_max": 685, "ha": 786, "o": "m 685 364 q 598 96 685 205 q 350 -23 504 -23 q 121 89 205 -23 l 121 -278 l 0 -278 l 0 738 l 121 738 l 121 633 q 220 726 159 691 q 351 761 280 761 q 598 636 504 761 q 685 364 685 522 m 557 371 q 501 560 557 481 q 330 651 437 651 q 162 559 223 651 q 108 366 108 479 q 162 177 108 254 q 333 87 224 87 q 502 178 441 87 q 557 371 557 258 " }, "‡": { "x_min": 0, "x_max": 777, "ha": 835, "o": "m 458 238 l 458 0 l 319 0 l 319 238 l 0 238 l 0 360 l 319 360 l 319 681 l 0 683 l 0 804 l 319 804 l 319 1015 l 458 1013 l 458 804 l 777 804 l 777 683 l 458 683 l 458 360 l 777 360 l 777 238 l 458 238 " }, "ψ": { "x_min": 0, "x_max": 808, "ha": 907, "o": "m 465 -278 l 341 -278 l 341 -15 q 87 102 180 -15 q 0 378 0 210 l 0 739 l 133 739 l 133 379 q 182 195 133 275 q 341 98 242 98 l 341 922 l 465 922 l 465 98 q 623 195 563 98 q 675 382 675 278 l 675 742 l 808 742 l 808 381 q 720 104 808 213 q 466 -13 627 -13 l 465 -278 " }, "η": { "x_min": 0.78125, "x_max": 697, "ha": 810, "o": "m 697 -278 l 572 -278 l 572 454 q 540 587 572 536 q 425 650 501 650 q 271 579 337 650 q 206 420 206 509 l 206 0 l 81 0 l 81 489 q 73 588 81 562 q 0 644 56 644 l 0 741 q 68 755 38 755 q 158 720 124 755 q 200 630 193 686 q 297 726 234 692 q 434 761 359 761 q 620 692 544 761 q 697 516 697 624 l 697 -278 " } }, "cssFontWeight": "normal", "ascender": 1189, "underlinePosition": -100, "cssFontStyle": "normal", "boundingBox": { "yMin": -334, "xMin": -111, "yMax": 1189, "xMax": 1672 }, "resolution": 1000, "original_font_information": { "postscript_name": "Helvetiker-Regular", "version_string": "Version 1.00 2004 initial release", "vendor_url": "http://www.magenta.gr/", "full_font_name": "Helvetiker", "font_family_name": "Helvetiker", "copyright": "Copyright (c) Μagenta ltd, 2004", "description": "", "trademark": "", "designer": "", "designer_url": "", "unique_font_identifier": "Μagenta ltd:Helvetiker:22-10-104", "license_url": "http://www.ellak.gr/fonts/MgOpen/license.html", "license_description": "Copyright (c) 2004 by MAGENTA Ltd. All Rights Reserved.\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of the fonts accompanying this license (\"Fonts\") and associated documentation files (the \"Font Software\"), to reproduce and distribute the Font Software, including without limitation the rights to use, copy, merge, publish, distribute, and/or sell copies of the Font Software, and to permit persons to whom the Font Software is furnished to do so, subject to the following conditions: \r\n\r\nThe above copyright and this permission notice shall be included in all copies of one or more of the Font Software typefaces.\r\n\r\nThe Font Software may be modified, altered, or added to, and in particular the designs of glyphs or characters in the Fonts may be modified and additional glyphs or characters may be added to the Fonts, only if the fonts are renamed to names not containing the word \"MgOpen\", or if the modifications are accepted for inclusion in the Font Software itself by the each appointed Administrator.\r\n\r\nThis License becomes null and void to the extent applicable to Fonts or Font Software that has been modified and is distributed under the \"MgOpen\" name.\r\n\r\nThe Font Software may be sold as part of a larger software package but no copy of one or more of the Font Software typefaces may be sold by itself. \r\n\r\nTHE FONT SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL MAGENTA OR PERSONS OR BODIES IN CHARGE OF ADMINISTRATION AND MAINTENANCE OF THE FONT SOFTWARE BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.", "manufacturer_name": "Μagenta ltd", "font_sub_family_name": "Regular" }, "descender": -334, "familyName": "Helvetiker", "lineHeight": 1522, "underlineThickness": 50 });
'use strict';

var scene, camera, renderer, $viewport, height, width, SEGMENTS, tetrahedron;
var cameraMoveY = 0;
var currentIndex = 0;
var previousIndex = 0;
var orbsTimesRun = 0;
var orbsTimesRunTwo = 0;
var soundsTimesRun = 0;
var orbImages = [];
var orbImagesTwo = [];
var transitionSounds = [];
var orbPreImages = new Object();
var orbPreImagesTwo = new Object();
var orbsUnloaded = ['bluGrn1-64.png', 'bluGrn2-64.png', 'bluGrn3-64.png', 'bluGrn4-64.png', 'bluGrn5-64.png', 'prpl1-64.png', 'prpl2-64.png', 'prpl3-64.png'];
var orbsUnloadedTwo = ['a1-64.png', 'a2-64.png', 'a3-64.png', 'a5-64.png', 'a6-64.png', 'a7-64.png', 'a8-64.png', 'a9-64.png', 'a10-64.png', 'a11-64.png'];
var unloadedImageCollections = [orbsUnloaded, orbsUnloadedTwo];
var loadedImageCollections = [orbImages, orbImagesTwo];
var imageHashCollections = [orbPreImages, orbPreImagesTwo];
var counters = [orbsTimesRun, orbsTimesRunTwo];
var transitionPreSounds = new Object();
var mouse = new THREE.Vector2(),
    INTERSECTED;
var raycaster = new THREE.Raycaster();
var currentSegThree = 0;
var numEdgyOrbs = 0;

SEGMENTS = [[0, 0, 40], [0, 50, 100], [0, 0, 180], [0, -100, 200], ['link']];

function makeNav() {
  var container = document.getElementsByClassName('nav-container')[0];
  for (var i = 0; i < SEGMENTS.length; i++) {
    var div = document.createElement('div');
    if (i === SEGMENTS.length - 1) {
      div.className = 'circle-nav';
    } else {
      div.className = 'triangle-nav';
    }
    container.appendChild(div);
  }
  $($('.triangle-nav')[currentIndex]).addClass('active');
}

window.request;

setViewport($(document.body));

function setViewport($el) {
  $viewport = $el;

  width = $viewport.width();
  height = $viewport.height();

  function checkCount(orbs, sum, orbsTwo, sumTwo) {
    if (orbs.length === sum && orbsTwo.length === sumTwo) {
      $('.help-icon').click(function () {
        $('.help-container').toggleClass('is-active');
        $('.help-inner').toggleClass('is-active');
      });
      $('.help-container').click(function (event) {
        $('.help-container').toggleClass('is-active');
        $('.help-inner').toggleClass('is-active');
      });

      $('.load').html('');

      init();
      makeNav();
      animate();
    }
  }
  loadImages(unloadedImageCollections, loadedImageCollections, imageHashCollections, counters);

  loadAudio('./sounds/rumb.mp3', transitionSounds);
  loadAudio('./sounds/rumb1.mp3', transitionSounds);

  function loadImages(unloadedCols, loadedCols, hashCols, counters) {
    for (var i = 0; i < unloadedCols.length; i++) {
      var collection = unloadedCols[i];
      for (var j = 0; j < collection.length; j++) {
        var file = collection[j];
        loadImage('./images/' + file, loadedCols[i], hashCols[i], counters[i]);
      }
    }
  }

  function loadAudio(url, transitionSounds) {
    soundsTimesRun++;
    var fileName = url.match(/(\w+.mp3)/g)[0];
    transitionPreSounds[fileName] = new Audio(url);
    transitionSounds.push(transitionPreSounds[fileName]);
  }

  function loadImage(url, curCollection, orbObject, counter) {
    counter++;
    orbObject['img' + counter] = document.createElement('img');
    orbObject['img' + counter].src = url;
    orbObject['img' + counter].addEventListener('load', function (event) {
      curCollection.push(THREE.ImageUtils.loadTexture(url));
      curCollection[curCollection.length - 1].image = orbObject['img' + counter];
      checkCount(orbImages, orbsUnloaded.length, orbImagesTwo, orbsUnloadedTwo.length);
    });
  }
}

function init() {
  scene = new THREE.Scene();

  // renderer

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  $viewport.append(renderer.domElement);

  // camera

  camera = new THREE.PerspectiveCamera(50, width / height, 1, 90);
  camera.position.set(0, 0, 40);
  scene.add(camera);

  renderer.setClearColor(263172, 1);

  // light

  // var light = new THREE.AmbientLight ( 0x404040 );
  // scene.add(light);

  jQuery(window).on('resize', resize);
  $viewport.on('mousemove', mouseMove);
  $viewport.on('DOMMouseScroll mousewheel', scroll);
  jQuery(document).on('keydown', keyDown);

  $('.nav-container').click(function (e) {
    var navItems = $('.nav-container').children();
    for (var i = 0; i < navItems.length; i++) {
      if (currentIndex !== i) {
        if (i === navItems.length - 1 && e.target === navItems[i]) {
          transitionPreSounds['rumb.mp3'].play();
          animateCamera(i - 1);
          currentIndex += 1;
          $('#contact-div').css('top', '95vh');
          switchNavActive(i);
        } else if (navItems[i] === e.target) {
          if (currentIndex === navItems.length - 1) {
            $('#contact-div').css('top', '100vh');
          }
          transitionPreSounds['rumb.mp3'].play();
          animateCamera(i);
          switchNavActive(i);
        }
      }
    }
  });

  function mouseMove(event) {
    mouse.x = event.clientX / window.innerWidth * 2 - 1;
    mouse.y = event.clientY / window.innerHeight * 2 + 1;
  }

  function scroll(event) {
    if (!isScrolling()) {
      event.originalEvent.wheelDelta >= 0 ? prev() : next();
    }
  }

  function isScrolling() {
    if (currentIndex === SEGMENTS.length - 1) {
      return false;
    }
    var coords = SEGMENTS[currentIndex];
    var cameraPositions = [camera.position.x, camera.position.y, camera.position.z];
    for (var i = 0; i < coords.length; i++) {
      var desired = coords[i];
      var real = cameraPositions[i];
      if (!(desired - 5 < real && real < desired + 5)) {
        return true;
      }
    }
    return false;
  }

  function prev() {
    if (currentIndex === 0) {
      return;
    } else if (currentIndex === SEGMENTS.length - 1) {
      $('#contact-div').css('top', '100vh');
      currentIndex = currentIndex - 1;
    } else {
      transitionPreSounds['rumb1.mp3'].play();
      animateCamera(currentIndex - 1);
    }
    switchNavActive(-1);
  }

  function next() {
    if (currentIndex === SEGMENTS.length - 2) {
      currentIndex = currentIndex + 1;
      $('#contact-div').css('top', '95vh');
      // $(function(){
      // $viewport.append("<div id='contact-div' style='top: 101vh;'></div>")
      // $('#contact-div').load("contact.html");
      // });
    } else if (currentIndex === SEGMENTS.length - 1) {
      return;
    } else {
      transitionPreSounds['rumb.mp3'].play();
      animateCamera(currentIndex + 1);
    }
    switchNavActive(1);
  }

  function switchNavActive(num) {
    var navs = $('.nav-container').children();
    for (var i = 0; i < navs.length; i++) {
      if ($(navs[i]).hasClass('active')) {
        $(navs[i]).removeClass('active');
        $(navs[currentIndex]).addClass('active');
        return;
      }
    }
  }

  function animateCamera(index) {
    TweenMax.to(camera.position, 2, {
      x: SEGMENTS[index][0],
      y: SEGMENTS[index][1],
      z: SEGMENTS[index][2]
    });
    currentIndex = index;
    var coords = SEGMENTS[currentIndex];
    var vector = new THREE.Vector3(coords[0], coords[1], coords[2]);
    camera.lookAt(vector);
  }

  function resize() {
    width = $viewport.width();
    height = $viewport.height();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  function keyDown(event) {
    if (!isScrolling()) {
      var keyCode = event.keyCode;

      if (keyCode === 40) {
        next();
      } else if (keyCode === 38) {
        prev();
      }
    }
  }

  function addSegmentOneSprites(numberOfSprites, collection) {

    go(numberOfSprites, collection, 'close');
    go(numberOfSprites, collection, 'far');
    go(numberOfSprites / 4, collection, 'above');

    function go(numberOfSprites, collection, distance) {
      for (var i = 0, j = 0; i < numberOfSprites; i++, j += 3) {
        if (distance === 'close') {
          var matTexture = THREE.bubblesProperties.close.texture[i];
        } else {
          var matTexture = THREE.bubblesProperties.far.texture[i];
        };
        var rotation = Math.random() * 6.283;
        matTexture === 1 || matTexture === 7 ? rotation = 0 : rotation = Math.random() * 6.283;
        var mat = new THREE.SpriteMaterial({
          map: collection[matTexture],
          color: 16777215,
          fog: true,
          rotation: rotation
        });
        var bubble = new THREE.Sprite(mat);
        if (distance === 'close') {
          // these values were assigned randomly at one point. I refreshed the page many times and saved the values when I liked the scene the best.
          // var x = (Math.random() * 15) - 7.5;
          // var y = (Math.random() * 15) + 17.5;
          // var z = (Math.random() * 15) + 42.5;
          var x = THREE.bubblesProperties.close.xyz[j];
          var y = THREE.bubblesProperties.close.xyz[j + 1];
          var z = THREE.bubblesProperties.close.xyz[j + 2];
          var width = mat.map.image.width;
          // var newSize = (Math.random() * ((width * .01) * Math.random()));
          var newSize = THREE.bubblesProperties.close.size[i];
          // bubble.smallSize = newSize;
        } else if (distance === 'far') {
          // var x = (Math.random() * 30) - 15;
          // var y = (Math.random() * 30) + 10;
          // var z = (Math.random() * 80) + 10;
          var x = THREE.bubblesProperties.far.xyz[j];
          var y = THREE.bubblesProperties.far.xyz[j + 1];
          var z = THREE.bubblesProperties.far.xyz[j + 2];
          var width = mat.map.image.width;
          // var newSize = (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5)) * (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5));
          var newSize = THREE.bubblesProperties.far.size[i];
          bubble.newSize = newSize;
        } else if (distance === 'above') {
          var x = Math.random() * 12 - 6;
          var y = Math.random() * 12 + 26;
          var z = Math.random() * 15 + 42.5;
          var width = mat.map.image.width;
          var newSize = Math.random() * (width * 0.01 * Math.random());
        }
        bubble.matTexture = matTexture;
        bubble.position.set(x, y, z);
        bubble.scale.set(newSize, newSize, 1);
        scene.add(bubble);
        THREE.bubbles.push(bubble);
      }
    }
  }

  function addSegmentOneParticles(numberOfParticles) {

    var geometry = new THREE.Geometry();
    for (var i = 0; i < numberOfParticles; i++) {
      var vertex = new THREE.Vector3();
      vertex.x = Math.random() * 12 - 6;
      vertex.y = Math.random() * 12 + 26;
      vertex.z = Math.random() * 15 + 42.5;
      geometry.vertices.push(vertex);
    }

    var size = Math.random();
    var mat = new THREE.PointCloudMaterial({ size: size });

    var particle = new THREE.PointCloud(geometry, mat);
    scene.add(particle);
  }

  function addSegmentOneSpheres() {
    var geometry = new THREE.SphereGeometry(3, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 8947848 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(0, 25, 50);
    THREE.bigSphereSegmentOne = mesh;

    var geometry = new THREE.SphereGeometry(1, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 8947848 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(-8, 27, 65);
  }

  // segment 0
  addSegmentZero();

  function addSegmentZero() {
    THREE.lightZero = new THREE.PointLight(16777215, 4, 40);
    THREE.lightZero.position.set(0, 0, 0);
    scene.add(THREE.lightZero);

    var trianglesCount = 40;
    THREE.triangles = [];
    for (var i = 0; i < trianglesCount; i++) {
      var radius = (Math.random() + 0.5) * (Math.random() + 0.5) * (Math.random() + 0.5) * (Math.random() + 0.5);
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var color = Math.random() * 0.99 * 16777215;
      var material = new THREE.MeshLambertMaterial({
        color: 16777215,
        shading: THREE.FlatShading
      });
      var pyramid = new THREE.Mesh(geometry, material);
      pyramid.radius = radius;
      scene.add(pyramid);
      var x = Math.random() * 40 - 20;
      var y = Math.random() * 40 - 20;
      var z = Math.random() * 80 - 70;
      pyramid.position.set(x, y, z);
      pyramid.rotX = Math.random() > 0.5 ? 0.05 - pyramid.radius * 0.02 : -(0.05 - pyramid.radius * 0.02);
      pyramid.rotY = Math.random() > 0.5 ? 0.05 - pyramid.radius * 0.02 : -(0.05 - pyramid.radius * 0.02);
      pyramid.timing = Math.floor(Math.random() * 10);
      THREE.triangles.push(pyramid);
    }

    addSegmentZeroText();

    function addSegmentZeroText() {
      var text = 'w e l c o m e';
      var text3d = new THREE.TextGeometry(text, {
        size: 4,
        height: 1,
        curveSegments: 2,
        font: 'helvetiker'
      });
      text3d.computeBoundingBox();
      var centerOffset = -0.5 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x);
      var textMaterial = new THREE.MeshLambertMaterial({
        color: 3355443,
        overdraw: 0.5
      });
      text = new THREE.Mesh(text3d, textMaterial);
      text.position.x = centerOffset;
      text.position.y = 0;
      text.position.z = -20;
      scene.add(text);
    }
    // scene.fog = THREE.Fog( 0x888888, 0.01 );
    // fog.position.set(0, 0, 0);
  }

  // segment 1
  addSegmentOne(orbImages);

  function addSegmentOne(orbImages) {
    THREE.lightOne = new THREE.PointLight(16777215, 1, 30);
    THREE.lightOne.position.set(0, 40, 50);
    scene.add(THREE.lightOne);

    THREE.lightTwo = new THREE.PointLight(16777215, 2, 10);
    THREE.lightTwo.position.set(-8, 32, 62);
    scene.add(THREE.lightTwo);

    addSegmentOneSpheres();
    addSegmentOneSprites(150, orbImages);
    // addSegmentOneParticles(10);

    THREE.spotlight = new THREE.SpotLight(16777215);
    THREE.spotlight.castShadow = true; // only necessary if you want to cast shadows
    THREE.spotlight.target = THREE.bigSphereSegmentOne; // keep the THREE.spotlight on target
    THREE.spotlight.exponent = 90; // useful for narrowing the beam
    THREE.spotlight.shadowCameraNear = 1;
    THREE.spotlight.shadowCameraFar = 60;
    THREE.spotlight.shadowCameraFov = 30;
    //THREE.spotlight.shadowCameraVisible = true;    // show me the camera
    THREE.spotlight.shadowDarkness = 0.9;
    THREE.spotlight.position.set(0, 50, 50);
  }

  // segment 2
  addSegmentTwo();

  function addSegmentTwo() {
    THREE.lightThree = new THREE.PointLight(16711680, 1, 75);
    scene.add(THREE.lightThree);
    THREE.lightFour = new THREE.PointLight(255, 1, 75);
    scene.add(THREE.lightFour);
    THREE.lightFive = new THREE.PointLight(16777215, 1, 75);
    scene.add(THREE.lightFive);

    THREE.edgyOrbs = [];
    numEdgyOrbs = 256;
    for (var i = 0; i < numEdgyOrbs; i++) {

      var radius = 0.5;
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var color = 16777215;
      var material = new THREE.MeshLambertMaterial({
        color: color,
        shading: THREE.FlatShading
      });
      var edgyOrb = new THREE.Mesh(geometry, material);
      scene.add(edgyOrb);
      var x = Math.random() * 50 - 25;
      var y = Math.random() * 50 - 25;
      var z = Math.random() * 100 + 80;
      edgyOrb.position.set(x, y, z);
      THREE.edgyOrbPositions.push(x, y, z);
      THREE.edgyOrbs.push(edgyOrb);
    }

    transition();

    // Cube

    // var amount = 8;
    // var separation = 3;
    // var offset = ( ( amount - 1 ) * separation ) / 2;
    //
    // for ( var i = 0; i < numEdgyOrbs; i ++ ) {
    //
    //   var x = ( i % amount ) * separation;
    //   var y = Math.floor( ( i / amount ) % amount ) * separation;
    //   var z = Math.floor( i / ( amount * amount ) ) * separation;
    //
    //   THREE.edgyOrbPositions.push( x - offset, y - offset, z - offset + 160);
    //
    // }

    // Sphere

    var radius = 15;

    for (var i = 0; i < numEdgyOrbs; i++) {

      var phi = Math.acos(-1 + 2 * i / numEdgyOrbs);
      var theta = Math.sqrt(numEdgyOrbs * Math.PI) * phi;

      THREE.edgyOrbPositions.push(radius * Math.cos(theta) * Math.sin(phi), radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(phi) + 130);
    }
  }

  addSegmentThreeSprites(256, orbImagesTwo);
  addSegmentThreeText();

  function addSegmentThreeSprites(numberOfSprites, collection) {

    go(numberOfSprites, collection);

    function go(numberOfSprites, collection) {
      for (var i = 0; i < numberOfSprites; i++) {
        var matTexture = Math.floor(Math.random() * collection.length);
        var rotation = Math.random() * 6.283;
        var mat = new THREE.SpriteMaterial({
          map: collection[matTexture],
          color: 16777215,
          fog: true,
          rotation: rotation
        });
        var bubble = new THREE.Sprite(mat);
        var x = Math.random() * 40 - 20;
        var y = Math.random() * 40 - 95;
        var z = Math.random() * 50 + 125;
        var width = mat.map.image.width;
        var newSize = Math.random() * (width * 0.016 * (Math.random() * 4) - 1.5) * (Math.random() * (width * 0.016 * (Math.random() * 4) - 1.5));
        bubble.matTexture = matTexture;
        bubble.position.set(x, y, z);
        bubble.scale.set(newSize, newSize, 1);
        scene.add(bubble);
        THREE.bubblesTwo.push(bubble);
      }
    }

    THREE.lightSix = new THREE.PointLight(16711680, 1, 75);
    scene.add(THREE.lightSix);
    THREE.lightSeven = new THREE.PointLight(16711680, 1, 75);
    scene.add(THREE.lightSeven);
    THREE.lightEight = new THREE.PointLight(16777215, 1, 75);
    scene.add(THREE.lightEight);
  }

  function addSegmentThreeText() {
    addText(1);
    addText(2);

    function addText(distance) {
      if (distance === 1) {
        var text = 't h a n k  y o u';
        var size = 3;
        var y = -77;
        var z = 150;
      } else if (distance === 2) {
        var text = 'c o m e  a g a i n';
        var y = -73;
        var z = 135;
        var size = 1;
      }
      var text3d = new THREE.TextGeometry(text, {
        size: size,
        height: 1,
        curveSegments: 2,
        font: 'helvetiker'
      });
      text3d.computeBoundingBox();
      var centerOffset = -0.5 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x);
      var textMaterial = new THREE.MeshLambertMaterial({
        color: 3355443,
        overdraw: 0.5
      });
      text = new THREE.Mesh(text3d, textMaterial);
      text.position.x = centerOffset;
      text.position.y = y;
      text.position.z = z;
      scene.add(text);
    }
  }

  postProcessing();

  function postProcessing() {
    renderer.autoClear = false;

    var renderTargetParameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
      stencilBuffer: false
    };

    var width = $viewport.width();
    var height = $viewport.height();

    var renderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);

    var effectSave = new THREE.SavePass(new THREE.WebGLRenderTarget(width, height, renderTargetParameters));

    var effectBlend = new THREE.ShaderPass(THREE.BlendShader, 'tDiffuse1');

    var effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    var effectVignette = new THREE.ShaderPass(THREE.VignetteShader);
    var effectBleach = new THREE.ShaderPass(THREE.BleachBypassShader);
    var effectBloom = new THREE.BloomPass(0.75);

    effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);

    var renderModel = new THREE.RenderPass(scene, camera);

    effectVignette.renderToScreen = true;

    THREE.composer = new THREE.EffectComposer(renderer, renderTarget);

    THREE.composer.addPass(renderModel);

    THREE.composer.addPass(effectFXAA);

    THREE.composer.addPass(effectBlend);
    THREE.composer.addPass(effectSave);

    THREE.composer.addPass(effectBloom);
    THREE.composer.addPass(effectBleach);

    THREE.composer.addPass(effectVignette);
  }

  function transition() {
    var offset = currentSegThree * numEdgyOrbs * 3;
    var duration = 3000;
    if (currentSegThree === 0) {
      duration = 25000;
    }

    for (var i = 0, j = offset; i < numEdgyOrbs; i++, j += 3) {

      var object = THREE.edgyOrbs[i];

      new TWEEN.Tween(object.position).to({
        x: THREE.edgyOrbPositions[j],
        y: THREE.edgyOrbPositions[j + 1],
        z: THREE.edgyOrbPositions[j + 2]
      }, duration).easing(TWEEN.Easing.Exponential.InOut).start();
    }

    new TWEEN.Tween(this).to({}, duration).onComplete(transition).start();

    currentSegThree = (currentSegThree + 1) % 2;
  }

  // controls

  THREE.controls = new THREE.OrbitControls(camera, renderer.domElement);
  THREE.controls.center.set(0, 0, 0);
  THREE.controls.userRotate = false;
  THREE.controls.userZoom = false;
}

function animate() {
  debugger;
  requestAnimationFrame(animate);
  // mouseOverInteract();

  // segment 0 spin tetrahedrons, -glitch-out-

  for (var i = 0; i < THREE.triangles.length; i++) {
    // if (Math.round(new Date().getTime() * .001) % THREE.triangles[i].timing == 0) {
    //   var rotX = Math.random() > .5 ? .05 - (THREE.triangles[i].radius * .02) : -(.05 - THREE.triangles[i].radius * .02);
    //   var rotY = Math.random() > .5 ? .05 - (THREE.triangles[i].radius * .02) : -(.05 - THREE.triangles[i].radius * .02);
    //
    //   THREE.triangles[i].rotation.x += rotX;
    //   THREE.triangles[i].rotation.y -= rotY;
    // } else {
    THREE.triangles[i].rotation.x += THREE.triangles[i].rotX / 2;
    THREE.triangles[i].rotation.y -= THREE.triangles[i].rotY / 2;
    THREE.triangles[i].position.x += Math.cos(cameraMoveY) * 0.01 * Math.random();

    // }
  }

  // segment 0 COS move lightZero

  var oscillate = (Math.cos(cameraMoveY) - 1) * 10;

  THREE.lightZero.position.set(oscillate + 10, 0, oscillate + 10);

  // segment 1 orbs grow, shrink, move left, right

  for (var i = 0, l = THREE.bubbles.length; i < l; i++) {

    var object = THREE.bubbles[i];
    if (object.newSize !== undefined) {
      var scale = Math.cos(cameraMoveY) / 5 + object.newSize;
      object.scale.set(scale, scale, scale);
    }
    if (i % 2 === 0) {
      object.position.x += Math.cos(cameraMoveY) * 0.005 * ((i % 10 + 1) * 0.05);
    } else {
      object.position.x -= Math.cos(cameraMoveY) * 0.005 * ((i % 10 + 1) * 0.05);
    }
  }

  // help scroll brightness

  if ($('.help-inner').css('display') === 'block') {
    $('.down.arrow').css('-webkit-filter', 'invert(' + (Math.cos(cameraMoveY) + 1) + ')');
  }
  $('.attention').css('-webkit-filter', 'opacity(' + (Math.cos(cameraMoveY) + 1) + ')');

  // segment 1 orb lighting animation

  THREE.lightOne.intensity += Math.cos(cameraMoveY) / 50;

  // segment 1 orb movement

  // segment 2 light movement

  var time = Date.now() * 0.0005;

  THREE.lightThree.position.x = Math.sin(time * 0.7) * 30;
  THREE.lightThree.position.y = Math.cos(time * 0.5) * 40;
  THREE.lightThree.position.z = Math.cos(time * 0.3) * 30 + 170;

  THREE.lightFour.position.x = Math.cos(time * 0.3) * 30;
  THREE.lightFour.position.y = Math.sin(time * 0.5) * 40;
  THREE.lightFour.position.z = Math.sin(time * 0.7) * 30 + 170;

  THREE.lightFive.position.x = Math.sin(time * 0.7) * 30;
  THREE.lightFive.position.y = Math.cos(time * 0.3) * 40;
  THREE.lightFive.position.z = Math.sin(time * 0.5) * 30 + 170;

  // segment 3 light movement

  THREE.lightSix.position.x = Math.sin(time * 0.7) * 30;
  THREE.lightSix.position.y = Math.cos(time * 0.5) * 40 - 100;
  THREE.lightSix.position.z = Math.cos(time * 0.3) * 30 + 190;

  THREE.lightSeven.position.x = Math.cos(time * 0.3) * 30;
  THREE.lightSeven.position.y = Math.sin(time * 0.5) * 40 - 100;
  THREE.lightSeven.position.z = Math.sin(time * 0.7) * 30 + 190;

  THREE.lightEight.position.x = Math.sin(time * 0.7) * 30;
  THREE.lightEight.position.y = Math.cos(time * 0.3) * 40 - 100;
  THREE.lightEight.position.z = Math.sin(time * 0.5) * 30 + 190;

  // segment 2 tweens

  TWEEN.update();

  // segment 2 tetrahedron spin

  for (var i = 0; i < THREE.edgyOrbs.length; i++) {
    tetrahedron = THREE.edgyOrbs[i];
    tetrahedron.rotation.x += 0.025;
    tetrahedron.rotation.y += 0.025;
  }

  function mouseOverInteract() {
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {

      if (INTERSECTED != intersects[0].object) {

        if (INTERSECTED) {
          INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
        }
        INTERSECTED = intersects[0].object;
        INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
        INTERSECTED.material.emissive.setHex(16711680);
      }
    } else {

      if (INTERSECTED) {}
      INTERSECTED = null;
    }
  }

  camera.position.y += Math.cos(cameraMoveY) / 50;
  cameraMoveY += 0.02;
  THREE.controls.update();

  camera.position.x += (mouse.x * 5 - camera.position.x) * 0.03;
  // renderer.render(scene, camera);
  if (currentIndex === 0) {
    renderer.autoClear = false;
    renderer.shadowMapEnabled = true;

    renderer.setRenderTarget(null);

    renderer.clear();
    THREE.composer.render(0.1);

    renderer.shadowMapEnabled = false;
  } else {
    renderer.render(scene, camera);
  }
}

// INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
"use strict";

THREE.edgyOrbPositions = [];
THREE.bubbles = [];
THREE.bubblesTwo = [];
THREE.bubblesProperties = new Object();
THREE.bubblesProperties.close = new Object();
THREE.bubblesProperties.far = new Object();
THREE.bubblesProperties.close.xyz = [-6.790378958685324, 30.925708770519122, 49.8540941614192, 5.462210507830605, 23.06210733251646, 54.96265436639078, -4.480070751160383, 19.00079507031478, 57.36183116794564, -1.540309558622539, 26.816859550308436, 53.07096208911389, 6.400404201122001, 21.330485629150644, 47.309797967318445, 5.596375926397741, 26.720977056538686, 55.05731791490689, -2.7455401746556163, 28.280367116676643, 43.23859581723809, -6.6419328830670565, 20.456058647250757, 44.57685462664813, -2.3632345267105848, 21.591022833017632, 46.12828302080743, 5.607007591752335, 29.018772308481857, 53.39806363219395, 3.559699187753722, 26.65091189322993, 47.58794604218565, 4.490987547906116, 20.61078831087798, 47.31563912355341, 0.19993171328678727, 23.409376164199784, 43.778902910416946, -6.136426110751927, 18.43602883629501, 57.11316870059818, -7.4871426180470735, 23.72352763544768, 52.67725335783325, -3.0048050545156, 21.17375505156815, 52.90575385210104, -4.329398449044675, 18.807640094310045, 54.435233268886805, 0.6818419613409787, 27.32899463735521, 49.32536053471267, -2.541277235141024, 21.76160039496608, 49.6270257292781, -1.1549081071279943, 29.812091727508232, 44.816762479022145, 4.895295195747167, 19.97796688694507, 51.99207458877936, -3.8762207818217576, 27.466920013539493, 46.49514176417142, 1.4134418161120266, 18.73837078921497, 50.61313188285567, -0.2220338664483279, 30.96499642706476, 56.4602177310735, 1.736049740575254, 26.53800621512346, 52.603704148205, -5.759988947538659, 28.07761320960708, 46.11805629567243, -0.4668756143655628, 32.088097111554816, 56.303639316465706, 1.2519355409312993, 28.530919263139367, 43.99121536524035, -2.463923441246152, 22.068235848564655, 55.3525723121129, -4.524608789943159, 22.469177306629717, 54.83310610870831, -3.622699943371117, 28.263059586752206, 44.36494967201725, -5.732231667498127, 29.968041436513886, 48.86710090562701, 5.8849592541810125, 27.07080702413805, 45.794751978246495, 1.1656059231609106, 19.316083263838664, 56.43538155476563, 1.6124972118996084, 21.55976672307588, 55.98551225266419, -1.9345114252064377, 25.778232573065907, 49.9454536056146, -5.6004067696630955, 22.996504257898778, 52.54509731894359, -2.6210956019349396, 25.469834747491404, 51.91175577696413, 1.5930340241175145, 32.31401155120693, 49.96224140166305, 5.066126170568168, 25.48296137014404, 53.37738186935894, 5.827252030139789, 21.71405014814809, 48.56746903154999, -0.86614805390127, 30.867909314110875, 46.5454983280506, -2.9949765431229025, 30.705878970911726, 49.22841049381532, 2.1202151372563094, 26.21912467526272, 49.161368214990944, 1.218832932645455, 18.428788719465956, 47.08103256998584, -4.67853159760125, 24.625941903796047, 46.05724230525084, 0.8330186549574137, 21.99557799496688, 53.083066667895764, 5.6692720600403845, 25.943379210075364, 57.416550386697054, -1.6161430743522942, 19.78891195030883, 46.513752749888226, -7.156872582854703, 24.337458659429103, 50.683622574433684, -6.654150442918763, 28.358443727483973, 54.381293333135545, -4.5821293839253485, 20.44162587961182, 55.158902729162946, -0.20435328246094286, 24.60060981567949, 43.346702188719064, -3.6226404667831957, 24.984713587909937, 52.07517487579025, -6.6411657992284745, 22.261014707619324, 53.04472993477248, -3.9029671100433916, 24.860313198296353, 57.05175654264167, 6.720258925342932, 28.127148451749235, 55.92715326929465, -3.907930883578956, 26.415161712793633, 54.991829689824954, 1.9862482964526862, 27.936553549952805, 52.050916984444484, -1.5114368288777769, 21.532930956454948, 52.2976470598951, 3.4472560754511505, 25.604380732402205, 50.10403463151306, -3.306541421916336, 27.54067944479175, 55.46209249761887, -7.02823368483223, 19.559904008638114, 54.15862490423024, -6.123810228891671, 18.016603434225544, 56.92969426047057, 4.395941854454577, 19.59090582909994, 48.538162698969245, 4.971001606900245, 17.84125677892007, 44.772802788065746, -0.5787748214788735, 23.042036694241688, 50.14783386839554, -7.46368779335171, 24.913440347881988, 53.47560292459093, 3.4082858415786177, 30.2273602259811, 46.97773820022121, -0.0777724280487746, 27.948452545097098, 56.07353544794023, -3.9238168741576374, 26.021531275473535, 56.122152924072, 4.02162418467924, 18.296389780007303, 47.596528810681775, -5.260801145341247, 27.483905629487708, 51.493220697157085, 2.3929776856675744, 25.51594006596133, 46.892633070237935, -1.7165699461475015, 27.473250770708546, 53.511484084883705, -7.166886372724548, 24.21714480384253, 55.01592225511558, -0.08856409694999456, 28.518908544210717, 54.032023035688326, -2.0601994008757174, 27.215479986043647, 56.70819298713468, -1.207077669678256, 20.920051120920107, 55.97306416952051, -5.587656456045806, 28.46972630592063, 50.2702740940731, 1.037910918239504, 27.075993242906407, 49.376099166693166, -6.318670517066494, 31.074459203518927, 47.36447872710414, 3.2373862888198346, 23.44713773811236, 50.526635989081115, 6.078072449890897, 29.114847970195115, 46.758293957682326, -7.424157347995788, 19.137932100566104, 53.468708453001454, 5.173440476646647, 26.06166468351148, 45.80457749310881, 6.768439264269546, 27.216548636788502, 49.77088648476638, 1.8498405301943421, 27.654420899925753, 52.87035043234937, -0.11587011977098882, 26.05089013813995, 45.39248080109246, -6.824803752824664, 23.498347394634038, 57.1478173090145, -0.6102100177668035, 25.07088230107911, 44.55801889766008, -4.38025766517967, 30.482411303091794, 56.1494208057411, -5.784666950348765, 29.802261721342802, 46.093306886032224, 3.0534850247204304, 22.199328478891402, 51.49224309134297, -1.6965789604000747, 26.469003080856055, 54.510695019271225, -5.4737507295794785, 25.357302594929934, 49.89785954589024, -2.1435662009753287, 22.165629061637446, 43.431737549835816, -2.720006990712136, 26.062644622288644, 45.13984453282319, 0.0063258083537220955, 27.663749032653868, 56.55936570605263, -1.0918477736413479, 26.79945934098214, 54.562115103472024, -6.890463241143152, 27.893045336240903, 45.52829707041383, 4.699618387967348, 30.03047986072488, 53.33696401095949, -0.8123881509527564, 26.15175474085845, 50.09305860614404, 1.254894743906334, 23.758630567463115, 56.473667081445456, -4.086746794637293, 26.906226406572387, 45.92553738737479, 6.567839866038412, 25.713962863665074, 47.67071599839255, -3.60510264756158, 28.58753068954684, 46.086544890422374, -0.3987211093772203, 28.69424977223389, 50.029142620041966, 3.35734338266775, 25.30241681728512, 51.90986501867883, -1.3777492835652083, 32.01218511676416, 50.9756925678812, 5.169394392287359, 25.75510445749387, 55.09915472473949, 1.2087574729230255, 19.59337829845026, 48.05551977478899, -4.238431697012857, 27.45701303007081, 44.819150200346485, 2.4894688662607223, 21.99917464167811, 44.566728009376675, 5.579529065871611, 25.528692855732515, 49.73994013504125, -3.5646091878879815, 20.728584089083597, 51.243349318392575, 6.583905948791653, 28.368148120353, 51.34649343905039, -3.347021732479334, 30.46904396614991, 52.956187546951696, -2.4861990264616907, 25.90812836540863, 49.65488845715299, -5.268648981582373, 18.30633828882128, 57.490517975529656, -4.510584297822788, 21.116294297389686, 51.67977090459317, -4.155805211048573, 30.115056001814082, 47.794349077157676, 5.87003423483111, 28.388180407928303, 54.30310395429842, 4.776526096975431, 22.17145251110196, 43.504041543928906, 3.7966686801519245, 24.976808440405875, 44.68037587008439, -6.0761160019319504, 25.517125357873738, 50.19616708275862, -1.6188209771644324, 19.40651583718136, 50.731501042610034, -2.693741738330573, 30.801202272996306, 56.03472865768708, -0.013423757627606392, 30.971843792358413, 45.31992006581277, 0.36111369263380766, 30.57600669679232, 46.16367111215368, -5.614271698286757, 24.592287029372528, 54.16886270046234, 3.595277345739305, 26.936613323632628, 56.89543473650701, 3.3360646152868867, 31.914853412890807, 53.40817551827058, -4.772447972791269, 24.708364182151854, 46.657574124401435, -4.388109741266817, 26.589034490752965, 56.18179106619209, -6.054058674490079, 18.837206803727895, 46.31005955277942, -1.3843188271857798, 17.68215107731521, 54.94044484104961, 3.853206572821364, 25.271787460660562, 54.06313795247115, -2.198842540383339, 18.45601977664046, 57.22279189620167, 1.6797063080593944, 29.904247553786263, 54.54601868521422, -0.5294606031384319, 23.362095922930166, 44.343177448026836, 3.874724751804024, 20.51143836346455, 56.14091903436929, -4.4636694132350385, 26.864093072945252, 51.5017825178802, -6.938410510774702, 18.19322833325714, 43.42181819607504, 0.13900518883019686, 20.351134395459667, 57.268995478516445, -3.9684863586444408, 29.158149329014122, 43.94797677989118, -0.780919510871172, 22.971197116421536, 49.92958895396441, -3.766559043433517, 24.02757093659602, 44.0108839829918, 0.37455812213011086, 22.03800235176459, 51.40379974269308, 3.5155117500107735, 28.0506154242903, 56.71464052866213];
THREE.bubblesProperties.far.xyz = [-5.529444927815348, 29.886213215067983, 63.97364707663655, 6.565616140142083, 33.775165143888444, 81.65868889540434, 2.769792212639004, 28.899522975552827, 58.06129923090339, -12.211304556112736, 33.93096805084497, 31.037189550697803, 5.146743468940258, 16.22258663410321, 76.88763491809368, -14.144062993582338, 22.51427760347724, 78.24329074472189, 0.6961349956691265, 20.61532011255622, 74.64792234823108, -9.221917565446347, 25.83115345798433, 41.07682975009084, -7.19724707538262, 20.88623494375497, 58.34913616999984, 14.802812787238508, 29.14576843380928, 67.88075501099229, 0.4063054290600121, 18.469425020739436, 14.943133667111397, 1.4721149881370366, 26.01741050835699, 46.69821359217167, -10.528058360796422, 33.824480581097305, 46.12029092386365, 6.220544131938368, 20.261722109280527, 47.53839325159788, 4.598914298694581, 37.741006910800934, 48.594327196478844, -11.949020298197865, 24.069372622761875, 67.37749954685569, -14.45111438864842, 38.53070156183094, 80.62177695333958, 8.340295446105301, 20.15513411257416, 40.93174535781145, 10.401633130386472, 16.512242171447724, 12.615387886762619, -2.39600537577644, 10.542218443006277, 78.23226932436228, -4.850091675762087, 38.032851605676115, 61.57220892608166, 5.022675090003759, 29.58272034302354, 39.56503281369805, -5.097777578048408, 12.59052038192749, 87.76564663276076, -5.901203071698546, 19.11747011123225, 55.45195238664746, 4.057456513401121, 23.704245793633163, 35.71664338931441, -6.068928006570786, 25.55328235263005, 43.75855350866914, -1.9692335044965148, 30.739037161692977, 29.870262574404478, -13.593105990439653, 26.220998778007925, 69.7743776999414, 10.597317097708583, 39.20250246766955, 66.60789743065834, 3.0143140233121812, 25.89055861113593, 31.26016229391098, -8.802548269741237, 29.698566438164562, 77.76976607739925, 14.79013360105455, 37.14788648998365, 12.048008497804403, -13.36293380241841, 10.12412968557328, 55.715482253581285, 1.247517317533493, 37.48051146278158, 82.85720454528928, -12.933375723659992, 13.385782118421048, 72.13203806430101, 0.6045685638673604, 20.819732672534883, 72.72768734022975, -3.3034263784065843, 30.761713779065758, 67.34602091833949, 5.0509674358181655, 34.113177529070526, 25.40393091738224, -4.990827329456806, 22.531961938366294, 63.32002080976963, 0.991603487636894, 39.69272449379787, 31.49694049730897, -10.633516972884536, 16.69325814349577, 50.84808707237244, 14.215555430855602, 27.93928096536547, 50.99436741322279, 12.97173926839605, 15.307662158738822, 86.08397075906396, -9.596118754707277, 31.466415338218212, 37.01541190966964, -14.871693304739892, 15.243599258828908, 24.357208032160997, 1.1414836789481342, 10.104313190095127, 57.949109990149736, -10.716867225710303, 15.490393075160682, 50.40575144812465, -11.419886557850987, 27.215392307844013, 35.51957190036774, 13.855821832548827, 17.4623463046737, 84.39986346289515, -0.15288415364921093, 17.78601695317775, 34.68238601461053, -3.7442898144945502, 32.71287233103067, 52.57134551182389, 14.383701256010681, 22.80026165768504, 14.97033528983593, 1.2358642718754709, 30.377097090240568, 62.88241997361183, -9.212624731007963, 16.020427143666893, 18.252669516950846, -8.806414066348225, 21.286308204289526, 13.276485241949558, 3.6499664769507945, 29.097217698581517, 46.71392686665058, -12.331301879603416, 34.61205260595307, 60.75436543673277, -14.866750105284154, 16.17968057980761, 73.33346592262387, -12.010377016849816, 32.87931422702968, 35.87445721030235, -12.48602637089789, 34.257303655613214, 43.449957855045795, -0.9459276054985821, 25.159134336281568, 57.52974562346935, 2.342067863792181, 28.775064188521355, 71.22359534725547, 11.442477218806744, 36.343700708821416, 59.29163884371519, -4.190434443298727, 21.429553295020014, 25.56748917326331, 3.281447282060981, 16.291861436329782, 38.92013784497976, 4.678859619889408, 12.860215897671878, 18.402804136276245, 1.8378120032139122, 24.77384503465146, 87.76066072285175, -8.267297570127994, 20.669997774530202, 47.175665982067585, -12.308750983793288, 24.761666178237647, 65.14108067378402, 0.18147381953895092, 15.625494392588735, 13.147457912564278, 4.172681900672615, 33.885733392089605, 46.14829974249005, 7.228954480960965, 26.536170567851514, 27.43313703685999, 3.083981384988874, 29.64974262053147, 51.49729583412409, -10.323415340390056, 34.52945510391146, 20.556953605264425, -2.18240087851882, 20.41650558123365, 40.50944611430168, -6.535790835041553, 13.03085807710886, 59.6353736333549, -1.6417251387611032, 22.457558640744537, 78.26491683721542, 11.295616028364748, 31.051238893996924, 89.92907905951142, -1.0830921912565827, 35.739642784465104, 59.86483907327056, -4.123995895497501, 17.288083736784756, 27.683631163090467, -8.75984595157206, 16.553044395986944, 37.38374510779977, -7.009718308690935, 19.730120017193258, 63.051946721971035, 14.16760384105146, 27.645856442395598, 23.01207872107625, -9.530998652335256, 38.46835495438427, 50.97001064568758, 1.1965813441202044, 12.876586962956935, 88.18175895139575, -11.575555459130555, 11.242111437022686, 43.6816549487412, -6.150478622876108, 33.63428354030475, 13.472016379237175, -0.42889857664704323, 20.69928598124534, 21.520786434412003, 7.2359519731253386, 37.74322289042175, 58.56670442968607, 0.12345344061031938, 13.751244593877345, 45.11450884863734, 1.7384381219744682, 29.972739301156253, 69.06005101278424, 2.1686400985345244, 20.82174616632983, 81.91183391958475, -9.996332440059632, 17.73104301886633, 26.34709933772683, -3.6253065685741603, 13.733341582119465, 64.00168782100081, -4.318033643066883, 37.507823118939996, 17.32086017727852, -5.365575437899679, 17.003802536055446, 39.0122895129025, 0.42238203808665276, 32.81533074565232, 83.69684360921383, 4.896731853950769, 13.691503920126706, 67.41074511781335, 7.476465424988419, 19.515472322236747, 71.32919132709503, -8.593140242155641, 17.990061247255653, 84.62666567414999, -10.175973346922547, 21.862170747481287, 19.94328822940588, 3.794095222838223, 15.929066508542746, 47.948372438549995, 2.921838469337672, 37.889407821930945, 58.36934208869934, -11.196266238112003, 13.03331883624196, 86.26252140849829, -2.273736165370792, 18.88323533348739, 69.36373580247164, -8.187506783287972, 21.523137697950006, 32.52691583707929, 6.853698932100087, 14.652603866998106, 26.319491639733315, 0.7025635940954089, 12.91417473461479, 52.57971839979291, 10.545481166336685, 33.08428347110748, 72.57830109447241, -4.9992237612605095, 29.320602011866868, 60.89697077870369, 6.957633839920163, 29.312639692798257, 15.511346962302923, -14.702120984438807, 36.04003868997097, 87.95938042923808, -0.46469017630442977, 27.12250056443736, 55.672902911901474, 8.568839316722006, 31.470010776538402, 44.40752634778619, 6.103678916115314, 16.68183321831748, 72.89505375549197, -3.0652144784107804, 29.466861123219132, 65.28322199359536, -14.87668810877949, 13.663153522647917, 48.32835836336017, -2.4300700868479908, 24.149010614492, 41.96603609248996, -4.158643162809312, 33.64125022897497, 47.08163121715188, 12.29596848366782, 30.50518771400675, 73.59471092000604, 4.891701000742614, 12.347291472833604, 66.1589827761054, 4.706860526930541, 34.126232294365764, 81.41000296920538, -4.60186182288453, 21.528699153568596, 59.26910933107138, -12.200786385219544, 19.271041189786047, 63.938850946724415, 10.546534792520106, 25.24505326524377, 43.7060334905982, -5.32619064906612, 37.942462265491486, 45.39508393034339, 11.638443467672914, 30.208763538394123, 51.100284568965435, 3.2140379352495074, 34.77701314724982, 17.507342845201492, 6.451961821876466, 28.070412871893495, 41.9606102630496, -10.338693873491138, 20.668472750112414, 59.628045335412025, -11.631481549702585, 19.589407288003713, 22.8133362904191, 2.2876521991565824, 38.45158676151186, 45.296991281211376, 12.316700401715934, 21.80816897423938, 79.35014767572284, -6.832276345230639, 29.204742861911654, 11.204496566206217, -9.61288353195414, 34.34668651083484, 39.376760087907314, -7.363165430724621, 30.070053574163467, 88.34846790879965, -10.07883190177381, 27.733643068931997, 71.00524250417948, -7.56388345034793, 14.697132322471589, 12.651045937091112, 11.271142554469407, 13.843944636173546, 41.17568986490369, 14.76726908935234, 16.09290794003755, 15.320508256554604, -8.993387427181005, 34.50531724141911, 55.040831454098225, 6.892433697357774, 17.332303123548627, 68.65665892139077, 11.672250470146537, 39.03401280986145, 47.98266213387251, 13.909029769711196, 16.619053489994258, 23.350821267813444, 7.3513735248707235, 18.666390301659703, 66.0374421812594, -4.338359101675451, 30.58919142698869, 89.08884976059198, -0.6142546911723912, 37.35794359119609, 23.004987463355064, 8.153922480996698, 21.83979427209124, 74.93561306968331, -0.2477280842140317, 14.809621737804264, 50.29123080894351, 11.065523063298315, 24.341624702792615, 37.7729157358408];
THREE.bubblesProperties.close.size = [0.039212358967942826, 0.22737679594517113, 0.14079809517396186, 0.0006323315798305737, 0.06245270431729527, 0.3000413067290312, 0.039655870797262745, 0.06320273704938285, 0.33759017609580594, 0.2515128475362596, 0.0780486208835687, 0.07846404303879415, 0.034641489936255154, 0.031985117617882516, 0.1346388294769466, 0.41412008159706987, 0.03782455975461048, 0.2610145571884048, 0.537674936416262, 0.03883750481623785, 0.009877084354168016, 0.20132599711423246, 0.02753838186816273, 0.11529407123119448, 0.12322076962187054, 0.052915919056124104, 0.23572526783485814, 0.05695693014633174, 0.07581288812685875, 0.3831138094273132, 0.1662568359951487, 0.07985563526920189, 0.09658648968971328, 0.37471327849751673, 0.017826425894505393, 0.0634300511873685, 0.321676305253912, 0.34054950855323535, 0.47632516223647825, 0.08071541571311433, 0.42116422624923555, 0.20714974422564958, 0.004050902695084147, 0.06169081024310306, 0.0319512243722257, 0.18172382768931664, 0.3439729056537845, 0.1865602589592798, 0.3679667097010563, 0.2722859715758023, 0.5095280053718004, 0.0252950571025995, 0.11901240343677454, 0.3527441883309618, 0.018272168834360437, 0.29311496023813827, 0.040554904908037565, 0.07769679904945949, 0.19099922132843367, 0.026401961611571618, 0.04579034374382216, 0.23761698358107436, 0.09694045376946407, 0.14967660922835, 0.45957099067733165, 0.19629423825341366, 0.3793291354850235, 0.09796971960623738, 0.11135793963693373, 0.5407789558755499, 0.010964084471161232, 0.06144710371769568, 0.38879775927424404, 0.2253621000880969, 0.0029169830871987623, 0.3356632386359393, 0.06031086636262259, 0.19196185951236536, 0.42184666271798854, 0.06279905295468113, 0.11685660951952853, 0.39417411783101364, 0.21941655947208655, 0.1811678153551078, 0.002331939307528478, 0.21287129667469365, 0.05687639282759588, 0.21051185103855938, 0.4355744536054556, 0.2067518328351996, 0.3085565792676856, 0.12184223415340394, 0.0818220996336467, 0.4026399341522493, 0.1024406363412394, 0.13154167632911953, 0.04121418457145263, 0.015355691871910366, 0.32001831874701464, 0.41453732895889656, 0.039997551640774634, 0.2563313688925649, 0.11609650587900838, 0.055078195587196545, 0.03125928780129199, 0.5135542734718157, 0.010709586599001232, 0.23839348777409985, 0.4354557311063447, 0.010222460150605284, 0.06927534847049781, 0.18527659899077556, 0.04569937493745102, 0.09145070155367079, 0.0869655360507802, 0.01828474575352296, 0.04201552111464037, 0.07224519198494243, 0.0795272248882393, 0.05018082323414132, 0.3646815568638012, 0.05554903574200455, 0.42879527115075766, 0.4240282796726206, 0.17332878653991807, 0.010876299509580377, 0.12472331870792006, 0.2866570315027433, 0.10106869964616477, 0.006816010607795958, 0.004216459653954869, 0.2763274201249465, 0.09747900498040868, 0.045066531376728614, 0.19053168646856164, 0.03109184373547368, 0.00029916756862647417, 0.3526306579185156, 0.0331318747973344, 0.06061677031758531, 0.19769222968510144, 0.015657649945295896, 0.5313526458893365, 0.06257050427636973, 0.24547925788615688, 0.07173905616747324, 0.0764358592964699, 0.06409970685791891, 0.0646629153363422];
THREE.bubblesProperties.far.size = [0.3224372433820004, 0.035141871179640884, 0.303359480406884, 0.2083777257896961, -0.039727016565043495, -0.033665790148823684, -0.3012342953070624, -0.006306857843502747, 0.012012131679485847, 0.21695818780330078, -0.023847264565827385, -0.08402143623698537, -0.0187087329314345, 0.013610368634904215, 0.17244181028746638, -0.6689918247223969, 0.029635999145619145, 0.06182380730169375, 1.201986221087455, -0.07964509930215603, -0.013938981219627498, 0.4544033746994019, -0.006764806488452234, 0.3363767041754332, -0.19074346174314444, 0.4121769728665235, 0.0447114961657757, -0.27197826584609486, -0.08167844841132012, -0.042770664840106526, 0.1318521644321368, 0.38942570174589314, -0.02897273749868329, -0.200251446772339, -0.16871111628414787, -0.021586484507965274, -0.00002835420981822402, -0.31724095243609524, 0.5656441608152816, 0.0029365892257462523, 0.03851795868709112, 0.2046631081135697, 0.15816811346359977, -0.00006386990788903086, -0.009513679274411933, 0.4380622632650627, -0.7931147345160561, 0.004101653763206879, 1.0019731586591265, -0.1449615498300751, 0.003022033022222139, 0.040516680217775665, 0.06724851963506105, 0.34583766255445836, -0.6087819673726167, -1.2590873509391314, -0.3953038286236913, -0.013219051179543369, -0.2577860062374577, 0.40323670498505043, -0.05794831061810757, -0.11196531761597564, -0.05788605096060459, 0.45035869008497975, -1.174169774933277, -0.16363648767713412, -0.1458199005888314, 0.005033714520512491, 0.6561147338928888, -0.5154960059247262, -0.24322454332804647, -0.043755324787068374, 1.2777486174706767, -0.15973608522621807, -0.11778225558887827, 0.31100691253660473, 0.09153808397864861, 0.06990563177791986, 0.7365685591817397, -0.08772493921822853, -0.1537316476611012, 0.24769356755310737, -0.8843874196943129, 0.7113788930835199, 0.15179233733382153, -0.006638512777098308, -0.07801951765304492, -0.05005505407133541, -0.1438103998587914, -0.4980416253472681, 0.7830425594704842, 0.1188640642491395, 0.08170251502109165, -0.20499959934396508, 0.01793978551641462, 0.05163643721447643, -1.4527793361484482, 0.18078373268939435, -0.3208341767929123, 0.0043903187559504045, 0.1059779173132524, 0.0029615868741178293, 0.20507890390676684, -1.1789644458728636, 0.07691660485998777, 0.0063667380428042, -0.19049877888304198, 0.06446928688101504, 2.0580395765020483, -0.17119556223435997, -0.12272386188948986, 0.21832593848537332, 0.0016438991605473004, 0.2083511467097783, -0.7829822176518492, 0.00656177387375931, 0.025934147341453103, 0.08237830720006939, 1.2129832257696813, 0.48468365958339077, -0.006497644359289362, -0.002894017224878747, -0.007293717714928733, -0.03586191901891202, 0.22968052980875836, 0.5600268020078479, -0.0028664812050587514, 0.05337528773177718, 0.29164617158933487, 0.6040571129764901, -0.2144306578176347, 0.9631362892950587, -0.2745366884793346, -0.03242908283955907, 2.5661161602329687, -0.047964534025960244, 0.0004495286408618253, -0.2236418074212803, 0.05201745155495752, -0.0038531479644830957, 0.013670066573385426, -0.005297495754215674, 0.01785705781221405, -0.07947285217118052, -0.08128110373967727, -0.8642700964329624, -0.004112092029041916, 1.1964573628755006, 0.03660030023245258, -0.32194497337047817];
THREE.bubblesProperties.close.texture = [2, 7, 4, 3, 6, 7, 4, 7, 6, 5, 7, 0, 1, 7, 7, 1, 3, 6, 6, 6, 7, 3, 0, 7, 2, 6, 0, 5, 6, 4, 2, 6, 0, 4, 0, 4, 1, 0, 1, 4, 1, 2, 1, 7, 6, 3, 4, 1, 7, 4, 3, 0, 3, 7, 1, 7, 6, 0, 3, 0, 5, 2, 5, 7, 7, 0, 7, 1, 0, 7, 7, 0, 0, 1, 4, 7, 2, 7, 7, 1, 0, 1, 0, 0, 4, 5, 1, 5, 1, 2, 5, 0, 5, 6, 1, 7, 0, 7, 2, 2, 2, 5, 0, 4, 4, 1, 3, 0, 7, 2, 3, 3, 1, 4, 6, 6, 4, 4, 6, 1, 2, 6, 4, 3, 6, 6, 4, 5, 6, 6, 7, 3, 0, 6, 5, 6, 3, 7, 7, 7, 0, 5, 7, 4, 7, 1, 3, 4, 7, 6];
THREE.bubblesProperties.far.texture = [0, 1, 5, 3, 0, 5, 3, 1, 1, 1, 5, 4, 3, 1, 2, 1, 7, 3, 2, 7, 5, 4, 6, 0, 6, 3, 1, 0, 6, 7, 3, 2, 7, 0, 6, 2, 6, 2, 1, 4, 7, 0, 4, 0, 6, 1, 6, 6, 0, 2, 5, 1, 1, 2, 1, 4, 4, 5, 7, 6, 5, 7, 6, 4, 7, 0, 4, 4, 1, 5, 2, 7, 3, 5, 1, 1, 6, 5, 3, 5, 3, 1, 2, 2, 7, 7, 7, 4, 2, 2, 3, 6, 2, 1, 2, 0, 1, 2, 6, 3, 4, 6, 1, 1, 2, 4, 0, 1, 5, 5, 0, 2, 7, 1, 3, 7, 4, 2, 4, 2, 2, 6, 4, 0, 6, 1, 1, 0, 7, 5, 0, 5, 7, 0, 7, 0, 7, 4, 7, 2, 5, 7, 5, 4, 6, 4, 3, 1, 6, 4];