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
'use strict';

var scene, camera, renderer, $viewport, height, width, SEGMENTS;
var mX = 0;
var cameraMoveY = 0;
var currentIndex = 0;
var previousIndex = 0;
var orbImages = [];
THREE.bubbles = [];

SEGMENTS = [[0, 0, 40], [0, 75, 40]];

window.request;

setViewport($(document.body));
animate();

function setViewport($el) {
  $viewport = $el;

  width = $viewport.width();
  height = $viewport.height();

  init();
}

function init() {
  scene = new THREE.Scene();

  // renderer

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  $viewport.append(renderer.domElement);

  // camera

  camera = new THREE.PerspectiveCamera(50, width / height, 20, 75);
  camera.position.set(0, 0, 40);
  scene.add(camera);

  renderer.setClearColor(0, 1);

  // light

  // var light = new THREE.AmbientLight ( 0x404040 );
  // scene.add(light);

  jQuery(window).on('resize', resize);
  $viewport.on('mousemove', mouseMove);
  $viewport.on('DOMMouseScroll mousewheel', scroll);
  jQuery(document).on('keydown', keyDown);

  function mouseMove(event) {
    mX = event.clientX / window.innerWidth * 3 - 1;
  }

  function scroll(event) {
    event.originalEvent.wheelDelta >= 0 ? prev() : next();
  }

  function prev() {
    if (currentIndex === 0) {
      return;
    }
    animateCamera(currentIndex - 1);
  }

  function next() {
    if (currentIndex === SEGMENTS.length - 1) {
      return;
    }
    animateCamera(currentIndex + 1);
  }

  function animateCamera(index) {
    if (index > currentIndex) {
      TweenMax.to(camera.position, 2, {
        x: SEGMENTS[index][0],
        y: SEGMENTS[index][1],
        z: SEGMENTS[index][2]
      });
      currentIndex = index;
      var coords = SEGMENTS[currentIndex];
      var vector = new THREE.Vector3(coords[0], coords[1], coords[2]);
      camera.lookAt(vector);
    } else {
      TweenMax.to(camera.position, 2, {
        x: SEGMENTS[currentIndex - 1][0],
        y: SEGMENTS[currentIndex - 1][1],
        z: SEGMENTS[currentIndex - 1][2]
      });
      currentIndex = index;
      var coords = SEGMENTS[currentIndex];
      var vector = new THREE.Vector3(coords[0], coords[1], coords[2]);
      camera.lookAt(vector);
    }
  }

  function resize() {
    width = $viewport.width();
    height = $viewport.height();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  function keyDown(event) {
    // if (!isScrolling && isActive) {
    var keyCode = event.keyCode;

    if (keyCode === 40) {
      next();
    } else if (keyCode === 38) {
      prev();
    }
    // }
  }

  function checkCount(imagesLoaded, collection) {
    if (imagesLoaded === 6) {
      debugger;
      addSprites(75, collection);
    }
  }

  function addSprites(imagesLoaded, collection) {
    for (var i = 0; i < imagesLoaded; i++) {
      var radius = Math.random() * 2;
      var mat = new THREE.SpriteMaterial({
        map: collection[Math.floor(Math.random() * 6)],
        color: 16777215,
        fog: true
      });
      var width = mat.map.image.width;
      var height = mat.map.image.height;
      var bubble = new THREE.Sprite(mat);
      var x = Math.random() * 30 - 15;
      var y = Math.random() * 30 + 30;
      var z = Math.random() * 30 - 15;
      bubble.position.set(x, y, z);
      bubble.scale.set(width, height, 1);
      scene.add(bubble);
      THREE.bubbles.push(bubble);
    }
  }

  // segment 0
  addSegmentZero();

  function addSegmentZero() {
    var trianglesCount = 20;
    THREE.triangles = [];
    for (var i = 0; i < trianglesCount; i++) {
      var radius = Math.random() + 1;
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var material = new THREE.MeshDepthMaterial({});
      var pyramid = new THREE.Mesh(geometry, material);
      scene.add(pyramid);
      var x = Math.random() * 30 - 15;
      var y = Math.random() * 30 - 15;
      var z = Math.random() * 30 - 30;
      pyramid.position.set(x, y, z);
      pyramid.rotX = Math.random() * 0.1 - 0.05;
      pyramid.rotY = Math.random() * 0.1 - 0.05;
      pyramid.timing = Math.floor(Math.random() * 10);
      THREE.triangles.push(pyramid);
    }
    // scene.fog = THREE.Fog( 0x888888, 0.01 );
    // fog.position.set(0, 0, 0);
  }

  // segment 1
  addSegmentOne();

  function addSegmentOne() {
    var imagesLoaded = 0;
    var light = new THREE.PointLight(16777215, 1, 100);
    light.position.set(0, 50, 0);
    scene.add(light);

    THREE.ImageUtils.crossOrigin = '';
    var map1 = THREE.ImageUtils.loadTexture('./images/bluGrn1-64.png');
    var image = document.createElement('img');
    image.src = './images/bluGrn1-64.png';
    image.addEventListener('load', function (event) {
      map1.image = image;
      imagesLoaded++;
      orbImages.push(map1);
      checkCount(imagesLoaded, orbImages);
    });

    var map2 = THREE.ImageUtils.loadTexture('./images/bluGrn2-64.png');
    var image = document.createElement('img');
    image.src = './images/bluGrn2-64.png';
    image.addEventListener('load', function (event) {
      map2.image = image;
      imagesLoaded++;
      orbImages.push(map2);
      checkCount(imagesLoaded, orbImages);
    });

    var map3 = THREE.ImageUtils.loadTexture('./images/bluGrn3-64.png');
    var image = document.createElement('img');
    image.src = './images/bluGrn3-64.png';
    image.addEventListener('load', function (event) {
      map3.image = image;
      imagesLoaded++;
      orbImages.push(map3);
      checkCount(imagesLoaded, orbImages);
    });

    var map4 = THREE.ImageUtils.loadTexture('./images/bluGrn4-64.png');
    var image = document.createElement('img');
    image.src = './images/bluGrn4-64.png';
    image.addEventListener('load', function (event) {
      map4.image = image;
      imagesLoaded++;
      orbImages.push(map4);
      checkCount(imagesLoaded, orbImages);
    });

    var map5 = THREE.ImageUtils.loadTexture('./images/prpl1-64.png');
    var image = document.createElement('img');
    image.src = './images/prpl1-64.png';
    image.addEventListener('load', function (event) {
      map5.image = image;
      imagesLoaded++;
      orbImages.push(map5);
      checkCount(imagesLoaded, orbImages);
    });

    var map6 = THREE.ImageUtils.loadTexture('./images/prpl2-64.png');
    var image = document.createElement('img');
    image.src = './images/prpl2-64.png';
    image.addEventListener('load', function (event) {
      map6.image = image;
      imagesLoaded++;
      orbImages.push(map6);
      checkCount(imagesLoaded, orbImages);
    });

    var geometry = new THREE.SphereGeometry(5, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 8947848 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(0, 25, 0);
  }

  // controls

  THREE.controls = new THREE.OrbitControls(camera, renderer.domElement);
  THREE.controls.center.set(0, 0, 0);
  THREE.controls.userRotate = false;
  THREE.controls.userZoom = false;
}

function animate() {
  requestAnimationFrame(animate);

  for (var i = 0; i < THREE.triangles.length; i++) {
    if (Math.round(new Date().getTime() * 0.001) % THREE.triangles[i].timing == 0) {
      var rotX = Math.random() * 0.1 - 0.05;
      var rotY = Math.random() * 0.1 - 0.05;

      THREE.triangles[i].rotation.x += rotX;
      THREE.triangles[i].rotation.y -= rotY;
    } else {
      THREE.triangles[i].rotation.x += THREE.triangles[i].rotX;
      THREE.triangles[i].rotation.y -= THREE.triangles[i].rotY;
    }
  }

  var time = performance.now();

  for (var i = 0, l = THREE.bubbles.length; i < l; i++) {

    var object = THREE.bubbles[i];
    var scale = Math.sin((Math.floor(object.position.x * 133.33) + time) * 0.002) * 0.3 + 1;
    object.scale.set(scale, scale, scale);
  }

  camera.position.y += Math.cos(cameraMoveY) / 50;
  cameraMoveY += 0.02;

  camera.position.x += (mX * 5 - camera.position.x) * 0.03;
  renderer.render(scene, camera);
  THREE.controls.update();
}